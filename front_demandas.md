# Front Demandas para Produção

## 1) Objetivo

Este documento consolida tudo que o front-end precisa para funcionar de verdade (sem mocks), incluindo:

- rotas atuais;
- dependências do projeto;
- contratos de dados por módulo/tela;
- backend mínimo necessário;
- requisitos de segurança;
- checklist de implementação.

Contexto atual: o projeto já possui UI e autenticação com Supabase, mas as telas usam dados mockados (`src/data/admin-data.ts` e `src/data/portal-data.ts`) e não existe schema versionado no repositório.

---

## 2) Rotas do Front

### 2.1 Rotas de URL (React Router)

- `/login` -> tela de login.
- `/` -> portal principal (layout cliente/conta).
- `/admin` -> portal administrativo.
- `/colaborador` -> portal colaborador.
- `*` -> not found.

### 2.2 Rotas internas por estado (não mudam URL)

O front usa troca de página por estado interno nos layouts:

#### Portal (`/`) - `PortalLayout`

- `dashboard` (modo `producao` ou `performance`)
- `relatorios`
- `materiais`
- `financeiro`
- `planos`
- `academy` (hoje aparece bloqueado no menu)
- `suporte`
- `config`

#### Admin (`/admin`) - `AdminLayout`

- `visao-geral`
- `clientes`
- `producao`
- `colaboradores`
- `financeiro`
- `produtos`
- `comercial`
- `alertas`
- `relatorios`
- `config`

#### Colaborador (`/colaborador`) - `ColaboradorLayout`

- `producao` (minhas tarefas)

---

## 3) Dependências do Projeto

Fonte: `package.json`.

### 3.1 Runtime (`dependencies`)

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`
- `@hookform/resolvers`
- `@radix-ui/react-accordion`
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-aspect-ratio`
- `@radix-ui/react-avatar`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-context-menu`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-label`
- `@radix-ui/react-menubar`
- `@radix-ui/react-navigation-menu`
- `@radix-ui/react-popover`
- `@radix-ui/react-progress`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slider`
- `@radix-ui/react-slot`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-toast`
- `@radix-ui/react-toggle`
- `@radix-ui/react-toggle-group`
- `@radix-ui/react-tooltip`
- `@supabase/supabase-js`
- `@tanstack/react-query`
- `class-variance-authority`
- `clsx`
- `cmdk`
- `date-fns`
- `embla-carousel-react`
- `input-otp`
- `lucide-react`
- `next-themes`
- `react`
- `react-day-picker`
- `react-dom`
- `react-hook-form`
- `react-resizable-panels`
- `react-router-dom`
- `recharts`
- `sonner`
- `tailwind-merge`
- `tailwindcss-animate`
- `vaul`
- `zod`

### 3.2 Desenvolvimento (`devDependencies`)

- `@eslint/js`
- `@playwright/test`
- `@tailwindcss/typography`
- `@testing-library/jest-dom`
- `@testing-library/react`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `@vitejs/plugin-react-swc`
- `autoprefixer`
- `eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`
- `jsdom`
- `lovable-tagger`
- `postcss`
- `tailwindcss`
- `typescript`
- `typescript-eslint`
- `vite`
- `vitest`

---

## 4) Configuração e Ambiente

### 4.1 Variáveis obrigatórias

Atualmente usadas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Recomendado criar `.env.example` e padronizar validação de env em runtime.

