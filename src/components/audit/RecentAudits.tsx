'use client';

import { useState } from 'react';
import {
  History,
  Trash2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Skull,
} from 'lucide-react';
import type { SavedAudit } from '@/lib/audit-storage';
import type { AuditResponse } from '@/types/audit';

interface RecentAuditsProps {
  audits: SavedAudit[];
  onSelect: (results: AuditResponse) => void;
  onDelete: (id: string) => void;
}

const CHAIN_LABELS: Record<string, string> = {
  evm: 'EVM',
  sui: 'Sui',
  aptos: 'Aptos',
  solana: 'Solana',
  near: 'NEAR',
  auto: 'Auto',
};

export function RecentAudits({ audits, onSelect, onDelete }: RecentAuditsProps) {
  if (audits.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History size={16} style={{ color: 'var(--color-text-muted)' }} />
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Recent Audits
        </span>
        <span
          className="text-xs px-1.5 py-0.5"
          style={{
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {audits.length}
        </span>
      </div>

      <div className="space-y-2">
        {audits.map((audit) => (
          <AuditRow
            key={audit.id}
            audit={audit}
            onSelect={() => onSelect(audit.results)}
            onDelete={() => onDelete(audit.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AuditRow({
  audit,
  onSelect,
  onDelete,
}: {
  audit: SavedAudit;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const date = new Date(audit.date);
  const timeStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="flex items-center gap-3 p-3 transition-colors group"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <button
        onClick={onSelect}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {audit.contractName}
            </span>
            <span
              className="text-[10px] font-medium uppercase px-1.5 py-0.5 shrink-0"
              style={{
                color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {CHAIN_LABELS[audit.chain] ?? audit.chain}
            </span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 shrink-0"
              style={{
                color: 'var(--color-primary)',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {audit.tier}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {timeStr}
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-success)' }}>
              <CheckCircle2 size={10} /> {audit.summary.verified}
            </span>
            {audit.summary.violated > 0 && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-danger)' }}>
                <XCircle size={10} /> {audit.summary.violated}
              </span>
            )}
            {audit.summary.testsPassed > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Tests: {audit.summary.testsPassed}/{audit.summary.testsPassed + audit.summary.testsFailed}
              </span>
            )}
            {audit.summary.scamFlags > 0 && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-danger)' }}>
                <Skull size={10} /> {audit.summary.scamFlags}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </button>

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { onDelete(); setConfirmDelete(false); }}
            className="text-[10px] font-medium px-2 py-1"
            style={{
              color: 'var(--color-danger)',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-[10px] font-medium px-2 py-1"
            style={{
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
