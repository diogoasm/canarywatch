CREATE TABLE briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT NOT NULL DEFAULT 'portfolio'
);

ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefings" ON briefings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefings" ON briefings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
