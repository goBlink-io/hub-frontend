-- =============================================================
-- goBlink Hub — profiles table
-- One row per auth.users row. Extends with app-level identity
-- metadata that's agnostic to the sign-in path (wallet, email, OAuth).
-- =============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    display_name TEXT,
    -- Optional contact email. Wallet-only users may never set this.
    email TEXT,
    -- Which sign-in path created this account.
    signup_method TEXT NOT NULL DEFAULT 'wallet',
    -- The user's "default" wallet for display / cross-chain identity.
    -- Points at a row in `linked_wallets` (created by migration 003).
    -- Not enforced as a FK to avoid migration-order coupling — apps
    -- treat NULL as "no wallet linked yet" (e.g. email-only users).
    primary_wallet_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT profiles_role_chk CHECK (role IN ('user','admin')),
    CONSTRAINT profiles_signup_method_chk
        CHECK (signup_method IN ('wallet','zklogin','email','oauth'))
);

-- updated_at auto-bump.
CREATE OR REPLACE FUNCTION profiles_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION profiles_set_updated_at();

-- Auto-create a profile row on new auth.users signup.
-- Pulls signup_method from the user's app_metadata if the wallet-auth
-- endpoint set it during creation; defaults to 'wallet' otherwise.
CREATE OR REPLACE FUNCTION profiles_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    method TEXT;
BEGIN
    method := COALESCE(NEW.raw_app_meta_data ->> 'signup_method', 'wallet');
    INSERT INTO profiles (id, signup_method, email)
    VALUES (NEW.id, method, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION profiles_handle_new_user();

-- Backfill any pre-existing auth.users without a profile row.
INSERT INTO profiles (id, signup_method, email)
SELECT
    u.id,
    COALESCE(u.raw_app_meta_data ->> 'signup_method', 'email'),
    u.email
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- =============================================================
-- Row-level security
-- Authenticated users may read their own profile. Admin reads
-- happen via the service-role client, which bypasses RLS.
-- =============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own
    ON profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE INDEX IF NOT EXISTS profiles_email_idx
    ON profiles (lower(email))
    WHERE email IS NOT NULL;
