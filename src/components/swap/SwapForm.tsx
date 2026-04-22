'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Token } from '@/lib/shared';
import { SUPPORTED_CHAINS } from '@/lib/chains';
import { useWallet } from '@goblink/connect/react';
import { useToast } from '@/contexts/ToastContext';
import { getTokenBalance } from '@/lib/balances';
import TokenSelector from '@/components/swap/TokenSelector';
import AddressBook from '@/components/swap/AddressBook';
import NoWalletCard from '@/components/swap/NoWalletCard';
import SmartTransactionNudge from '@/components/swap/SmartTransactionNudge';
import ChainSelector from '@/components/swap/ChainSelector';
import AmountInput from '@/components/swap/AmountInput';
import AddressInput from '@/components/swap/AddressInput';
import SwapCTA from '@/components/swap/SwapCTA';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSmartFirstTransaction } from '@/hooks/useSmartFirstTransaction';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';

export interface SwapFormInitialValues {
  toChain?: string;
  toToken?: string;   // symbol, e.g. 'SUI'
  recipient?: string;
  amount?: string;
  fromChain?: string;
  lockDest?: boolean; // when true, lock the TO chain/token/recipient fields
}

interface TokenMetadata {
  symbol: string;
  decimals: number;
  assetId: string;
  blockchain?: string;
  contractAddress?: string;
  icon?: string;
}

interface EnrichedQuote {
  quote?: Record<string, unknown>;
  quoteRequest?: Record<string, unknown>;
  feeInfo?: Record<string, unknown>;
  fromChain: string;
  toChain: string;
  originTokenMetadata: TokenMetadata;
  destinationTokenMetadata: TokenMetadata;
  [key: string]: unknown;
}

interface SwapFormProps {
  onQuoteReceived: (quote: EnrichedQuote) => void;
  refreshKey?: number;
  onSwapInitiated: (depositAddress: string) => void;
  initialValues?: SwapFormInitialValues;
}

import { filterTokens } from '@/lib/token-filters';

