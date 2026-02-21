ALTER TABLE games ADD COLUMN resolution_mode TEXT NOT NULL DEFAULT 'timer' CHECK (resolution_mode IN ('timer', 'all_submit'));
