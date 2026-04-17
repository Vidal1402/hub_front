import { useEffect, useMemo, useState } from "react";
import { BarChart3, ExternalLink, Info, Kanban, Wallet } from "lucide-react";
import {
  MarketingMetricsBoard,
  metricsFromApiRow,
  type MarketingMetricsApiRow,
} from "@/components/marketing/MarketingMetricsBoard";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, PortalCard } from "./Primitives";

type Invoice = {
  id: number;
  invoice_code?: string;
  period: string;
  amount: number;
  due_date?: string | null;
  status: string;
  method?: string;
};
type Task = { id: number; title: string; status: string };
type ClientMe = { id: number; name: string; empresa: string; email: string } | null;
type PublishedReport = {
  id: number;
  title: string;
  description?: string | null;
  url: string;
  period_label?: string | null;
  created_at?: string;
};

type MarketingMetricsListRow = MarketingMetricsApiRow & {
  id?: number;
  period_label?: string;
  updated_at?: string;
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function canonicalTaskStatus(s: string): string {
  const n = String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (/^(entregue|done|concluido)$/.test(n)) return "entregue";
  if (n === "revisao") return "revisao";
  if (/^(em_andamento|emandamento)$/.test(n)) return "em_andamento";
  return "solicitacoes";
}

const STATUS_LABEL: Record<string, string> = {
  solicitacoes: "Solicitações",
  em_andamento: "Em andamento",
  revisao: "Revisão",
  entregue: "Entregue",
};

export function RelatoriosPage() {
  const { session } = useAuth();
  const isCliente = (session?.user?.role ?? "") === "cliente";
  const invoices = useApiData<Invoice[]>("/api/invoices", []);
  const tasks = useApiData<Task[]>("/api/tasks", []);
  const clientMe = useApiData<ClientMe>("/api/clients/me", null);
  const published = useApiData<PublishedReport[]>("/api/client-reports", []);
  const marketingMetrics = useApiData<MarketingMetricsListRow[]>("/api/marketing-metrics", []);

  const [metricsIndex, setMetricsIndex] = useState(0);

  const invoiceTotal = useMemo(() => invoices.data.reduce((a, i) => a + Number(i.amount || 0), 0), [invoices.data]);
  const pendingInvoices = useMemo(
    () => invoices.data.filter((i) => !/^(pago|paid)$/i.test(String(i.status || "").trim())),
    [invoices.data],
  );

  const taskBuckets = useMemo(() => {
    const m: Record<string, number> = { solicitacoes: 0, em_andamento: 0, revisao: 0, entregue: 0 };
    for (const t of tasks.data) {
      const k = canonicalTaskStatus(t.status);
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [tasks.data]);

  const metricsRows = marketingMetrics.data;
  useEffect(() => {
    if (metricsRows.length === 0) return;
    setMetricsIndex((i) => Math.min(i, metricsRows.length - 1));
  }, [metricsRows.length]);

  const safeMetricsIndex = metricsRows.length > 0 ? Math.min(metricsIndex, metricsRows.length - 1) : 0;
  const selectedMetricsRow = metricsRows.length > 0 ? metricsRows[safeMetricsIndex] : null;
  const metricsReadValues = useMemo(() => metricsFromApiRow(selectedMetricsRow), [selectedMetricsRow]);

  const linkedClient = clientMe.data;
  const showLinkHint = isCliente && !clientMe.loading && linkedClient == null && !clientMe.error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Resumo financeiro e de solicitações com os dados vinculados à sua conta."
      />

      {clientMe.error && (
        <p className="rounded-md border border-tag-amber/20 bg-tag-amber-bg px-3 py-2 text-xs text-tag-amber">
          Não foi possível verificar o vínculo com o cadastro de cliente.
        </p>
      )}

      {showLinkHint && (
        <PortalCard>
          <div className="flex gap-3 border-l-4 border-l-tag-amber bg-tag-amber-bg/40 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-tag-amber" />
            <div className="text-xs leading-relaxed text-text-2">
              <p className="font-semibold text-text-1">Conta ainda não vinculada ao cadastro de cliente</p>
              <p className="mt-1">
                Peça ao administrador para, em <strong>Clientes</strong>, usar <strong>Liberar acesso</strong> com o mesmo e-mail do seu login.
                Assim suas faturas e relatórios passam a aparecer aqui.
              </p>
            </div>
          </div>
        </PortalCard>
      )}

      {linkedClient ? (
        <p className="text-xs text-text-3">
          Conta vinculada a <span className="font-medium text-text-1">{linkedClient.empresa}</span> ({linkedClient.name}).
        </p>
      ) : null}

      <PortalCard>
        <div className="p-5">
          <p className="mb-3 text-sm font-bold text-text-1">Performance (Meta, Google, orgânico e outros)</p>
          <p className="mb-4 text-xs leading-relaxed text-text-3">
            Métricas preenchidas pelo administrador para o seu cadastro. Quando houver mais de um período, escolha abaixo.
          </p>
          {marketingMetrics.loading && <p className="text-xs text-text-3">Carregando métricas...</p>}
          {marketingMetrics.error && (
            <p className="mb-3 text-xs text-tag-amber">Não foi possível carregar as métricas de marketing.</p>
          )}
          {!marketingMetrics.loading && !marketingMetrics.error && metricsRows.length === 0 && (
            <p className="mb-4 text-xs leading-relaxed text-text-3">
              Ainda não há métricas publicadas para sua conta. Quando o time salvar um relatório em <strong>Admin → Relatórios</strong>, o quadro aparecerá
              aqui.
            </p>
          )}
          {metricsRows.length > 0 ? (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-3" htmlFor="metrics-period">
                  Período
                </label>
                <select
                  id="metrics-period"
                  className="flex h-9 max-w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
                  value={String(safeMetricsIndex)}
                  onChange={(e) => setMetricsIndex(Number(e.target.value))}
                >
                  {metricsRows.map((row, i) => (
                    <option key={row.id ?? `${row.period_label}-${i}`} value={String(i)}>
                      {row.period_label || `Período ${i + 1}`}
                      {row.updated_at ? ` · atualizado ${new Date(row.updated_at).toLocaleDateString("pt-BR")}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          {metricsRows.length > 0 ? (
            <MarketingMetricsBoard mode="read" values={metricsReadValues} hideEmptyChannels />
          ) : null}
        </div>
      </PortalCard>

      <PortalCard>
        <div className="p-5">
          <p className="mb-3 text-sm font-bold text-text-1">Relatórios enviados pela equipe</p>
          <p className="mb-4 text-xs leading-relaxed text-text-3">
            Links e materiais que o administrador publica para o seu cadastro (PDF, planilhas, dashboards).
          </p>
          {published.loading && <p className="text-xs text-text-3">Carregando...</p>}
          {published.error && <p className="text-xs text-tag-amber">Não foi possível carregar os relatórios publicados.</p>}
          {!published.loading && !published.error && published.data.length === 0 && (
            <p className="text-xs leading-relaxed text-text-3">
              Ainda não há relatórios para você. Quando o time publicar algo em <strong>Admin → Relatórios</strong>, aparecerá aqui.
            </p>
          )}
          <div className="space-y-3">
            {published.data.map((r) => (
              <div key={r.id} className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
                <p className="text-sm font-semibold text-text-1">{r.title}</p>
                {r.period_label ? <p className="mt-0.5 text-[11px] text-text-3">{r.period_label}</p> : null}
                {r.description ? <p className="mt-2 text-xs leading-relaxed text-text-3">{r.description}</p> : null}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Abrir link <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </PortalCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PortalCard lift>
          <div className="p-5">
            <div className="mb-2 flex items-center gap-2 text-text-3">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Faturamento</span>
            </div>
            <p className="text-2xl font-bold text-text-1">{money(invoiceTotal)}</p>
            <p className="mt-1 text-[11px] text-text-3">{invoices.data.length} fatura(s)</p>
          </div>
        </PortalCard>
        <PortalCard lift>
          <div className="p-5">
            <div className="mb-2 flex items-center gap-2 text-text-3">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Em aberto</span>
            </div>
            <p className="text-2xl font-bold text-text-1">
              {money(pendingInvoices.reduce((a, i) => a + Number(i.amount || 0), 0))}
            </p>
            <p className="mt-1 text-[11px] text-text-3">{pendingInvoices.length} não paga(s)</p>
          </div>
        </PortalCard>
        <PortalCard lift>
          <div className="p-5">
            <div className="mb-2 flex items-center gap-2 text-text-3">
              <Kanban className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Produção</span>
            </div>
            <p className="text-2xl font-bold text-text-1">{tasks.data.length}</p>
            <p className="mt-1 text-[11px] text-text-3">
              {taskBuckets.solicitacoes} {STATUS_LABEL.solicitacoes.toLowerCase()} · {taskBuckets.em_andamento} em andamento ·{" "}
              {taskBuckets.revisao} revisão · {taskBuckets.entregue} entregues
            </p>
          </div>
        </PortalCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PortalCard>
          <div className="p-5">
            <p className="mb-3 text-sm font-bold text-text-1">Faturas</p>
            {invoices.loading && <p className="text-xs text-text-3">Carregando...</p>}
            {invoices.error && <p className="text-xs text-tag-amber">Erro ao carregar faturas.</p>}
            {!invoices.loading && !invoices.error && invoices.data.length === 0 && (
              <p className="text-xs leading-relaxed text-text-3">
                Nenhuma fatura para sua conta. O administrador deve criar uma cobrança em <strong>Financeiro</strong> e selecionar{" "}
                <strong>seu cliente</strong> ao emitir — assim ela aparece só para você no portal.
              </p>
            )}
            <div className="space-y-2">
              {invoices.data.map((inv) => (
                <div key={inv.id} className="rounded-lg border border-border/80 px-3 py-2">
                  <p className="text-xs font-semibold text-text-1">
                    {inv.invoice_code || `Fatura #${inv.id}`} · {inv.period}
                  </p>
                  <p className="text-[11px] text-text-3">
                    {money(Number(inv.amount || 0))} · {inv.status}
                    {inv.due_date ? ` · vence ${new Date(inv.due_date).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </PortalCard>

        <PortalCard>
          <div className="p-5">
            <p className="mb-3 text-sm font-bold text-text-1">Solicitações recentes</p>
            {tasks.loading && <p className="text-xs text-text-3">Carregando...</p>}
            {tasks.error && <p className="text-xs text-tag-amber">Erro ao carregar solicitações.</p>}
            {!tasks.loading && tasks.data.length === 0 && (
              <p className="text-xs text-text-3">Nenhuma solicitação. Abra uma em Produção.</p>
            )}
            <div className="max-h-[280px] space-y-2 overflow-y-auto">
              {tasks.data.slice(0, 12).map((t) => (
                <div key={t.id} className="rounded-lg border border-border/80 px-3 py-2">
                  <p className="line-clamp-2 text-xs font-semibold text-text-1">{t.title}</p>
                  <p className="text-[11px] capitalize text-text-3">{STATUS_LABEL[canonicalTaskStatus(t.status)] ?? t.status}</p>
                </div>
              ))}
            </div>
          </div>
        </PortalCard>
      </div>

      <PortalCard>
        <div className="flex gap-3 p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-2 text-xs leading-relaxed text-text-3">
            <p className="font-semibold text-text-1">Como disponibilizar conteúdo para cada cliente</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>
                Em <strong>Clientes</strong>, cadastre a empresa e use <strong>Liberar acesso</strong> com o e-mail do portal — o login fica vinculado ao
                cadastro automaticamente.
              </li>
              <li>
                Em <strong>Financeiro</strong>, ao criar cobrança, selecione o <strong>cliente</strong>. Cada fatura fica visível só para o portal desse
                cadastro (aba Relatórios e Financeiro).
              </li>
              <li>
                Em <strong>Produção</strong>, o cliente abre solicitações; a equipe administra o quadro no painel administrativo.
              </li>
              <li>
                Em <strong>Relatórios</strong> (admin), use <strong>Métricas de marketing</strong> para o quadro por período e/ou <strong>Publicar relatório</strong>{" "}
                para enviar link (URL) — ambos aparecem nesta aba no portal.
              </li>
            </ol>
          </div>
        </div>
      </PortalCard>
    </div>
  );
}
