'use client';

import { SUPPORTED_CHAINS } from '@/lib/chains';

interface ChainSelectorProps {
  value: string;
  onChange: (chainId: string) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export default function ChainSelector({ value, onChange, disabled, id }: ChainSelectorProps) {
  return (
    <div className="mb-2">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full h-11 text-body-sm font-semibold"
        disabled={disabled}
      >
        {SUPPORTED_CHAINS.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
    </div>
  );
}
