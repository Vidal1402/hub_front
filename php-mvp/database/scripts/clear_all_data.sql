-- Apaga todas as linhas mantendo o schema (migrações intactas).
-- Ordem respeita dependências lógicas (SQLite pode ter FKs ligadas).

PRAGMA foreign_keys = OFF;

DELETE FROM client_reports;
DELETE FROM marketing_metrics_reports;
DELETE FROM tasks;
DELETE FROM invoices;
DELETE FROM clients;
DELETE FROM users;

DELETE FROM sqlite_sequence WHERE name IN (
  'users',
  'clients',
  'tasks',
  'invoices',
  'client_reports',
  'marketing_metrics_reports'
);

PRAGMA foreign_keys = ON;
