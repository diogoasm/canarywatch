-- ─────────────────────────────────────────────────────────────────────────────
-- Canarywatch · Migration 004 · market_snapshots table
-- Run this in your Supabase project → SQL Editor
--
-- The fullest market movers list of the last session, one row per list. Only
-- the server (service role) reads or writes it.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_snapshots (
  list          TEXT PRIMARY KEY CHECK (list IN ('gainers', 'losers', 'mostActive')),
  session_date  DATE NOT NULL,
  taken_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  movers        JSONB NOT NULL
);

-- No policies: RLS blocks everyone except the service role.
ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.market_snapshots FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.market_snapshots TO service_role;
