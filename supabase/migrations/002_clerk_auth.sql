-- Migration: Switch from Supabase Auth to Clerk
-- Clerk user IDs are strings (e.g., "user_2abc123"), not UUIDs

-- 1. Drop existing RLS policies (we'll use service role for all mutations)
DROP POLICY IF EXISTS "Anyone can view games" ON games;
DROP POLICY IF EXISTS "Creator can update games" ON games;
DROP POLICY IF EXISTS "Authenticated users can create games" ON games;
DROP POLICY IF EXISTS "Players can view game players" ON game_players;
DROP POLICY IF EXISTS "Users can join games" ON game_players;
DROP POLICY IF EXISTS "Players can view cabinets" ON cabinets;
DROP POLICY IF EXISTS "Players can update own cabinet" ON cabinets;
DROP POLICY IF EXISTS "Players can view own actions" ON minister_actions;
DROP POLICY IF EXISTS "Players can insert own actions" ON minister_actions;
DROP POLICY IF EXISTS "Players can view quarters" ON quarters;
DROP POLICY IF EXISTS "Players can view results" ON quarter_results;
DROP POLICY IF EXISTS "Players can view snapshots" ON quarter_snapshots;

-- 2. Disable RLS (service role bypasses anyway, anon key only used for real-time)
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE cabinets DISABLE ROW LEVEL SECURITY;
ALTER TABLE quarters DISABLE ROW LEVEL SECURITY;
ALTER TABLE minister_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quarter_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE quarter_snapshots DISABLE ROW LEVEL SECURITY;

-- 3. Change UUID user columns to TEXT for Clerk IDs
-- Drop foreign key constraints first
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_created_by_fkey;
ALTER TABLE game_players DROP CONSTRAINT IF EXISTS game_players_user_id_fkey;
ALTER TABLE cabinets DROP CONSTRAINT IF EXISTS cabinets_player_id_fkey;
ALTER TABLE minister_actions DROP CONSTRAINT IF EXISTS minister_actions_player_id_fkey;
ALTER TABLE quarter_snapshots DROP CONSTRAINT IF EXISTS quarter_snapshots_player_id_fkey;

-- Change column types
ALTER TABLE games ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE game_players ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE cabinets ALTER COLUMN player_id TYPE TEXT USING player_id::TEXT;
ALTER TABLE minister_actions ALTER COLUMN player_id TYPE TEXT USING player_id::TEXT;
ALTER TABLE quarter_snapshots ALTER COLUMN player_id TYPE TEXT USING player_id::TEXT;

-- 4. Create player_submissions table
-- Stores full PolicyChoices per player per quarter (simpler than reconstructing from minister_actions)
CREATE TABLE player_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  policies JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quarter_id, player_id)
);

CREATE INDEX idx_player_submissions_quarter ON player_submissions(quarter_id);
CREATE INDEX idx_player_submissions_game ON player_submissions(game_id);

-- 5. Add player_submissions to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE player_submissions;
