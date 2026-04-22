/**
 * Lightweight wallet balance checker for the paywall.
 *
 * For each chain + token type combination we either:
 *   (a) call viem / @mysten/sui / near-api-js directly with the hub's
 *       configured RPC, or
 *   (b) fall back to a public RPC defaulted in code.
 *
 * The function is deliberately coarse: "does address hold at least N
 * units of this token?" Returns boolean — not balance amounts — so
 * callers don't accidentally leak holdings to the client.
 */

import { createPublicClient, http, parseUnits } from "viem";
import {
  arbitrum,
  aurora,
  avalanche,
  base,
  berachain,
  bsc,
  gnosis,
  mainnet,
  optimism,
  polygon,
} from "viem/chains";
import type { Chain } from "viem";

const EVM_CHAINS: Record<string, { chain: Chain; rpcUrl: string }> = {
  ethereum: {
    chain: mainnet,
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
  },
  base: {
    chain: base,
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  },
  arbitrum: {
    chain: arbitrum,
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
  },
  bsc: {
    chain: bsc,
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org",
  },
  polygon: {
    chain: polygon,
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
  },
  optimism: {
    chain: optimism,
    rpcUrl: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  },
  avalanche: {
    chain: avalanche,
    rpcUrl:
      process.env.AVALANCHE_RPC_URL ||
      "https://api.avax.network/ext/bc/C/rpc",
  },
  gnosis: {
    chain: gnosis,
    rpcUrl: process.env.GNOSIS_RPC_URL || "https://rpc.gnosischain.com",
  },
  berachain: {
    chain: berachain,
    rpcUrl: process.env.BERACHAIN_RPC_URL || "https://rpc.berachain.com",
  },
  aurora: {
    chain: aurora,
    rpcUrl: process.env.AURORA_RPC_URL || "https://mainnet.aurora.dev",
  },
};

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

const ERC721_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const ERC1155_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface HoldsInput {
  chain: string;
  address: string;
  tokenType: string;
  contractAddress: string;
  minAmount: string;
  tokenId: string | null;
}

/** Resolves EVM chain key — supports evm.<named> shorthand or a bare named chain. */
function resolveEvmChainKey(chain: string, contract: string): string | null {
  // Our rules store chain='evm' + contract_address that prefixes with
  // chain name optionally. Default to ethereum mainnet if no hint.
  if (chain !== "evm") return null;
  // contract like "base:0x..." or bare "0x..." — support prefix.
  const colonIdx = contract.indexOf(":");
  if (colonIdx !== -1) {
    const maybe = contract.slice(0, colonIdx).toLowerCase();
    if (EVM_CHAINS[maybe]) return maybe;
  }
  return "ethereum";
}

function stripChainPrefix(contract: string): `0x${string}` {
  const colonIdx = contract.indexOf(":");
  const raw = colonIdx === -1 ? contract : contract.slice(colonIdx + 1);
  return raw as `0x${string}`;
}

