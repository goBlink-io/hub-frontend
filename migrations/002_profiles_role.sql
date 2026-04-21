-- =============================================================
-- goBlink Hub — profiles table with role column
-- Introduces a per-user profile row keyed by auth.users.id, with
-- a `role` column gating admin-only areas of the app.
-- =============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT profiles_role_chk CHECK (role IN ('user','admin'))
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
CREATE OR REPLACE FUNCTION profiles_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id) VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION profiles_handle_new_user();

-- Backfill: any existing auth.users without a profiles row.
INSERT INTO profiles (id)
SELECT u.id FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- =============================================================
-- Row-level security
-- Users may read their own profile. Only service-role writes
-- (including admin promotions via the Supabase dashboard / CLI).
-- =============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own
    ON profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());
