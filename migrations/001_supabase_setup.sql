-- =============================================
-- Migration 001: Initial Sweet Memories Schema
-- Target: Supabase PostgreSQL
-- =============================================

-- 1. Create app_data table (stores all couple journal state as JSONB)
CREATE TABLE IF NOT EXISTS app_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{
    "poems": [],
    "photos": [],
    "playlist": [],
    "anniversary": null,
    "name1": "Your Name",
    "name2": "Partner"
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed initial singleton record safely
INSERT INTO app_data (id, data)
VALUES (1, '{
  "poems": [],
  "photos": [],
  "playlist": [],
  "anniversary": null,
  "name1": "Your Name",
  "name2": "Partner"
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security (service role bypasses RLS from backend API)
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'app_data' AND policyname = 'Allow service access'
  ) THEN
    CREATE POLICY "Allow service access" ON app_data FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
