CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  match_any BOOLEAN NOT NULL DEFAULT false,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  media_id TEXT,
  dm_text TEXT NOT NULL,
  dm_link TEXT,
  dm_button_title TEXT,
  public_replies TEXT[] NOT NULL DEFAULT '{}',
  reply_to_dms BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rules_priority_idx ON rules (priority);

CREATE TABLE IF NOT EXISTS processed_comments (
  comment_id TEXT PRIMARY KEY,
  media_id TEXT,
  from_id TEXT,
  from_username TEXT,
  comment_text TEXT,
  rule_id UUID REFERENCES rules(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  skip_reason TEXT,
  dm_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processed_messages (
  message_id TEXT PRIMARY KEY,
  from_id TEXT,
  message_text TEXT,
  rule_id UUID REFERENCES rules(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  skip_reason TEXT,
  dm_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_log_created_at_idx ON event_log (created_at DESC);
