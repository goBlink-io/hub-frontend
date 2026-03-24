'use client';

import { useState } from 'react';
import { Wrench, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { Remediation } from '@/types/audit';

interface RemediationCardProps {
  remediation: Remediation;
}

function getDifficultyColor(difficulty: string): { bg: string; text: string; border: string } {
  switch (difficulty) {
    case 'easy':
      return {
        bg: 'rgba(16, 185, 129, 0.08)',
        text: 'var(--color-success)',
        border: 'rgba(16, 185, 129, 0.2)',
      };
    case 'medium':
      return {
        bg: 'rgba(245, 158, 11, 0.08)',
        text: 'var(--color-warning)',
        border: 'rgba(245, 158, 11, 0.2)',
      };
    case 'hard':
      return {
        bg: 'rgba(239, 68, 68, 0.08)',
        text: 'var(--color-danger)',
        border: 'rgba(239, 68, 68, 0.2)',
      };
    default:
      return {
        bg: 'var(--color-bg-tertiary)',
        text: 'var(--color-text-muted)',
        border: 'var(--color-border)',
      };
  }
}

export function RemediationCard({ remediation }: RemediationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const diffColors = getDifficultyColor(remediation.difficulty);

  return (
    <div
      style={{
        marginTop: '8px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
        style={{
          padding: '8px 12px',
          backgroundColor: expanded ? 'var(--color-bg-tertiary)' : 'transparent',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--color-primary)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Wrench size={12} />
        <span>How to Fix</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-primary)' }}>
          {/* Title + difficulty badge */}
          <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {remediation.title}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: diffColors.bg,
                color: diffColors.text,
                border: `1px solid ${diffColors.border}`,
                flexShrink: 0,
              }}
            >
              {remediation.difficulty}
            </span>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: '12px',
              lineHeight: '1.5',
              color: 'var(--color-text-secondary)',
              marginBottom: remediation.fixCode ? '10px' : '0',
            }}
          >
            {remediation.description}
          </p>

          {/* Code snippet */}
          {remediation.fixCode && (
            <pre
              style={{
                fontSize: '11px',
                lineHeight: '1.6',
                fontFamily: 'var(--font-mono), "JetBrains Mono", "Fira Code", monospace',
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                overflowX: 'auto',
                color: 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {remediation.fixCode}
            </pre>
          )}

          {/* Reference link */}
          {remediation.reference && (
            <a
              href={remediation.reference}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
              style={{
                marginTop: '8px',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--color-primary)',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={11} />
              Reference Documentation
            </a>
          )}
        </div>
      )}
    </div>
  );
}
