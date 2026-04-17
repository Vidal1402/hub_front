-- Relatórios/links disponibilizados pelo admin para cada cliente no portal.
CREATE TABLE IF NOT EXISTS client_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL DEFAULT 1,
    client_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    period_label TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_reports_org ON client_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_reports_client ON client_reports(client_id);
