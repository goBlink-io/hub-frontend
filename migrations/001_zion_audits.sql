-- =============================================================
-- goBlink Hub — Audit feature (zion-prover)
-- Stores per-user audit history, results, and resubmit lineage.
-- =============================================================

CREATE TABLE IF NOT EXISTS zion_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Identifiers from the prover.
    job_id TEXT,
    audit_id TEXT,

    -- Job lifecycle. Mirrors the prover's discriminated status.
    -- One of: 'queued' | 'running' | 'completed' | 'failed'
    status TEXT NOT NULL DEFAULT 'queued',

    -- Source metadata (how the audit was submitted).
    -- One of: 'upload' | 'github'
    source_type TEXT NOT NULL,
    source_meta JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Resubmit lineage. If this audit is a resubmit of another, parent_audit_id
    -- points at the original's audit_id. resubmit_count tracks how many times
    -- THIS audit has been resubmitted (not how many generations deep it is).
    parent_audit_id TEXT,
    resubmit_count INTEGER NOT NULL DEFAULT 0,

    -- Denormalised headline fields — populated when the job completes.
    chain TEXT,
    language TEXT,
    security_score INTEGER,
    grade TEXT,

    -- Full AuditResponse from the prover. NULL until the job completes.
    result JSONB,

    -- HMAC-bound token returned by the prover for a one-shot free resubmit.
    -- Sensitive — never expose to the browser.
    reaudit_token TEXT,

    -- Populated when status = 'failed'.
    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    CONSTRAINT zion_audits_status_chk
        CHECK (status IN ('queued','running','completed','failed')),
    CONSTRAINT zion_audits_source_chk
        CHECK (source_type IN ('upload','github'))
);

CREATE INDEX IF NOT EXISTS zion_audits_user_created_idx
    ON zion_audits (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS zion_audits_job_id_idx
    ON zion_audits (job_id)
    WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS zion_audits_audit_id_idx
    ON zion_audits (audit_id)
    WHERE audit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS zion_audits_parent_idx
    ON zion_audits (parent_audit_id)
    WHERE parent_audit_id IS NOT NULL;

-- updated_at auto-bump on row modification.
CREATE OR REPLACE FUNCTION zion_audits_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS zion_audits_updated_at ON zion_audits;
CREATE TRIGGER zion_audits_updated_at
    BEFORE UPDATE ON zion_audits
    FOR EACH ROW
    EXECUTE FUNCTION zion_audits_set_updated_at();

-- =============================================================
-- Row-level security
-- Authenticated users may SELECT their own rows.
-- All writes go through the service-role client (server-side proxy),
-- which bypasses RLS.
-- =============================================================

ALTER TABLE zion_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zion_audits_select_own ON zion_audits;
CREATE POLICY zion_audits_select_own
    ON zion_audits FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
