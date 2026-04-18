-- =============================================
-- Sweet Memories — Supabase Setup SQL
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create app_data table (stores all app state as JSON)
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

-- 2. Insert default row
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

-- 3. Disable RLS for simplicity (personal project)
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON app_data FOR ALL USING (true) WITH CHECK (true);
