# PHP MVP API

Backend MVP em PHP nativo com padrão em camadas:

- Routes
- Controllers
- Repositories
- Middleware JWT
- Migrações SQL

## Executar local

1. Copie `.env.example` para `.env`.
2. Rode `composer install`.
3. Rode `php -S localhost:8000 -t public`.

## Endpoints principais

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (JWT)
- `POST /api/admin/users` (JWT admin)
- `GET /api/clients` (JWT)
- `GET /api/clients/me` (JWT) — **cliente**: retorna o cadastro de cliente vinculado ao usuário (`user_id` ou mesmo e-mail)
- `GET /api/clients/{id}` (JWT)
- `POST /api/clients` (JWT admin)
- `PATCH /api/clients/{id}` (JWT admin)
- `DELETE /api/clients/{id}` (JWT admin)
- `GET /api/tasks` (JWT) — cliente vê só as próprias solicitações; admin/colaborador vê todas da organização
- `POST /api/tasks` (JWT **cliente** apenas) — abre solicitação em `solicitacoes`
- `PATCH /api/tasks/{id}` (JWT admin/colaborador)
- `PATCH /api/tasks/{id}/status` (JWT admin/colaborador)
- `GET /api/invoices` (JWT) — **cliente** vê só faturas com `client_id` do seu cadastro; admin vê todas da organização
- `POST /api/invoices` (JWT admin) — envie `client_id` para a fatura aparecer no portal desse cliente
- `PATCH /api/invoices/{id}` (JWT admin) — atualizar `status` e/ou `paid_at` (ao marcar **Pago**, define `paid_at` automaticamente se omitido)
- `GET /api/client-reports` (JWT) — **cliente**: relatórios publicados para o seu cadastro; **admin**: todos da organização
- `POST /api/client-reports` (JWT admin) — `client_id`, `title`, `url` obrigatórios; `description`, `period_label` opcionais
- `PATCH /api/client-reports/{id}` (JWT admin)
- `DELETE /api/client-reports/{id}` (JWT admin)

## Estrutura

- `public/index.php` entrypoint web.
- `src/Core` utilitários de framework.
- `src/Controllers` handlers HTTP.
- `src/Repositories` acesso a dados.
- `src/Middleware` proteção de rotas.
- `database/migrations` schema SQL versionado.
