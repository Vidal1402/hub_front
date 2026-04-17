-- Vínculo login do portal com cadastro de cliente; fatura associada ao cliente.
ALTER TABLE clients ADD COLUMN user_id INTEGER NULL UNIQUE;
ALTER TABLE invoices ADD COLUMN client_id INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
