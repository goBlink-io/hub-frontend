import type { AuditResponse } from '@/types/audit';

const STORAGE_KEY = 'goblink-audits';
const MAX_AUDITS = 20;

export interface SavedAudit {
  id: string;
  contractName: string;
  chain: string;
  tier: string;
  date: number;
  summary: {
    modules: number;
    verified: number;
    violated: number;
    testsPassed: number;
    testsFailed: number;
    scamFlags: number;
  };
  results: AuditResponse;
}

function getStorage(): SavedAudit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedAudit[];
  } catch {
    return [];
  }
}

function setStorage(audits: SavedAudit[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
  } catch {
    // Storage full or unavailable — best effort
  }
}

export function saveAudit(audit: SavedAudit): void {
  const audits = getStorage();
  // Remove duplicate if exists
  const filtered = audits.filter((a) => a.id !== audit.id);
  // Add to front
  filtered.unshift(audit);
  // Enforce FIFO limit
  const trimmed = filtered.slice(0, MAX_AUDITS);
  setStorage(trimmed);
}

export function loadAudits(): SavedAudit[] {
  return getStorage();
}

export function getAudit(id: string): SavedAudit | null {
  const audits = getStorage();
  return audits.find((a) => a.id === id) ?? null;
}

export function deleteAudit(id: string): void {
  const audits = getStorage();
  setStorage(audits.filter((a) => a.id !== id));
}

/** Build a SavedAudit from an AuditResponse */
export function buildSavedAudit(
  results: AuditResponse,
  tier: string,
): SavedAudit {
  const contractName = results.modules[0]?.name ?? 'Unknown Contract';
  const tr = results.testReport;

  return {
    id: results.id,
    contractName,
    chain: results.chain,
    tier,
    date: results.timestamp,
    summary: {
      modules: results.summary.totalModules,
      verified: results.summary.verified,
      violated: results.summary.violated,
      testsPassed: tr?.passed ?? 0,
      testsFailed: tr?.failed ?? 0,
      scamFlags: tr?.scamFlags.length ?? 0,
    },
    results,
  };
}

/** Generate a markdown report string */
export function generateReportMarkdown(audit: SavedAudit): string {
  const r = audit.results;
  const lines: string[] = [];

  lines.push('# goBlink Audit Report');
  lines.push(`**Contract:** ${audit.contractName}`);
  lines.push(`**Date:** ${new Date(audit.date).toISOString()}`);
  lines.push(`**Chain:** ${audit.chain}`);
  lines.push(`**Tier:** ${audit.tier}`);
  lines.push(`**Duration:** ${(r.durationMs / 1000).toFixed(1)}s`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Modules | ${audit.summary.modules} |`);
  lines.push(`| Verified | ${audit.summary.verified} |`);
  lines.push(`| Violated | ${audit.summary.violated} |`);
  lines.push(`| Tests Passed | ${audit.summary.testsPassed} |`);
  lines.push(`| Tests Failed | ${audit.summary.testsFailed} |`);
  lines.push(`| Scam Flags | ${audit.summary.scamFlags} |`);
  lines.push('');

  for (const mod of r.modules) {
    lines.push(`## Module: ${mod.name}`);
    for (const fn of mod.functions) {
      const status = fn.status === 'verified' ? '✅' : fn.status === 'violated' ? '❌' : '⚠️';
      lines.push(`- ${status} **${fn.name}**(${fn.params.join(', ')}) — ${fn.status}`);
    }
    lines.push('');
  }

  if (r.testReport) {
    const tr = r.testReport;
    lines.push('## Test Results');
    lines.push(`${tr.passed}/${tr.totalTests} passed (${(tr.duration / 1000).toFixed(1)}s)`);
    lines.push('');
    for (const test of tr.results) {
      const s = test.passed ? '✅' : '❌';
      lines.push(`- ${s} ${test.name} [${test.category}]`);
    }
    lines.push('');

    if (tr.scamFlags.length > 0) {
      lines.push('## ⚠️ Scam Warnings');
      for (const flag of tr.scamFlags) {
        lines.push(`- **${flag.name}** [${flag.severity}] — ${flag.confidence}% confidence`);
        lines.push(`  ${flag.description}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
