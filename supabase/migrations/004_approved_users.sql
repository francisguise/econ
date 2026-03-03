CREATE TABLE approved_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
CREATE INDEX idx_approved_users_email ON approved_users(email);
ALTER TABLE approved_users ENABLE ROW LEVEL SECURITY;
-- No RLS policies = no access via anon key. Service role bypasses.