### 4.2 Scripts esperados

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`
- `npm run test:watch`

---

## 5) Situação Atual (Gap)

- Auth existe (`signInWithPassword`, sessão e `signOut`).
- Tipagem Supabase indica **zero tabelas** (`src/integrations/supabase/types.ts` com `Tables: never`).
- Não há migrations SQL versionadas na pasta `supabase/migrations`.
- Quase todas as telas funcionam com arrays mockados locais.

Conclusão: UI pronta, backend funcional incompleto e sem trilha de segurança auditável no repositório.

---

## 6) Backend Necessário por Domínio

## 6.1 Autenticação, perfil e acesso

### Tabelas mínimas

- `profiles` (id = auth.users.id, nome, email, avatar_url, ativo)
- `organizations` (tenant/empresa)
- `organization_members` (user_id, organization_id, role)
- `roles_permissions` (opcional, caso RBAC granular)

### Regras

- Role mínima: `admin`, `colaborador`, `cliente_viewer` (ou equivalente).
- Não confiar apenas em `user_metadata.role`; validar role no banco.
- Toda query de dados de negócio deve ser filtrada por `organization_id`.

## 6.2 Clientes e planos (admin)

### Tabelas

- `clients` (dados cadastrais, status, organization_id)
- `plans` (nome, preço, recursos)
- `client_subscriptions` (client_id, plan_id, status, valor_atual)

### Telas impactadas

- Admin > `clientes`
- Admin > `produtos`
- Portal > `planos`
- Portal > `config` (dados da conta)

## 6.3 Produção / tarefas / kanban

### Tabelas

- `tasks` (titulo, descricao, tipo, prioridade, prazo, status, organization_id, client_id)
- `task_columns` (solicitacoes, pendentes, producao, revisao, entregue)
- `task_assignees` (task_id, user_id)
- `task_comments`
- `task_attachments`
- `task_history` (auditoria de mudanças)

### Telas impactadas

- Portal > `producao`
- Colaborador > `producao`
- Admin > `producao`

### Operações necessárias

- criar solicitação;
- mover card (drag and drop) persistindo coluna/ordem;
- listar por filtros (tipo, responsável, prazo, status);
- comentários e anexos.

## 6.4 Financeiro

### Tabelas

- `invoices` (id, cliente, período, valor, vencimento, status)
- `payments` (invoice_id, método, status, paid_at, gateway_ref)
- `billing_methods` (pix/cartão/boleto por organização)
- `receivables` (opcional para DRE/faturamento)

### Integrações

- gateway de pagamento (Asaas, Stripe, Mercado Pago ou outro).
- webhook para confirmação de pagamento.

### Telas impactadas

- Portal > `financeiro`
- Admin > `financeiro`
- Admin > `visao-geral` (cards e vencimentos)

## 6.5 Relatórios e indicadores

### Tabelas / camada analítica

- `report_files` (metadados e URL segura)
- `kpi_snapshots` (leads, conversões, ROI, CAC etc)
- `funnels` / `funnel_steps`

### Telas impactadas

- Portal > `performance`
- Portal > `relatorios`
- Admin > `relatorios`
- Admin > `visao-geral`

## 6.6 Materiais e arquivos

### Recursos

- Supabase Storage (ou S3) com buckets privados.
- Metadados em tabela `materials` (nome, tamanho, pasta, owner, organization_id, storage_path).
- Links assinados para download/preview.

### Telas impactadas

- Portal > `materiais`

## 6.7 Suporte e alertas

### Tabelas

- `support_tickets`
- `ticket_messages`
- `faq_items`
- `alerts`

### Telas impactadas

- Portal > `suporte`
- Admin > `alertas`
- Admin > `visao-geral`

## 6.8 Academy (conteúdo)

### Tabelas

- `academy_courses`
- `academy_modules`
- `academy_progress` (user_id, course_id, progress, done)
- `academy_access_by_plan` (quais planos têm acesso)

### Tela impactada

- Portal > `academy`

---

## 7) Contratos mínimos que o Front espera

## 7.1 Autenticação

- login com email/senha;
- sessão persistida;
- logout;
- retorno de perfil + role + organization no bootstrap da aplicação.

## 7.2 Formatos base (exemplo de shape)

- `Client`: id, name, empresa, email, telefone, plano, valor, status.
- `Task`: id, title, type, priority, due_date, owner, comments_count, files_count, column_id.
- `Invoice`: id, period, amount, due_date, status, method, paid_at.
- `Report`: id, title, type, period, created_at, pages, file_url.
- `Ticket`: id, category, title, status, created_at, updated_at.

---

## 8) Segurança Obrigatória (mínimo)

## 8.1 Banco e acesso

- habilitar RLS em todas as tabelas de negócio.
- políticas por tenant (`organization_id`) e role.
- usuário só lê/escreve dados da própria organização.
- colunas sensíveis protegidas por política (ou views controladas).

## 8.2 API e borda

- rate limiting para auth e endpoints críticos.
- validação de payload com schema (`zod` no front e validação server-side no backend).
- logs de auditoria para ações críticas (status de task, pagamento, alteração de plano, permissões).
- webhooks com assinatura e idempotência.

## 8.3 Storage

- bucket privado por padrão.
- geração de signed URL com expiração curta.
- bloqueio de listagem ampla sem filtro por organização.

## 8.4 Segredos

- não versionar chaves sensíveis.
- separar ambiente dev/staging/prod.
- revisar permissões da chave `anon` e desabilitar qualquer policy permissiva.

---

## 9) Escopo MVP (mínimo viável real)

Objetivo do MVP: sair de interface mockada para operação real com login, controle de acesso e fluxo principal de trabalho.

### 9.1 O que entra no MVP

- Auth real com Supabase (`/login`, sessão persistida, logout).
- RBAC mínimo com `admin` e `colaborador` e vínculo por `organization_id`.
- Portal e Admin consumindo dados reais para:
  - clientes;
  - produção/kanban (criar, listar, mover e atualizar status);
  - financeiro (listar faturas e status de pagamento, sem automações avançadas);
  - materiais (upload, listagem e download com URL assinada).
- RLS habilitado em todas as tabelas usadas no MVP.
- Migrações SQL versionadas no repositório.
- Substituição dos mocks nessas telas por queries/mutations reais.

### 9.2 O que fica fora do MVP

- Academy completa (progresso avançado e trilhas).
- Relatórios analíticos avançados e BI detalhado.
- Integrações externas completas (Meta/Google/RD/Slack).
- Motor robusto de alertas automáticos e notificações omnichannel.
- Comercial avançado (pipeline com regras complexas).

### 9.3 Critérios de aceite do MVP

- Usuário `admin` acessa e gerencia dados da própria organização.
- Usuário `colaborador` acessa apenas tarefas/dados permitidos.
- Nenhum dado cruza entre organizações (isolamento garantido por RLS).
- Kanban persiste alterações após refresh.
- Faturas e materiais são carregados do backend real.
- Build e fluxo principal passam sem erro (`dev`, `build`, login, CRUD principal).

### 9.4 Entregáveis técnicos do MVP

- Schema inicial + migrations (`profiles`, `organizations`, `organization_members`, `clients`, `tasks`, `task_columns`, `invoices`, `materials`).
- Policies RLS por tabela.
- Camada de acesso no front com React Query + Supabase.
- Documento `.env.example`.
- Testes mínimos dos fluxos críticos (auth + permissão + CRUD de tarefa).

### 9.5 Fases sugeridas (MVP)

1. Fundação segura: auth, perfil, organização, RBAC e RLS.
2. Core operacional: clientes + produção/kanban real.
3. Financeiro e materiais: leitura real + operações básicas.
4. Estabilização: testes, ajustes de UX e hardening de segurança.

---

## 10) Checklist de Entrega (para ficar funcional)

- [ ] Criar schema SQL + migrations versionadas.
- [ ] Definir RBAC e tabela de memberships por organização.
- [ ] Implementar RLS em todas as tabelas.
- [ ] Substituir mocks das telas por queries reais (React Query + Supabase).
- [ ] Persistir Kanban (ordem, coluna, histórico).
- [ ] Integrar financeiro com gateway + webhook.
- [ ] Integrar upload/download seguro para materiais.
- [ ] Implementar suporte real (tickets + mensagens).
- [ ] Implementar relatórios com arquivos reais (PDF/CSV) e métricas.
- [ ] Criar `.env.example` e documentação de setup.
- [ ] Cobrir fluxos críticos com testes (auth, RLS, criação/edição de tarefa, pagamento).

---

## 11) Priorização sugerida (ordem prática)

1. Auth + profile + organization + RBAC + RLS.
2. Produção (tasks/kanban) e clientes.
3. Financeiro (faturas + status real de pagamento).
4. Materiais (storage seguro).
5. Relatórios e performance.
6. Suporte, academy e configurações avançadas.

---

## 12) Observações finais

- O front está visualmente bem adiantado.
- A principal lacuna é backend + segurança + persistência.
- Sem as políticas RLS e modelagem multi-tenant, existe risco de exposição de dados entre contas.

