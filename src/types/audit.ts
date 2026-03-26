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
  /** Security score (0-100) */
  securityScore?: SecurityScore;
  /** Original source code for code viewer */
  sourceCode?: string;
  /** Line-level annotations for code viewer */
  annotations?: CodeAnnotation[];
  /** Contract similarity analysis */
  similarity?: SimilarityResult;
  /** Gas optimization insights */
  gasInsights?: GasInsight[];
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
  auditsPerformed?: number;
  auditsToday?: number;
}

// ─── Similarity Types ────────────────────────────────────────────────────────

export interface SimilarityResult {
  closestMatch: string;
  similarity: number;
  matchedFunctions: string[];
  extraFunctions: string[];
  missingFunctions: string[];
  standardSource: string;
}

// ─── Gas Insight Types ───────────────────────────────────────────────────────

export interface GasInsight {
  function: string;
  gasUsed: number;
  category: 'storage' | 'computation' | 'external-call' | 'loop' | 'memory';
  suggestion: string;
  estimatedSaving: string;
  severity: 'high' | 'medium' | 'low';
}

// ─── Security Score ──────────────────────────────────────────────────────────

export interface SecurityScoreBreakdown {
  verification: number;
  testCoverage: number;
  patternSafety: number;
  scamRisk: number;
}

export interface SecurityScore {
  overall: number;
  breakdown: SecurityScoreBreakdown;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

// ─── Remediation ─────────────────────────────────────────────────────────────

export interface Remediation {
  title: string;
  description: string;
  fixCode?: string;
  reference?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ─── Code Annotations ────────────────────────────────────────────────────────

export interface CodeAnnotation {
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  category: string;
  remediation?: string;
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
  remediation?: Remediation;
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

// ─── Re-audit / Resubmission Types ──────────────────────────────────────────

export interface AuditFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location?: string;
  recommendation?: string;
}

export interface FindingComparison {
  resolved: AuditFinding[];
  persistent: AuditFinding[];
  newlyIntroduced: AuditFinding[];
}

export interface ReauditComparison {
  originalAuditId: string;
  originalScore: number;
  originalGrade: string;
  currentScore: number;
  currentGrade: string;
  scoreDelta: number;
  findings: FindingComparison;
  summary: {
    totalResolved: number;
    totalPersistent: number;
    totalNew: number;
    overallImprovement: boolean;
  };
}

export interface ResubmitStatus {
  auditId: string;
  originalScore: number;
  originalGrade: string;
  resubmissionsRemaining: number;
  canResubmit: boolean;
  resubmitHistory: Array<{
    reauditId: string;
    timestamp: string;
    score: number;
    grade: string;
  }>;
}

// ─── Audit Tier Types ─────────────────────────────────────────────────────────

export type AuditTier = 'quick' | 'full' | 'deep';

export interface TierConfig {
  id: AuditTier;
  name: string;
  price: string;
  description: string;
  features: string[];
}

// Extend AuditResponse with resubmission fields
export interface AuditResponseWithResubmit extends AuditResponse {
  auditId: string;
  reauditToken?: string;
  resubmissionsRemaining?: number;
  reauditComparison?: ReauditComparison;
}
