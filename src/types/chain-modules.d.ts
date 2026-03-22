// Type stubs for chain-specific packages that are dynamically imported.
// These are only loaded at runtime when the respective chain is used.
// Install the actual packages when you need to support that chain.

declare module 'ethers' {
  export class Contract {
    constructor(address: string, abi: unknown[], signer: unknown);
    transfer(to: string, amount: string): Promise<{ wait(): Promise<void>; hash: string }>;
  }
  export const ethers: {
    Contract: typeof Contract;
  };
}

declare module '@solana/web3.js' {
  export class PublicKey {
    constructor(key: string | Uint8Array);
    toString(): string;
  }
  export class Transaction {
    constructor(opts?: { recentBlockhash?: string; feePayer?: PublicKey });
    add(...items: unknown[]): Transaction;
    feePayer: PublicKey;
    recentBlockhash: string;
    serialize(): Buffer;
  }
  export const SystemProgram: {
    transfer(params: { fromPubkey: PublicKey; toPubkey: PublicKey; lamports: bigint }): unknown;
  };
}

declare module '@solana/spl-token' {
  export function getAssociatedTokenAddress(mint: unknown, owner: unknown): Promise<unknown>;
  export function createTransferInstruction(from: unknown, to: unknown, owner: unknown, amount: bigint): unknown;
}

declare module 'starknet' {
  export const uint256: { bnToUint256(n: string): unknown };
  export const CallData: { compile(data: unknown): unknown };
}

declare module '@ton/core' {
  interface CellBuilder {
    storeUint(value: number, bits: number): CellBuilder;
    storeCoins(value: bigint): CellBuilder;
    storeAddress(address: unknown): CellBuilder;
    storeBit(bit: boolean): CellBuilder;
    endCell(): { toBoc(): { toString(encoding: string): string } };
  }
  export function beginCell(): CellBuilder;
  export class Address { static parse(addr: string): unknown; }
  export function toNano(amount: string): bigint;
}
