'use client';

import { CheckCircle2, XCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import type { VerificationStatus } from '@/types/audit';

interface StatusBadgeProps {
  status: VerificationStatus;
}

const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }
> = {
  verified: {
    label: 'Verified',
    color: 'var(--color-success)',
    bg: 'rgba(16, 185, 129, 0.12)',
    Icon: CheckCircle2,
  },
  violated: {
    label: 'Violated',
    color: 'var(--color-danger)',
    bg: 'rgba(239, 68, 68, 0.12)',
    Icon: XCircle,
  },
  unknown: {
    label: 'Unknown',
    color: 'var(--color-warning)',
    bg: 'rgba(245, 158, 11, 0.12)',
    Icon: AlertTriangle,
  },
  'no-spec': {
    label: 'No Spec',
    color: 'var(--color-text-muted)',
    bg: 'rgba(74, 75, 101, 0.12)',
    Icon: MinusCircle,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, color, bg, Icon } = STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold"
      style={{
        color,
        backgroundColor: bg,
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}
