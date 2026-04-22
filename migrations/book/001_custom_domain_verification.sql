-- =============================================================
-- Book — custom domain DNS verification
-- Adds a verified flag and last-verified timestamp to bb_spaces so
-- public serving can gate on DNS ownership rather than trusting the
-- value the space owner typed into the settings form.
--
-- Apply to the Book Supabase project (mkjyvbjvfhubjvmmnfsm).
-- =============================================================

ALTER TABLE bb_spaces
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN bb_spaces.custom_domain_verified IS
  'True when the custom_domain''s DNS CNAME resolves to the configured hub target. Public site serving requires this to be true.';
COMMENT ON COLUMN bb_spaces.custom_domain_verified_at IS
  'UTC timestamp of the last successful verification. Set to NULL when the domain changes or is cleared.';

-- Clearing the domain must clear verification.
CREATE OR REPLACE FUNCTION bb_reset_domain_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.custom_domain IS DISTINCT FROM OLD.custom_domain THEN
    NEW.custom_domain_verified := false;
    NEW.custom_domain_verified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bb_reset_domain_verification_trig ON bb_spaces;
CREATE TRIGGER bb_reset_domain_verification_trig
  BEFORE UPDATE ON bb_spaces
  FOR EACH ROW
  EXECUTE FUNCTION bb_reset_domain_verification();
