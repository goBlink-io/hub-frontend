'use client';

import { Shield, CheckCircle2, FlaskConical, Search, AlertTriangle } from 'lucide-react';
import type { SecurityScore as SecurityScoreType } from '@/types/audit';

interface SecurityScoreProps {
  score: SecurityScoreType;
}

function getScoreColor(grade: string): string {
  switch (grade) {
    case 'A':
    case 'B':
      return 'var(--color-success)';
    case 'C':
      return 'var(--color-warning)';
    case 'D':
      return '#f97316'; // orange
    default:
      return 'var(--color-danger)';
  }
}

function getRiskBgColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'Low':
      return 'rgba(16, 185, 129, 0.08)';
    case 'Medium':
      return 'rgba(245, 158, 11, 0.08)';
    case 'High':
      return 'rgba(249, 115, 22, 0.08)';
    default:
      return 'rgba(239, 68, 68, 0.08)';
  }
}

function getRiskBorderColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'Low':
      return 'rgba(16, 185, 129, 0.2)';
    case 'Medium':
      return 'rgba(245, 158, 11, 0.2)';
    case 'High':
      return 'rgba(249, 115, 22, 0.2)';
    default:
      return 'rgba(239, 68, 68, 0.2)';
  }
}

const BREAKDOWN_ITEMS = [
  { key: 'verification' as const, label: 'Verification', icon: CheckCircle2, max: 25 },
  { key: 'testCoverage' as const, label: 'Test Coverage', icon: FlaskConical, max: 25 },
  { key: 'patternSafety' as const, label: 'Pattern Safety', icon: Search, max: 25 },
  { key: 'scamRisk' as const, label: 'Scam Risk', icon: AlertTriangle, max: 25 },
];

export function SecurityScore({ score }: SecurityScoreProps) {
  const color = getScoreColor(score.grade);
  const circumference = 2 * Math.PI * 54; // radius = 54
  const dashOffset = circumference - (score.overall / 100) * circumference;

  return (
    <div
      className="animate-fade-up"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
      }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Circular gauge */}
        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            {/* Background ring */}
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              stroke="var(--color-bg-tertiary)"
              strokeWidth="10"
            />
            {/* Score ring */}
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          {/* Grade letter */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: '36px',
                fontWeight: 800,
                color,
                lineHeight: 1,
              }}
            >
              {score.grade}
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginTop: '2px',
              }}
            >
              {score.overall}/100
            </span>
          </div>
        </div>

        {/* Right side: risk level + breakdown */}
        <div style={{ flex: 1, width: '100%' }}>
          {/* Risk level badge */}
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} style={{ color }} />
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              Security Score
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: getRiskBgColor(score.riskLevel),
                border: `1px solid ${getRiskBorderColor(score.riskLevel)}`,
                color,
              }}
            >
              {score.riskLevel} Risk
            </span>
          </div>

          {/* Breakdown bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {BREAKDOWN_ITEMS.map(({ key, label, icon: Icon, max }) => {
              const value = score.breakdown[key];
              const pct = (value / max) * 100;
              const barColor =
                pct >= 80 ? 'var(--color-success)' :
                pct >= 60 ? 'var(--color-warning)' :
                pct >= 40 ? '#f97316' :
                'var(--color-danger)';

              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon size={12} style={{ color: 'var(--color-text-muted)' }} />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {label}
                      </span>
                    </div>
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {value}/{max}
                    </span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: barColor,
                        borderRadius: '3px',
                        transition: 'width 0.8s ease-out',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
