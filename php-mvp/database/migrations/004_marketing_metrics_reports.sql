CREATE TABLE IF NOT EXISTS marketing_metrics_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1,
    client_id INTEGER NOT NULL,
    period_label TEXT NOT NULL,
    meta_account_id TEXT,
    meta_account_name TEXT,
    meta_spend REAL NOT NULL DEFAULT 0,
    meta_leads INTEGER NOT NULL DEFAULT 0,
    meta_conversions INTEGER NOT NULL DEFAULT 0,
    google_account_id TEXT,
    google_account_name TEXT,
    google_spend REAL NOT NULL DEFAULT 0,
    google_leads INTEGER NOT NULL DEFAULT 0,
    google_conversions INTEGER NOT NULL DEFAULT 0,
    organic_spend REAL NOT NULL DEFAULT 0,
    organic_leads INTEGER NOT NULL DEFAULT 0,
    organic_conversions INTEGER NOT NULL DEFAULT 0,
    outros_spend REAL NOT NULL DEFAULT 0,
    outros_leads INTEGER NOT NULL DEFAULT 0,
    outros_conversions INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, client_id, period_label)
);

CREATE INDEX IF NOT EXISTS idx_marketing_metrics_org_client ON marketing_metrics_reports(organization_id, client_id);
