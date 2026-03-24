'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ChainBadge } from './ChainBadge';
import { FunctionSpec } from './FunctionSpec';
import type { ModuleResult } from '@/types/audit';

interface ModuleCardProps {
  module: ModuleResult;
  defaultOpen?: boolean;
}

export function ModuleCard({ module, defaultOpen = false }: ModuleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header — clickable */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left transition-colors"
        style={{ backgroundColor: open ? 'var(--color-bg-tertiary)' : 'transparent' }}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {open ? (
            <ChevronDown size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          ) : (
            <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          )}
          <span
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {module.name}
          </span>
          <ChainBadge chain={module.chain} />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {module.functions.length} fn · {module.stateVars.length} vars
          </span>
          <StatusBadge status={module.status} />
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="p-4 pt-0 space-y-2">
          {/* State vars */}
          {module.stateVars.length > 0 && (
            <div className="mb-3">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                State Variables
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {module.stateVars.map((v) => (
                  <span
                    key={v.name}
                    className="text-xs font-mono px-2 py-0.5"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {v.name}: {v.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Functions */}
          <div className="space-y-2">
            {module.functions.map((fn) => (
              <FunctionSpec key={fn.name} fn={fn} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