export default function SwapForm({ onQuoteReceived, refreshKey, initialValues }: SwapFormProps) {
  const { getAddress, wallets, isChainConnected, connect } = useWallet();
  const { toast } = useToast();
  const recipientRef = useRef<HTMLInputElement>(null);

  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [toBalances, setToBalances] = useState<Record<string, string>>({});
  const [loadingToBalances, setLoadingToBalances] = useState(false);
  
  const [fromChain, setFromChain] = useState<string>('near');
  const [toChain, setToChain] = useState<string>('near');

  // Track whether user has manually picked the FROM token (suppresses smart auto-select)
  const userSelectedFromToken = useRef(false);

  // Smart defaults — pre-fill from user's most common route
  const { getSuggestedRoute, isHydrated: defaultsHydrated } = useSmartDefaults();
  const [originAsset, setOriginAsset] = useState('');
  const [destinationAsset, setDestinationAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [refundTo, setRefundTo] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [quoteSlowWarning, setQuoteSlowWarning] = useState(false);

  const getChainIdFromType = (chainType: string | null): string => {
    const ct = (chainType || '').toLowerCase();
    switch (ct) {
      case 'near': return 'near';
      case 'evm': return 'ethereum';
      case 'solana': return 'solana';
      case 'sui': return 'sui';
      case 'aptos': return 'aptos';
      case 'starknet': return 'starknet';
      case 'ton': return 'ton';
      case 'tron': return 'tron';
      default: return 'near';
    }
  };

  // Auto-set from chain when first wallet connects
  useEffect(() => {
    if (wallets.length > 0) {
      const first = wallets[0];
      const chainId = getChainIdFromType(first.chain);
      setFromChain(chainId);
    }
  }, [wallets.length]);

  useEffect(() => {
    fetchTokens();
  }, []);

  // Apply smart defaults on mount — but only if no URL params override
  useEffect(() => {
    if (!defaultsHydrated) return;
    // Don't override if URL params present (payment request links)
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    if (params.has('from') || params.has('to') || params.has('fromChain') || params.has('toChain')) return;

    const suggested = getSuggestedRoute();
    if (!suggested) return;
    setFromChain(suggested.fromChain);
    setToChain(suggested.toChain);
  }, [defaultsHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTokens = async () => {
    setTokensLoading(true);
    try {
      // Fetch tokens immediately (fast — no pricing data)
      const tokensResponse = await fetch('/api/tokens');
      if (!tokensResponse.ok) throw new Error(`API responded with status ${tokensResponse.status}`);
      const tokensData = await tokensResponse.json();
      setTokens(filterTokens(tokensData));
      
      // Set defaults immediately
      if (tokensData.length > 0) {
        const near = tokensData.find((t: Token) => t.symbol === 'NEAR' && t.assetId.includes('wrap.near')) || tokensData.find((t: Token) => t.symbol === 'wNEAR');
        const usdc = tokensData.find((t: Token) => t.symbol === 'USDC' && t.assetId.includes('17208628'));
        if (near) setOriginAsset(near.assetId);
        if (usdc) setDestinationAsset(usdc.assetId);

        // Override with initialValues (payment request / embed pre-fill)
        if (initialValues) {
          if (initialValues.toChain) setToChain(initialValues.toChain);
          if (initialValues.fromChain) setFromChain(initialValues.fromChain);
          if (initialValues.recipient) setRecipient(initialValues.recipient);
          if (initialValues.amount) setAmount(initialValues.amount);
          if (initialValues.toToken) {
            const destChain = (initialValues.toChain || 'near').toLowerCase();
            const match = tokensData.find((t: Token) =>
              t.symbol.toUpperCase() === initialValues.toToken!.toUpperCase() &&
              (t.blockchain || 'near').toLowerCase() === destChain
            );
            if (match) setDestinationAsset(match.assetId);
          }
        }
      }
      
      setTokensLoading(false);
      
      // Fetch prices in parallel (fills in after)
      fetch('/api/tokens/prices')
        .then(async (pricesResponse) => {
          if (!pricesResponse.ok) return;
          const pricesData = await pricesResponse.json();
          
          // Merge prices into tokens
          const priceMap = new Map<string, string>(
            pricesData.map((p: { assetId: string; priceUsd?: string }) => [p.assetId, p.priceUsd || ''])
          );
          setTokens((prev) =>
            prev.map((token) => {
              const newPrice = priceMap.get(token.assetId);
              return {
                ...token,
                priceUsd: newPrice || token.priceUsd,
              };
            })
          );
        })
        .catch((err) => {
          console.warn('Failed to fetch prices:', err);
          // Non-critical — tokens still work without prices
        });
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      toast('Failed to load tokens. Please refresh.', 'error');
      setTokensLoading(false);
    }
  };

  const fromAddress = useCallback(() => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === fromChain);
    return chain ? getAddress(chain.type) : null;
  }, [fromChain, getAddress]);

  const toAddress = useCallback(() => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === toChain);
    return chain ? getAddress(chain.type) : null;
  }, [toChain, getAddress]);

  // Chains where user has a wallet connected (for NoWalletCard "switch chain" option)
  const connectedChainOptions = useMemo(() => {
    return SUPPORTED_CHAINS.filter(c => {
      if (c.id === toChain) return false; // Don't suggest current chain
      return isChainConnected(c.type);
    }).map(c => ({ id: c.id, name: c.name }));
  }, [toChain, isChainConnected]);

  const fromTokens = useMemo(() => {
    return tokens.filter(token => {
      const tokenChain = (token.blockchain || 'near').toLowerCase();
      return tokenChain === fromChain;
    });
  }, [tokens, fromChain]);

  // For the FROM selector: hide tokens with zero balance when wallet is connected and balances are ready.
  const displayFromTokens = useMemo(() => {
    const addr = fromAddress();
    if (!addr || loadingBalances || Object.keys(balances).length === 0) return fromTokens;
    const withBalance = fromTokens.filter(t => parseFloat(balances[t.assetId] || '0') > 0);
    return withBalance.length > 0 ? withBalance : fromTokens;
  }, [fromTokens, balances, loadingBalances]); // eslint-disable-line react-hooks/exhaustive-deps

  const toTokens = useMemo(() => {
    return tokens.filter(token => {
      const tokenChain = (token.blockchain || 'near').toLowerCase();
      return tokenChain === toChain;
    });
  }, [tokens, toChain]);

  // Smart First Transaction — contextual nudges for new/returning users
  const selectedFromToken = useMemo(() => fromTokens.find(t => t.assetId === originAsset), [fromTokens, originAsset]);
  const estimatedUsd = useMemo(() => {
    if (!amount || !selectedFromToken) return 0;
    const price = parseFloat(selectedFromToken.priceUsd || '') || selectedFromToken.price || 0;
    if (price <= 0) return 0;
    return parseFloat(amount) * price;
  }, [amount, selectedFromToken]);
  const { nudge, dismiss: dismissNudge } = useSmartFirstTransaction(
    fromChain,
    toChain,
    selectedFromToken?.symbol || '',
    estimatedUsd,
  );

  useEffect(() => {
    const addr = fromAddress();
    if (addr) setRefundTo(addr);
    else setRefundTo('');
  }, [fromChain, fromAddress]);

  useEffect(() => {
    // Don't auto-fill recipient when it's locked by a payment request
    if (initialValues?.lockDest && initialValues?.recipient) return;
    const addr = toAddress();
    if (addr) {
      setRecipient(addr);
    } else {
      const prevAddr = recipient;
      const isAutoPopulated = wallets.some(c => c.address === prevAddr);
      if (isAutoPopulated) setRecipient('');
    }
  }, [toChain, toAddress]);

  // Reset smart selection when from-chain changes so we re-evaluate for the new chain
  useEffect(() => {
    userSelectedFromToken.current = false;
  }, [fromChain]);

  useEffect(() => {
    const isOriginTokenValid = fromTokens.some(t => t.assetId === originAsset);
    if (!isOriginTokenValid && fromTokens.length > 0) setOriginAsset(fromTokens[0].assetId);
  }, [fromChain, fromTokens]);

  // Smart auto-select: after balances load, pick the token with the highest USD value
  useEffect(() => {
    if (userSelectedFromToken.current) return;
    if (loadingBalances || Object.keys(balances).length === 0) return;
    if (fromTokens.length === 0) return;

    let bestToken = fromTokens[0];
    let bestValue = -1;

    for (const token of fromTokens) {
      const bal = parseFloat(balances[token.assetId] || '0');
      if (bal <= 0) continue;
      const price = parseFloat(String(token.priceUsd || token.price || '0'));
      const value = bal * price;
      if (value > bestValue) {
        bestValue = value;
        bestToken = token;
      }
    }

    if (bestValue > 0) {
      setOriginAsset(bestToken.assetId);
    }
  }, [balances, loadingBalances]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const isDestTokenValid = toTokens.some(t => t.assetId === destinationAsset);
    if (!isDestTokenValid && toTokens.length > 0) setDestinationAsset(toTokens[0].assetId);
  }, [toChain, toTokens]);

  useEffect(() => {
    const fetchBalances = async () => {
      const address = fromAddress();
      if (!address || fromTokens.length === 0) { setBalances({}); return; }
      setLoadingBalances(true);
      const newBalances: Record<string, string> = {};
      await Promise.all(
        fromTokens.map(async (token) => {
          try {
            const balance = await getTokenBalance(address, {
              blockchain: token.blockchain,
              contractAddress: token.contractAddress,
              assetId: token.assetId,
              decimals: token.decimals,
              symbol: token.symbol,
            });
            newBalances[token.assetId] = balance;
          } catch {
            newBalances[token.assetId] = '0.00';
          }
        })
      );
      setBalances(newBalances);
      setLoadingBalances(false);
    };
    setBalances({});
    fetchBalances();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromChain, getAddress, fromTokens, refreshKey]);

  // Fetch destination chain balances
  useEffect(() => {
    const fetchToBalances = async () => {
      const address = toAddress();
      if (!address || toTokens.length === 0) { setToBalances({}); return; }
      setLoadingToBalances(true);
      const newBalances: Record<string, string> = {};
      await Promise.all(
        toTokens.map(async (token) => {
          try {
            const balance = await getTokenBalance(address, {
              blockchain: token.blockchain,
              contractAddress: token.contractAddress,
              assetId: token.assetId,
              decimals: token.decimals,
              symbol: token.symbol,
            });
            newBalances[token.assetId] = balance;
          } catch {
            newBalances[token.assetId] = '0.00';
          }
        })
      );
      setToBalances(newBalances);
      setLoadingToBalances(false);
    };
    setToBalances({});
    fetchToBalances();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toChain, getAddress, toTokens, refreshKey]);

  const convertToSmallestUnit = (amount: string, decimals: number): string => {
    amount = amount.trim();
    const parts = amount.split('.');
    const wholePart = parts[0] || '0';
    const decimalPart = parts[1] || '';
    const paddedDecimal = decimalPart.padEnd(decimals, '0').slice(0, decimals);
    const result = (wholePart + paddedDecimal).replace(/^0+/, '') || '0';
    return result;
  };

  const handleGetQuote = async () => {
    setFormError(null);
    if (!originAsset || !destinationAsset || !amount || !recipient || !refundTo) {
      setFormError('Please fill in all fields');
      return;
    }
    setLoading(true);
    const slowTimer = setTimeout(() => setQuoteSlowWarning(true), 8000);
    try {
      const originToken = fromTokens.find(t => t.assetId === originAsset) || tokens.find(t => t.assetId === originAsset);
      const destinationToken = toTokens.find(t => t.assetId === destinationAsset) || tokens.find(t => t.assetId === destinationAsset);
      if (!originToken) throw new Error('Origin token not found');
      if (!destinationToken) throw new Error('Destination token not found');

      const amountInSmallestUnit = convertToSmallestUnit(amount, originToken.decimals);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originAsset: (originToken as Token & { defuseAssetId?: string }).defuseAssetId || originAsset,
          destinationAsset: (destinationToken as Token & { defuseAssetId?: string }).defuseAssetId || destinationAsset,
          amount: amountInSmallestUnit,
          recipient,
          refundTo,
          dry: true,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Unable to get a quote right now. Please try again.');
      }
      const data = await response.json();
      const enrichedData = {
        ...data,
        fromChain,
        toChain,
        originTokenMetadata: {
          symbol: originToken.symbol,
          decimals: originToken.decimals,
          assetId: originToken.assetId,
          blockchain: originToken.blockchain,
          contractAddress: originToken.contractAddress,
          icon: originToken.icon,
        },
        destinationTokenMetadata: {
          symbol: destinationToken.symbol,
          decimals: destinationToken.decimals,
          assetId: destinationToken.assetId,
          blockchain: destinationToken.blockchain,
          contractAddress: destinationToken.contractAddress,
          icon: destinationToken.icon,
        },
      };
      toast('Quote ready — review and confirm below', 'success');
      onQuoteReceived(enrichedData);
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      let errorMessage = 'Unable to get a quote right now. Please try again.';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setFormError(errorMessage);
      toast(errorMessage, 'error');
    } finally {
      clearTimeout(slowTimer);
      setQuoteSlowWarning(false);
      setLoading(false);
    }
  };

  const swapTokens = () => {
    const tempChain = fromChain;
    setFromChain(toChain);
    setToChain(tempChain);
    const tempAsset = originAsset;
    setOriginAsset(destinationAsset);
    setDestinationAsset(tempAsset);
  };

  const formatAddress = (address: string | null) => {
    if (!address) return 'Not connected';
    if (address.length < 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Derived values for CTA
  const isDisabled = loading || !originAsset || !destinationAsset || !amount || !recipient || !refundTo;
  const disabledReason = !originAsset ? 'Select a token to send'
    : !destinationAsset ? 'Select a token to receive'
    : !amount ? 'Enter an amount'
    : !recipient ? 'Enter a receiving address'
    : !refundTo ? 'Connect wallet on sending chain'
    : null;
  const showTip = !!(originAsset && destinationAsset && amount && recipient && refundTo);

  if (tokensLoading) {
    return (
      <div className="card p-5 sm:p-6">
        <h2 className="text-h3 mb-5">Transfer</h2>
        <div className="space-y-4">
          <div><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-11 w-full mb-2" /><Skeleton className="h-12 w-full mb-2" /><Skeleton className="h-11 w-full" /></div>
          <div className="flex justify-center"><Skeleton className="h-10 w-10 rounded-full" /></div>
          <div><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-11 w-full mb-2" /><Skeleton className="h-12 w-full" /></div>
          <Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-h3">Transfer</h2>
      </div>

      {/* From Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="swap-from-chain" className="text-caption font-medium" style={{ color: 'var(--color-text-secondary)' }}>You send</label>
          <div className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
            {fromAddress() ? (
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                <span className="font-mono">{formatAddress(fromAddress())}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => connect()}
                className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-70 active:scale-95"
                style={{ color: 'var(--color-warning)' }}
              >
                Connect wallet
              </button>
            )}
          </div>
        </div>

        <ChainSelector value={fromChain} onChange={setFromChain} id="swap-from-chain" />

        <TokenSelector tokens={displayFromTokens} selectedToken={originAsset}
          onSelect={(assetId) => { userSelectedFromToken.current = true; setOriginAsset(assetId); }}
          balances={balances} loadingBalances={loadingBalances} label="Token" placeholder="Select a token..."
          emptyMessage={fromAddress() ? "No tokens with balance on this chain" : undefined} />

        <AmountInput
          value={amount}
          onChange={setAmount}
          token={selectedFromToken}
          balances={balances}
          onPercentClick={setAmount}
          id="swap-amount"
        />
      </div>

      {/* Flip — hidden when destination is locked */}
      {!initialValues?.lockDest && (
        <div className="flex justify-center -my-1 relative z-10">
          <button onClick={swapTokens}
            className="w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all active:scale-90 active:rotate-180"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}
            aria-label="Swap send and receive chains">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
      )}

      {/* To Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="swap-to-chain" className="text-caption font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {initialValues?.lockDest ? 'Recipient receives' : 'You receive'}
          </label>
          {!initialValues?.lockDest && (
            <div className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
              {toAddress() ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                  <span className="font-mono">{formatAddress(toAddress())}</span>
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-tertiary)' }}>No wallet</span>
              )}
            </div>
          )}
        </div>

        {initialValues?.lockDest ? (
          /* Locked destination display — read-only pill */
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-2"
            style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-body-sm font-semibold flex-shrink-0"
              style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
            >
              {SUPPORTED_CHAINS.find(c => c.id === toChain)?.name || toChain}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-bold text-body-sm" style={{ color: 'var(--color-text-primary)' }}>
                {toTokens.find(t => t.assetId === destinationAsset)?.symbol || initialValues?.toToken}
              </span>
            </div>
            <span
              className="text-tiny font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--color-primary)' }}
            >
              Locked
            </span>
          </div>
        ) : (
          <>
            <ChainSelector value={toChain} onChange={setToChain} id="swap-to-chain" />

            <TokenSelector tokens={toTokens} selectedToken={destinationAsset} onSelect={setDestinationAsset}
              balances={toBalances} loadingBalances={loadingToBalances} label="Token" placeholder="Select a token..." />

            {/* No wallet on destination chain — three-path card */}
            {!toAddress() && (
              <NoWalletCard
                chainId={toChain}
                chainName={SUPPORTED_CHAINS.find(c => c.id === toChain)?.name || toChain}
                connectedChains={connectedChainOptions}
                onEnterManually={() => {
                  setTimeout(() => {
                    recipientRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => recipientRef.current?.focus(), 300);
                  }, 100);
                }}
                onSwitchChain={(chainId) => setToChain(chainId)}
                onConnectWallet={() => connect()}
              />
            )}
          </>
        )}
      </div>

      {/* Receiving Address */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="swap-recipient" className="flex items-baseline gap-2 text-caption font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Receiving Address
            {!initialValues?.lockDest && !toAddress() && (
              <span className="text-tiny" style={{ color: 'var(--color-warning)' }}>(enter manually)</span>
            )}
          </label>
          {!initialValues?.lockDest && (
            <button
              type="button"
              onClick={() => setAddressBookOpen(true)}
              className="flex items-center gap-1 text-tiny font-semibold px-2 py-1 rounded-lg transition-all hover:opacity-80 active:scale-95"
              style={{ color: 'var(--color-primary)', background: 'var(--color-bg-tertiary)' }}
              title="Open address book"
            >
              Saved
            </button>
          )}
        </div>
        <AddressInput
          id="swap-recipient"
          value={recipient}
          onChange={setRecipient}
          placeholder={toAddress() ? "Auto-filled from wallet" : "Enter receiving address"}
          autoFilled={!!(toAddress() && recipient === toAddress())}
          chainName={toChain}
          locked={initialValues?.lockDest}
          inputRef={recipientRef}
        />
      </div>

      {/* Return Address */}
      <div className="mb-5">
        <label htmlFor="swap-refund" className="flex items-baseline gap-2 text-caption font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Return Address <span className="text-tiny" style={{ color: 'var(--color-text-tertiary)' }}>(auto)</span>
        </label>
        <AddressInput
          id="swap-refund"
          value={refundTo}
          onChange={setRefundTo}
          placeholder="Connect wallet on sending chain"
          readOnly
        />
        <p className="text-tiny mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Funds returned here if transfer can&apos;t complete
        </p>
      </div>

      {/* Smart Transaction Nudge */}
      {nudge && (
        <SmartTransactionNudge
          nudge={nudge}
          onDismiss={dismissNudge}
          onUseSuggestion={(suggestedAmount) => setAmount(suggestedAmount)}
        />
      )}

      {/* CTA */}
      <SwapCTA
        loading={loading}
        disabled={isDisabled}
        disabledReason={disabledReason}
        onSubmit={handleGetQuote}
        formError={formError}
        showTip={showTip}
        quoteSlowWarning={quoteSlowWarning}
      />

      {/* Address Book modal */}
      <AddressBook
        isOpen={addressBookOpen}
        onClose={() => setAddressBookOpen(false)}
        onSelect={(address, chain) => {
          setRecipient(address);
          // Switch toChain to match the saved address's chain
          const matchedChain = SUPPORTED_CHAINS.find(c => c.id === chain);
          if (matchedChain) setToChain(matchedChain.id);
        }}
      />
    </div>
  );
}
