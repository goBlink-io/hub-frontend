'use client';

import { StatusBadge } from './StatusBadge';
import type { FunctionResult } from '@/types/audit';

interface FunctionSpecProps {
  fn: FunctionResult;
}

export function FunctionSpec({ fn }: FunctionSpecProps) {
  return (
    <div
      className="p-3"
      style={{
        backgroundColor: 'var(--color-bg-primary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <code
            className="text-sm font-semibold font-mono truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {fn.name}
          </code>
          <span
            className="text-xs shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ({fn.params.join(', ')})
          </span>
        </div>
        <StatusBadge status={fn.status} />
      </div>

      {/* Requires */}
      {fn.requires.length > 0 && (
        <div className="mb-1.5">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            requires
          </span>
          <ul className="mt-0.5 space-y-0.5">
            {fn.requires.map((r, i) => (
              <li
                key={i}
                className="text-xs font-mono pl-3"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                • {r.expression}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ensures */}
      {fn.ensures.length > 0 && (
        <div>
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            ensures
          </span>
          <ul className="mt-0.5 space-y-0.5">
            {fn.ensures.map((e, i) => (
              <li
                key={i}
                className="text-xs font-mono pl-3"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                • {e.expression}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Counterexample */}
      {fn.counterexample && (
        <div
          className="mt-2 p-2 text-xs font-mono"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-danger)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
          }}
        >
          ⚠ Counterexample: {fn.counterexample}
        </div>
      )}
    </div>
  );
}
