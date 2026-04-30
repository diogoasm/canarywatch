-- ─────────────────────────────────────────────────────────────────────────────
-- Canarywatch · Migration 001 · profiles table
-- Run this in your Supabase project → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  plan                TEXT NOT NULL DEFAULT 'free',
  briefings_used      INT NOT NULL DEFAULT 0,
  briefings_reset_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id  TEXT,
  trader_type         TEXT,          -- 'beginner' | 'active' | 'experienced'
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile row on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
