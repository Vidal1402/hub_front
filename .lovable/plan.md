## Área Administrativa Completa

### Estrutura de Arquivos
- `src/components/admin/AdminLayout.tsx` — Layout com sidebar colapsável + topbar com métricas
- `src/components/admin/AdminSidebar.tsx` — Menu lateral com badges e expand/collapse
- `src/components/admin/AdminTopbar.tsx` — Barra superior com MRR, clientes, notificações
- `src/components/admin/pages/VisaoGeralPage.tsx` — Dashboard executivo com cards + gráficos (MRR, Churn, etc.)
- `src/components/admin/pages/ClientesPage.tsx` — CRUD de clientes com tabela e modais
- `src/components/admin/pages/ProducaoAdminPage.tsx` — Kanban com filtros avançados
- `src/components/admin/pages/ColaboradoresPage.tsx` — Gestão de equipe
- `src/components/admin/pages/FinanceiroAdminPage.tsx` — Painel financeiro com gráficos
- `src/components/admin/pages/ProdutosPlanos.tsx` — Gestão de planos/produtos
- `src/components/admin/pages/ComercialPage.tsx` — Funil de vendas
- `src/components/admin/pages/AlertasPage.tsx` — Lista de alertas
- `src/components/admin/pages/RelatoriosAdminPage.tsx` — Relatórios com exportação
- `src/components/admin/pages/ConfigAdminPage.tsx` — Configurações
- `src/data/admin-data.ts` — Dados mockados completos
- Atualizar `src/App.tsx` para incluir rota `/admin`

### Design
- Light mode com fundo cinza claro, cards brancos, sombras suaves
- Cores de status: verde/azul/amarelo/vermelho
- Tipografia limpa, ícones Lucide, hover states
- Responsivo com sidebar colapsável em mobile

### Módulos incluídos
1. Visão Geral — Cards de métricas + gráficos analíticos
2. Clientes — Tabela com CRUD completo
3. Produção — Kanban com filtros
4. Colaboradores — Gestão de equipe
5. Financeiro — Faturamento e cobranças
6. Produtos/Planos — Gestão de planos
7. Comercial — Funil de vendas
8. Alertas + Notificações
9. Relatórios — Com exportação
10. Configurações
