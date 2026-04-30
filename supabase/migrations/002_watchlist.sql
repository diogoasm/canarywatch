-- ─────────────────────────────────────────────────────────────────────────────
-- Canarywatch · Migration 002 · watchlist table
-- Run this in your Supabase project → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE watchlist (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticker        TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  shares        NUMERIC NOT NULL,
  avg_buy_price NUMERIC NOT NULL,
  added_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist" ON watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON watchlist
  FOR DELETE USING (auth.uid() = user_id);
