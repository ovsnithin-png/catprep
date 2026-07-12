-- Create table for storing per-user app state
CREATE TABLE IF NOT EXISTS public.cat_app_state (
  id text PRIMARY KEY,
  user_id text UNIQUE NOT NULL,
  data jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS and restrict access so users can only manage their own row
ALTER TABLE public.cat_app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_owns_row ON public.cat_app_state
  -- auth.uid() returns a UUID type in some projects; cast to text to match user_id column
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Note: Run this SQL in the Supabase SQL editor for your project.
