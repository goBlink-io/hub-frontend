/** Zion Prover audit types */

export type VerificationStatus = 'verified' | 'violated' | 'unknown' | 'no-spec';

export type AuditChain = 'auto' | 'sui' | 'aptos' | 'evm' | 'solana' | 'near';

export interface SpecCondition {
  /** e.g. "amount > 0" */
  expression: string;
  /** Human-readable description */
  description?: string;
}

export interface FunctionResult {
  name: string;
  params: string[];
  requires: SpecCondition[];
  ensures: SpecCondition[];
  status: VerificationStatus;
  /** Optional violation detail */
  counterexample?: string;
}

export interface StateVariable {
  name: string;
  type: string;
}

export interface CrossModuleWarning {
  severity: 'high' | 'medium' | 'low';
  message: string;
  modules: string[];
}

export interface ModuleResult {
  name: string;
  chain: string;
  stateVars: StateVariable[];
  functions: FunctionResult[];
  /** Overall module status derived from function statuses */
  status: VerificationStatus;
}

export interface AuditSummary {
  totalModules: number;
  totalSpecs: number;
  verified: number;
  violated: number;
  unknown: number;
}

export interface AuditResponse {
  id: string;
  timestamp: number;
  chain: string;
  summary: AuditSummary;
  modules: ModuleResult[];
  crossModuleWarnings: CrossModuleWarning[];
  /** Duration in milliseconds */
  durationMs: number;
  /** Test report from Zion test engine */
  testReport?: TestReport;
}

export interface AuditOptions {
  chain: AuditChain;
  irAnalysis: boolean;
  patternMatching: boolean;
  aiSpecs: boolean;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  chains: string[];
}

export interface Exploit {
  id: string;
  name: string;
  date: string;
  chain: string;
  category: string;
  amountUsd: number;
  description: string;
  /** Link to post-mortem or source */
  reference?: string;
}

export interface AuditStats {
  patterns: number;
  exploits: number;
  chains: number;
  totalLossesUsd: string;
}

// ─── Test Report Types ───────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  passed: boolean;
  gasUsed?: number;
  error?: string;
  category: string;
  severity: string;
  description: string;
}

export interface ScamFlag {
  patternId: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  matchedCode: string;
  lineNumber?: number;
  redFlags: string[];
  confidence: number;
}

export interface TestReport {
  contractName: string;
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
  matchedPatterns: number;
  scamFlags: ScamFlag[];
  patternCoverage: {
    exploit: number;
    scam: number;
    nonEvm: number;
  };
  duration: number;
}
