/**
 * Types for the zion-prover audit API.
 * Mirrors the prover's AuditResponse contract. Keep in sync manually —
 * the prover is a separate package with no shared types.
 */

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type PropertyStatus = "verified" | "violated" | "unknown" | "no-spec";

export type ReportFormat = "json" | "md" | "html" | "pdf" | "audit-html";

export type SuiExecutionMode = "parse-only" | "package-test" | "devnet-extended";

export interface AuditSummary {
  modules: number;
  functions: number;
  specsInferred: number;
  verified: number;
  violated: number;
  unknown: number;
}

export interface AuditSpec {
  requires: string[];
  ensures: string[];
}

export interface AuditFunction {
  name: string;
  params: string[];
  spec: AuditSpec;
  status: PropertyStatus;
}

export interface AuditModule {
  name: string;
  functions: AuditFunction[];
}

export interface AuditFinding {
  severity: Severity;
  title: string;
  description: string;
  id?: string;
  status?: string;
  difficulty?: string;
  likelihood?: string;
  impact?: string;
  category?: string;
  module?: string;
  cwe?: string;
  remediation?: string;
  exploitRef?: string;
  location?: { module?: string; function?: string; line?: number };
}

export interface SecurityScoreBreakdown {
  verification?: number;
  testCoverage?: number;
  patternSafety?: number;
  scamRisk?: number;
  [key: string]: number | undefined;
}

export type RiskLevel = "Low" | "Medium" | "High" | "Critical" | string;

export interface SecurityScore {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F" | string;
  riskLevel?: RiskLevel;
  breakdown?: SecurityScoreBreakdown;
  /** Rich evidence block emitted by the prover. Shape varies by chain. */
  evidence?: Record<string, unknown>;
}

export interface SuiAudit {
  executionModeRequested?: SuiExecutionMode;
  executionModeAchieved?: SuiExecutionMode;
  devnetAvailable?: boolean;
  parserFallbackUsed?: boolean;
  productionVerdict?: string;
  evidenceVerdict?: string;
  hardGate?: Record<string, unknown>;
  packageTestCoverage?: Record<string, unknown>;
  devnetCoverage?: Record<string, unknown>;
  notes?: string[];
  devnetRequiredGeneratedOnlyMethods?: number;
  [key: string]: unknown;
}

export interface AuditResponse {
  success: boolean;
  chain: string;
  language: string;
  summary: AuditSummary;
  modules: AuditModule[];
  findings: AuditFinding[];
  /** Lower-severity findings the prover separates from the main list. */
  informationalFindings?: AuditFinding[];
  securityScore: SecurityScore;
  prettyOutput?: string;
  suiAudit?: SuiAudit;
  auditId: string;
  reauditToken?: string;
  resubmissionsRemaining?: number;
}

/** Job-control types exchanged between the prover and our proxy. */

export interface JobCreated {
  jobId: string;
  auditId: string;
  status: "queued";
  queuePosition?: number;
  estimatedWaitSeconds?: number;
  createdAt: string;
}

export interface JobStatusPending {
  jobId: string;
  status: "queued" | "running";
  queuePosition?: number;
  startedAt?: string;
  progress?: string;
  createdAt?: string;
}

export interface JobStatusCompleted {
  jobId: string;
  status: "completed";
  completedAt: string;
  result: AuditResponse;
}

export interface JobStatusFailed {
  jobId: string;
  status: "failed";
  completedAt?: string;
  error: { message: string; code?: string };
}

export type JobStatus =
  | JobStatusPending
  | JobStatusCompleted
  | JobStatusFailed;

export interface ResubmitStatus {
  auditId: string;
  originalScore?: number;
  originalGrade?: SecurityScore["grade"];
  resubmissionsRemaining: number;
  canResubmit: boolean;
  resubmitHistory: Array<{
    auditId: string;
    submittedAt: string;
    score?: number;
    grade?: SecurityScore["grade"];
  }>;
}

export interface GitHubAuditInput {
  url: string;
  branch?: string;
  path?: string;
  notifyEmail?: string;
  webhookUrl?: string;
  suiExecutionMode?: SuiExecutionMode;
}

export interface ZionStats {
  patterns: number;
  exploits: number;
  totalLosses: number;
  chainsSupported: number;
  auditsPerformed: number;
  auditsToday: number;
}

export interface ZionPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: Severity;
  propertyCount?: number;
  /** Chains this pattern applies to, if the prover emits it. */
  chains?: string[];
}

export interface ZionExploit {
  /** Stable ID from the prover, if provided. */
  id?: string;
  name: string;
  chain: string;
  date: string;
  category: string;
  description: string;
  /** USD loss. Prover variants emit `amount` or `amountUsd`; we accept both. */
  amount?: number;
  amountUsd?: number;
  /** Link to post-mortem / incident write-up. */
  reference?: string;
}

/**
 * Shape of rows we persist in the `zion_audits` table. Defined here
 * (not in `lib/server/zion-db.ts`) so client components can refer to
 * these types without pulling a server-only module into the bundle.
 */
export type AuditSourceType = "upload" | "github";

export interface AuditSourceMeta {
  filenames?: string[];
  totalBytes?: number;
  githubUrl?: string;
  githubBranch?: string;
  githubPath?: string;
  suiExecutionMode?: string;
}

/** File extensions the prover accepts. Enforced client- and server-side. */
export const ZION_ACCEPTED_EXTENSIONS = [
  ".sol",
  ".move",
  ".rs",
  ".toml",
  ".json",
  ".lock",
  ".zip",
] as const;

export type ZionAcceptedExtension = (typeof ZION_ACCEPTED_EXTENSIONS)[number];
