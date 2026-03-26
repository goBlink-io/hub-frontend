'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield } from 'lucide-react';

const AUDIT_PHASES = [
  { name: 'Detecting chain & language', pct: 10 },
  { name: 'Building intermediate representation', pct: 25 },
  { name: 'Pattern matching (105 patterns)', pct: 40 },
  { name: 'Running formal verification', pct: 55 },
  { name: 'Generating test cases', pct: 70 },
  { name: 'Analyzing dependencies', pct: 80 },
  { name: 'Computing security score', pct: 90 },
] as const;

interface AuditProgressProps {
  loading: boolean;
  error: string | null;
  onRun: () => void;
  disabled: boolean;
  notifyEmail?: string;
  tierName: string;
}

export function AuditProgress({
  loading,
  error,
  onRun,
  disabled,
  notifyEmail,
  tierName,
}: AuditProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);

  // Manage progress phases internally
  useEffect(() => {
    if (!loading) {
      // When loading stops, jump to 100% briefly then reset
      if (progress > 0) {
        setProgress(100);
        setCurrentPhase('Complete');
        const resetTimer = setTimeout(() => {
          setProgress(0);
          setCurrentPhase(null);
        }, 500);
        return () => clearTimeout(resetTimer);
      }
      return;
    }

    // Reset on new loading cycle
    setProgress(0);
    setCurrentPhase('Initializing audit...');

    let phaseIdx = 0;
    const interval = setInterval(() => {
      if (phaseIdx < AUDIT_PHASES.length) {
        setCurrentPhase(AUDIT_PHASES[phaseIdx].name);
        setProgress(AUDIT_PHASES[phaseIdx].pct);
        phaseIdx++;
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: 'var(--color-primary)' }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {currentPhase || 'Initializing audit...'}
          </p>
          <div
            className="w-full h-2 overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--color-primary)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          </div>
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {Math.round(progress)}%
          </span>
        </div>
      ) : (
        <>
          <button
            onClick={onRun}
            disabled={disabled}
            className="btn btn-primary w-full h-12 text-sm gap-2"
          >
            <Shield size={16} />
            Run Audit
          </button>
          {notifyEmail && tierName === 'Deep Audit' && (
            <p
              className="text-xs text-center"
              style={{ color: 'var(--color-text-muted)' }}
            >
              We&apos;ll email your results to {notifyEmail}
            </p>
          )}
        </>
      )}

      {error && (
        <div
          className="p-3 text-sm"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
