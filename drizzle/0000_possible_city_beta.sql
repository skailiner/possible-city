CREATE TABLE IF NOT EXISTS beta_daily_usage (
  day TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (day, visitor_hash)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS beta_monthly_usage (
  month TEXT PRIMARY KEY,
  completed INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS beta_daily_usage_updated_at_idx
  ON beta_daily_usage (updated_at);
