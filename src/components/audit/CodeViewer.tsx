'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import type { CodeAnnotation } from '@/types/audit';

interface CodeViewerProps {
  sourceCode: string;
  language: 'solidity' | 'move' | 'rust';
  annotations: CodeAnnotation[];
}

// ─── Simple Syntax Highlighting ──────────────────────────────────────────────

const SOLIDITY_KEYWORDS = new Set([
  'pragma', 'solidity', 'import', 'contract', 'abstract', 'interface', 'library',
  'function', 'modifier', 'event', 'error', 'struct', 'enum', 'mapping',
  'public', 'private', 'internal', 'external', 'view', 'pure', 'payable',
  'virtual', 'override', 'returns', 'return', 'if', 'else', 'for', 'while',
  'do', 'require', 'revert', 'emit', 'new', 'delete', 'assembly',
  'memory', 'storage', 'calldata', 'immutable', 'constant',
  'uint256', 'uint128', 'uint64', 'uint32', 'uint16', 'uint8',
  'int256', 'int128', 'int64', 'int32', 'int16', 'int8',
  'address', 'bool', 'string', 'bytes', 'bytes32', 'bytes4',
  'true', 'false', 'msg', 'block', 'tx', 'this', 'type',
  'unchecked', 'constructor', 'receive', 'fallback',
]);

const MOVE_KEYWORDS = new Set([
  'module', 'struct', 'public', 'fun', 'entry', 'native', 'use', 'has',
  'key', 'store', 'drop', 'copy', 'let', 'mut', 'if', 'else', 'while',
  'loop', 'return', 'abort', 'acquires', 'move', 'const', 'friend',
  'true', 'false', 'address', 'vector', 'u8', 'u64', 'u128', 'u256', 'bool',
]);

const RUST_KEYWORDS = new Set([
  'fn', 'pub', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'impl',
  'trait', 'type', 'use', 'mod', 'crate', 'self', 'super', 'where',
  'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue', 'return',
  'async', 'await', 'move', 'unsafe', 'extern', 'ref',
  'true', 'false', 'u8', 'u16', 'u32', 'u64', 'u128', 'i8', 'i16', 'i32', 'i64',
  'i128', 'f32', 'f64', 'bool', 'String', 'Vec', 'Option', 'Result',
]);

function getKeywords(language: string): Set<string> {
  switch (language) {
    case 'move': return MOVE_KEYWORDS;
    case 'rust': return RUST_KEYWORDS;
    default: return SOLIDITY_KEYWORDS;
  }
}

interface Token {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'text';
  value: string;
}

function tokenizeLine(line: string, keywords: Set<string>): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Single-line comment
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }

    // String literal
    if (line[i] === '"') {
      let end = i + 1;
      while (end < line.length && line[end] !== '"') {
        if (line[end] === '\\') end++; // skip escaped char
        end++;
      }
      tokens.push({ type: 'string', value: line.slice(i, end + 1) });
      i = end + 1;
      continue;
    }

    // Number
    if (/\d/.test(line[i]) && (i === 0 || /[\s(,=+\-*/<>!&|^~]/.test(line[i - 1]))) {
      let end = i;
      while (end < line.length && /[\d_xXa-fA-Fe]/.test(line[end])) end++;
      tokens.push({ type: 'number', value: line.slice(i, end) });
      i = end;
      continue;
    }

    // Word (potential keyword)
    if (/[a-zA-Z_]/.test(line[i])) {
      let end = i;
      while (end < line.length && /[a-zA-Z0-9_]/.test(line[end])) end++;
      const word = line.slice(i, end);
      tokens.push({
        type: keywords.has(word) ? 'keyword' : 'text',
        value: word,
      });
      i = end;
      continue;
    }

    // Other character
    tokens.push({ type: 'text', value: line[i] });
    i++;
  }

  return tokens;
}

function getTokenColor(type: Token['type']): string {
  switch (type) {
    case 'keyword': return 'var(--color-primary)';
    case 'string': return 'var(--color-success)';
    case 'comment': return 'var(--color-text-muted)';
    case 'number': return 'var(--color-warning)';
    default: return 'var(--color-text-primary)';
  }
}

// ─── Severity Colors ─────────────────────────────────────────────────────────

function getSeverityBorderColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'var(--color-danger)';
    case 'high': return '#f97316';
    case 'medium': return 'var(--color-warning)';
    case 'low': return 'var(--color-info)';
    default: return 'var(--color-text-muted)';
  }
}

function getSeverityBgColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'rgba(239, 68, 68, 0.06)';
    case 'high': return 'rgba(249, 115, 22, 0.06)';
    case 'medium': return 'rgba(245, 158, 11, 0.06)';
    case 'low': return 'rgba(6, 182, 212, 0.06)';
    default: return 'var(--color-bg-tertiary)';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CodeViewer({ sourceCode, language, annotations }: CodeViewerProps) {
  const [expandedLine, setExpandedLine] = useState<number | null>(null);
  const keywords = useMemo(() => getKeywords(language), [language]);
  const lines = useMemo(() => sourceCode.split('\n'), [sourceCode]);

  // Build annotation lookup: line number → annotations
  const annotationMap = useMemo(() => {
    const map = new Map<number, CodeAnnotation[]>();
    for (const ann of annotations) {
      const existing = map.get(ann.line) ?? [];
      existing.push(ann);
      map.set(ann.line, existing);
    }
    return map;
  }, [annotations]);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '10px 16px',
          backgroundColor: 'var(--color-bg-tertiary)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Source Code · {language}
        </span>
        {annotations.length > 0 && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--color-danger)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
            }}
          >
            {annotations.length} finding{annotations.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Code area */}
      <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-mono), "JetBrains Mono", "Fira Code", monospace',
            fontSize: '12px',
            lineHeight: '1.6',
          }}
        >
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const lineAnnotations = annotationMap.get(lineNum);
              const hasAnnotation = !!lineAnnotations;
              const isExpanded = expandedLine === lineNum;
              const tokens = tokenizeLine(line, keywords);

              // Use highest severity for border color
              const highestSeverity = lineAnnotations?.[0]?.severity ?? 'info';

              return (
                <tr key={lineNum} style={{ verticalAlign: 'top' }}>
                  <td colSpan={3} style={{ padding: 0 }}>
                    {/* Code line */}
                    <div
                      onClick={hasAnnotation ? () => setExpandedLine(isExpanded ? null : lineNum) : undefined}
                      style={{
                        display: 'flex',
                        cursor: hasAnnotation ? 'pointer' : 'default',
                        borderLeft: hasAnnotation
                          ? `3px solid ${getSeverityBorderColor(highestSeverity)}`
                          : '3px solid transparent',
                        backgroundColor: hasAnnotation
                          ? getSeverityBgColor(highestSeverity)
                          : 'transparent',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {/* Line number */}
                      <span
                        style={{
                          display: 'inline-block',
                          width: '48px',
                          minWidth: '48px',
                          textAlign: 'right',
                          padding: '0 12px 0 8px',
                          color: hasAnnotation
                            ? getSeverityBorderColor(highestSeverity)
                            : 'var(--color-text-muted)',
                          userSelect: 'none',
                          fontWeight: hasAnnotation ? 600 : 400,
                        }}
                      >
                        {lineNum}
                      </span>

                      {/* Annotation indicator */}
                      <span
                        style={{
                          display: 'inline-block',
                          width: '16px',
                          minWidth: '16px',
                          textAlign: 'center',
                          color: getSeverityBorderColor(highestSeverity),
                        }}
                      >
                        {hasAnnotation ? (isExpanded ? '▾' : '▸') : ''}
                      </span>

                      {/* Code content */}
                      <span style={{ flex: 1, padding: '0 12px 0 4px', whiteSpace: 'pre' }}>
                        {tokens.map((token, ti) => (
                          <span key={ti} style={{ color: getTokenColor(token.type) }}>
                            {token.value}
                          </span>
                        ))}
                      </span>
                    </div>

                    {/* Expanded annotation panel */}
                    {isExpanded && lineAnnotations && (
                      <div
                        style={{
                          padding: '10px 16px 10px 68px',
                          backgroundColor: getSeverityBgColor(highestSeverity),
                          borderTop: `1px solid ${getSeverityBorderColor(highestSeverity)}20`,
                          borderBottom: `1px solid ${getSeverityBorderColor(highestSeverity)}20`,
                        }}
                      >
                        {lineAnnotations.map((ann, ai) => (
                          <div
                            key={ai}
                            style={{ marginBottom: ai < lineAnnotations.length - 1 ? '8px' : 0 }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  padding: '1px 5px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: getSeverityBorderColor(ann.severity),
                                  color: '#fff',
                                }}
                              >
                                {ann.severity}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 500,
                                  color: 'var(--color-text-muted)',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {ann.category}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: '12px',
                                lineHeight: '1.5',
                                color: 'var(--color-text-secondary)',
                                margin: 0,
                              }}
                            >
                              {ann.message}
                            </p>
                            {ann.remediation && (
                              <div
                                className="flex items-start gap-1.5"
                                style={{
                                  marginTop: '6px',
                                  fontSize: '11px',
                                  color: 'var(--color-success)',
                                }}
                              >
                                <Wrench size={11} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span>{ann.remediation}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
