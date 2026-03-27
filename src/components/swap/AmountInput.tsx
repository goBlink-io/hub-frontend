'use client';

import { Token } from '@/lib/shared';

// Gas reserves for native tokens (kept in sync with the original logic)
const NATIVE_SYMBOLS = ['NEAR', 'SUI', 'SOL', 'ETH', 'BNB', 'MATIC', 'BERA', 'MON', 'APT', 'STRK', 'TON', 'TRX'] as const;
const GAS_RESERVES: Record<string, number> = {
  NEAR: 0.1, SUI: 0.01, SOL: 0.001, ETH: 0.01, BNB: 0.002,
  MATIC: 0.1, BERA: 0.01, MON: 0.01, APT: 0.01, STRK: 0.01, TON: 0.05, TRX: 5,
};

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  balance?: string;
  token?: Token;
  balances: Record<string, string>;
  onPercentClick: (amount: string) => void;
  id?: string;
}

export default function AmountInput({ value, onChange, token, balances, onPercentClick, id }: AmountInputProps) {
  const assetBalance = token ? parseFloat(balances[token.assetId] || '0') : 0;
  const showPercentButtons = token && assetBalance > 0;

  const handlePercentClick = (pct: number) => {
    if (!token) return;
    const bal = parseFloat(balances[token.assetId] || '0');
    let amt = bal * (pct / 100);

    if (pct === 100 && (NATIVE_SYMBOLS as readonly string[]).includes(token.symbol)) {
      const reserve = GAS_RESERVES[token.symbol] || 0;
      amt = bal > reserve ? bal - reserve : bal;
    }

    const formatted = amt.toFixed(6).replace(/\.?0+$/, '');
    onPercentClick(formatted);
  };

  return (
    <div>
      <input
        id={id}
        aria-label="Amount"
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v);
        }}
        placeholder="0.0"
        className="input w-full h-12 text-h4 mb-2"
      />

      {showPercentButtons && (
        <div className="flex gap-1.5">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercentClick(pct)}
              className="flex-1 h-11 text-tiny font-semibold rounded-lg transition-all active:scale-95"
              style={{
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {pct}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
