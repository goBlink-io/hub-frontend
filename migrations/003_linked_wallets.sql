-- =============================================================
-- goBlink Hub — linked_wallets
-- Maps wallet addresses (across multiple chains) to auth.users rows.
-- One human can link many wallets across chains; one (chain,address)
-- pair can map to at most one user.
-- =============================================================

CREATE TABLE IF NOT EXISTS linked_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chain TEXT NOT NULL,
    address TEXT NOT NULL,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_signed_in_at TIMESTAMPTZ,
    -- Free-form metadata captured at sign-in time. E.g. wallet name
    -- ("MetaMask", "Phantom"), connector ("walletconnect"), etc.
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT linked_wallets_chain_chk CHECK (chain IN (
        'evm','solana','sui','near','aptos','bitcoin','starknet','ton','tron'
    )),
    CONSTRAINT linked_wallets_chain_address_uniq UNIQUE (chain, address)
);

CREATE INDEX IF NOT EXISTS linked_wallets_user_idx
    ON linked_wallets (user_id);

-- =============================================================
-- Row-level security
-- Users may read wallets linked to their own account.
-- All writes go through the service-role wallet-auth endpoint.
-- =============================================================

ALTER TABLE linked_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS linked_wallets_select_own ON linked_wallets;
CREATE POLICY linked_wallets_select_own
    ON linked_wallets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
