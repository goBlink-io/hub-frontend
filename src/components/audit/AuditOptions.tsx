'use client';

import { Eye, Zap, Sparkles, ChevronDown } from 'lucide-react';
import type { AuditChain, AuditOptions as AuditOptionsType } from '@/types/audit';

const CHAINS: Array<{ id: AuditChain; label: string }> = [
  { id: 'auto', label: 'Auto-Detect' },
  { id: 'sui', label: 'Sui' },
  { id: 'aptos', label: 'Aptos' },
  { id: 'evm', label: 'EVM' },
  { id: 'solana', label: 'Solana' },
  { id: 'near', label: 'NEAR' },
];

interface AuditOptionsProps {
  options: AuditOptionsType;
  onChainChange: (chain: AuditChain) => void;
  onToggle: (key: 'irAnalysis' | 'patternMatching' | 'aiSpecs') => void;
}

function ToggleOption({
  label,
  icon,
  active,
  onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all"
      style={{
        backgroundColor: active ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-bg-tertiary)',
        color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${active ? 'rgba(59, 130, 246, 0.25)' : 'var(--color-border)'}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export function AuditOptionsBar({ options, onChainChange, onToggle }: AuditOptionsProps) {
  return (
    <div className="card p-4 sm:p-5 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Chain selector */}
        <div className="flex-1">
          <label
            htmlFor="audit-chain"
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Chain
          </label>
          <div className="relative">
            <select
              id="audit-chain"
              value={options.chain}
              onChange={(e) => onChainChange(e.target.value as AuditChain)}
              className="input w-full h-10 text-sm font-semibold pr-8 appearance-none"
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 flex-wrap">
          <ToggleOption
            label="IR Analysis"
            icon={<Eye size={14} />}
            active={options.irAnalysis}
            onToggle={() => onToggle('irAnalysis')}
          />
          <ToggleOption
            label="Pattern Matching"
            icon={<Zap size={14} />}
            active={options.patternMatching}
            onToggle={() => onToggle('patternMatching')}
          />
          <ToggleOption
            label="AI Specs"
            icon={<Sparkles size={14} />}
            active={options.aiSpecs}
            onToggle={() => onToggle('aiSpecs')}
          />
        </div>
      </div>
    </div>
  );
}
