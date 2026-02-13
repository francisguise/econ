-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'active', 'resolving', 'completed')),
  current_quarter INTEGER DEFAULT 1,
  total_quarters INTEGER NOT NULL,
  quarter_duration_seconds INTEGER NOT NULL,
  visibility_mode TEXT NOT NULL CHECK (visibility_mode IN ('full', 'blind', 'partial')),
  max_players INTEGER NOT NULL DEFAULT 10,
  scoring_preset TEXT NOT NULL DEFAULT 'balanced_growth',
  scoring_weights JSONB DEFAULT '{"gdpGrowth":0.3,"gdpPerCapitaGrowth":0.3,"populationGrowth":0.2,"stabilityScore":0.2}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game players
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  player_name TEXT NOT NULL,
  player_emoji TEXT DEFAULT '👤',
  player_score INTEGER DEFAULT 0,
  player_resources JSONB DEFAULT '{}'::jsonb,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(game_id, user_id)
);

-- Cabinets (each player's 4 ministers)
CREATE TABLE cabinets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  warrior_name TEXT DEFAULT 'General',
  warrior_level INTEGER DEFAULT 1,
  warrior_experience INTEGER DEFAULT 0,
  warrior_traits JSONB DEFAULT '[]'::jsonb,
  mage_name TEXT DEFAULT 'Archmage',
  mage_level INTEGER DEFAULT 1,
  mage_experience INTEGER DEFAULT 0,
  mage_traits JSONB DEFAULT '[]'::jsonb,
  engineer_name TEXT DEFAULT 'Chief Engineer',
  engineer_level INTEGER DEFAULT 1,
  engineer_experience INTEGER DEFAULT 0,
  engineer_traits JSONB DEFAULT '[]'::jsonb,
  diplomat_name TEXT DEFAULT 'Ambassador',
  diplomat_level INTEGER DEFAULT 1,
  diplomat_experience INTEGER DEFAULT 0,
  diplomat_traits JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Quarters (game phases)
CREATE TABLE quarters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  quarter_number INTEGER NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'resolving', 'completed')),
  initial_state JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, quarter_number)
);

-- Minister actions (event sourcing)
CREATE TABLE minister_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  minister_role TEXT NOT NULL CHECK (minister_role IN ('warrior', 'mage', 'engineer', 'diplomat')),
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  is_final BOOLEAN DEFAULT false
);

-- Quarter results
CREATE TABLE quarter_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  calculated_state JSONB NOT NULL,
  player_outcomes JSONB NOT NULL,
  resolution_metadata JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quarter_id)
);

-- Metrics snapshots (for charts)
CREATE TABLE quarter_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_user ON game_players(user_id);
CREATE INDEX idx_cabinets_game_player ON cabinets(game_id, player_id);
CREATE INDEX idx_quarters_game ON quarters(game_id, quarter_number);
CREATE INDEX idx_quarters_status ON quarters(status) WHERE status = 'active';
CREATE INDEX idx_minister_actions_quarter ON minister_actions(quarter_id, player_id);
CREATE INDEX idx_minister_actions_game ON minister_actions(game_id, submitted_at);
CREATE INDEX idx_quarter_snapshots_player ON quarter_snapshots(player_id, created_at);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE minister_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE quarters;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;

-- Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE minister_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarter_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarter_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);
CREATE POLICY "Creator can update games" ON games FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Authenticated users can create games" ON games FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Players can view game players" ON game_players FOR SELECT
  USING (game_id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid()));
CREATE POLICY "Users can join games" ON game_players FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can view cabinets" ON cabinets FOR SELECT
  USING (game_id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid()));
CREATE POLICY "Players can update own cabinet" ON cabinets FOR UPDATE USING (player_id = auth.uid());

CREATE POLICY "Players can view own actions" ON minister_actions FOR SELECT
  USING (player_id = auth.uid());
CREATE POLICY "Players can insert own actions" ON minister_actions FOR INSERT
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Players can view quarters" ON quarters FOR SELECT
  USING (game_id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid()));

CREATE POLICY "Players can view results" ON quarter_results FOR SELECT
  USING (game_id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid()));

CREATE POLICY "Players can view snapshots" ON quarter_snapshots FOR SELECT
  USING (game_id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid()));