export async function checkWalletHolds(input: HoldsInput): Promise<boolean> {
  const { chain, address, tokenType, contractAddress, minAmount, tokenId } =
    input;

  if (chain === "evm") {
    const evmKey = resolveEvmChainKey(chain, contractAddress);
    if (!evmKey) return false;
    const cfg = EVM_CHAINS[evmKey];
    const client = createPublicClient({
      chain: cfg.chain,
      transport: http(cfg.rpcUrl),
    });
    const addr = address as `0x${string}`;
    const contract = stripChainPrefix(contractAddress);

    if (tokenType === "native") {
      const bal = await client.getBalance({ address: addr });
      const need = parseUnits(minAmount, 18);
      return bal >= need;
    }
    if (tokenType === "erc20") {
      const [bal, decimals] = await Promise.all([
        client.readContract({
          address: contract,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [addr],
        }),
        client
          .readContract({
            address: contract,
            abi: ERC20_ABI,
            functionName: "decimals",
          })
          .catch(() => 18),
      ]);
      const need = parseUnits(minAmount, Number(decimals));
      return (bal as bigint) >= need;
    }
    if (tokenType === "erc721") {
      if (tokenId) {
        // Specific token ID — must be owned by address.
        const owner = (await client.readContract({
          address: contract,
          abi: ERC721_ABI,
          functionName: "ownerOf",
          args: [BigInt(tokenId)],
        })) as `0x${string}`;
        return owner.toLowerCase() === addr.toLowerCase();
      }
      const bal = (await client.readContract({
        address: contract,
        abi: ERC721_ABI,
        functionName: "balanceOf",
        args: [addr],
      })) as bigint;
      return bal >= BigInt(minAmount);
    }
    if (tokenType === "erc1155") {
      if (!tokenId) return false;
      const bal = (await client.readContract({
        address: contract,
        abi: ERC1155_ABI,
        functionName: "balanceOf",
        args: [addr, BigInt(tokenId)],
      })) as bigint;
      return bal >= BigInt(minAmount);
    }
    return false;
  }

  if (chain === "solana") {
    // Native SOL or SPL balance via JSON-RPC — simple fetch to avoid
    // pulling @solana/web3.js into the server bundle just for one RPC call.
    if (tokenType === "native") {
      const rpc =
        process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBalance",
          params: [address],
        }),
      });
      const json = (await res.json()) as { result?: { value?: number } };
      const lamports = BigInt(json.result?.value ?? 0);
      const need = parseUnits(minAmount, 9);
      return lamports >= need;
    }
    if (tokenType === "spl") {
      const rpc =
        process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            address,
            { mint: contractAddress },
            { encoding: "jsonParsed" },
          ],
        }),
      });
      const json = (await res.json()) as {
        result?: {
          value?: Array<{
            account?: {
              data?: {
                parsed?: {
                  info?: {
                    tokenAmount?: { amount?: string; decimals?: number };
                  };
                };
              };
            };
          }>;
        };
      };
      let total = 0n;
      let decimals = 0;
      for (const acc of json.result?.value ?? []) {
        const amt = acc.account?.data?.parsed?.info?.tokenAmount?.amount;
        const d = acc.account?.data?.parsed?.info?.tokenAmount?.decimals;
        if (amt) total += BigInt(amt);
        if (typeof d === "number") decimals = d;
      }
      const need = parseUnits(minAmount, decimals);
      return total >= need;
    }
    return false;
  }

  if (chain === "sui") {
    if (tokenType === "native") {
      const rpc = process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io";
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getBalance",
          params: [address, "0x2::sui::SUI"],
        }),
      });
      const json = (await res.json()) as {
        result?: { totalBalance?: string };
      };
      const bal = BigInt(json.result?.totalBalance ?? "0");
      const need = parseUnits(minAmount, 9);
      return bal >= need;
    }
    // Coin type gate: use the configured contract_address as the coin type
    // (e.g. "0x...::usdc::USDC"). decimals passed via tokenId encoding not
    // supported in v1 — assume same-decimals as minAmount.
    if (tokenType === "nft" || tokenType === "erc721") {
      const rpc = process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io";
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getOwnedObjects",
          params: [address, { filter: { StructType: contractAddress } }],
        }),
      });
      const json = (await res.json()) as { result?: { data?: unknown[] } };
      return (json.result?.data?.length ?? 0) >= Number(minAmount || "1");
    }
    return false;
  }

  if (chain === "near") {
    // Native NEAR via JSON-RPC query.
    if (tokenType === "native") {
      const rpc = process.env.NEAR_RPC_URL || "https://rpc.fastnear.com";
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "query",
          params: {
            request_type: "view_account",
            finality: "final",
            account_id: address,
          },
        }),
      });
      const json = (await res.json()) as { result?: { amount?: string } };
      const bal = BigInt(json.result?.amount ?? "0");
      const need = parseUnits(minAmount, 24);
      return bal >= need;
    }
    return false;
  }

  return false;
}

