import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ExternalLink, Info, Kanban, Loader2, Wallet } from "lucide-react";
import { normalizeClientReportFromApi, type ReportAttachmentMeta } from "@/lib/clientReportsApi";
import { apiRequest } from "@/lib/api";
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
  summary?: string | null;
  url: string;
  period_label?: string | null;
  client_id?: number;
  created_at?: string;
  attachments?: ReportAttachmentMeta[];
};

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || "application/octet-stream" });
}

function downloadAttachmentFromBase64(name: string, mime: string, b64: string) {
  const blob = base64ToBlob(cleanBase64(b64), mime);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function openAttachmentInNewTab(mime: string, b64: string) {
  const blob = base64ToBlob(cleanBase64(b64), mime);
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (w) {
    window.setTimeout(() => URL.revokeObjectURL(url), 600_000);
  } else {
    URL.revokeObjectURL(url);
  }
}

/** Aceita data URL, quebras de linha em base64 e string pura. */
function cleanBase64(raw: string): string {
  let s = raw.trim();
  const idx = s.indexOf("base64,");
  if (s.startsWith("data:") && idx >= 0) {
    s = s.slice(idx + 7);
  }
  return s.replace(/\s/g, "");
}

type AttachmentKind = "image" | "pdf" | "video" | "audio" | "text" | "other";

function attachmentKind(mime: string, filename: string): AttachmentKind {
  const m = mime.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf" || m.includes("pdf")) return "pdf";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("text/") || m === "application/json" || /\.(txt|csv|md|json)$/i.test(filename)) return "text";
  return "other";
}

/** Resposta pode ser `{ data: { ... } }` ou o próprio objeto no envelope. */
function extractClientReportRow(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== "object" || Array.isArray(res)) return null;
  const o = res as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  if (o.id != null || o.title != null || Array.isArray(o.attachments)) {
    return o;
  }
  return null;
}

function ClientReportAttachmentPreview({ att }: { att: ReportAttachmentMeta }) {
  const b64 = att.data_base64;
  const mime = att.mime_type || "application/octet-stream";
  const filename = att.filename;
  const kind = attachmentKind(mime, filename);

  const blobUrl = useMemo(() => {
    if (!b64) return null;
    try {
      return URL.createObjectURL(base64ToBlob(cleanBase64(b64), mime));
    } catch {
      return null;
    }
  }, [b64, mime]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!b64) {
    return <p className="text-xs text-tag-amber">Conteúdo do arquivo não veio na resposta. Peça para o admin reenviar.</p>;
  }
  if (!blobUrl) {
    return <p className="text-xs text-tag-amber">Não foi possível montar a pré-visualização.</p>;
  }

  if (kind === "image") {
    return <img src={blobUrl} alt={filename} className="max-h-72 w-full max-w-lg rounded-md border border-border/80 object-contain" />;
  }
  if (kind === "pdf") {
    return (
      <iframe
        title={filename}
        src={blobUrl}
        className="min-h-[min(70vh,560px)] w-full max-w-3xl rounded-md border border-border bg-background"
      />
    );
  }
  if (kind === "video") {
    return <video src={blobUrl} controls className="max-h-72 w-full max-w-lg rounded-md border border-border/80 bg-black/5" />;
  }
  if (kind === "audio") {
    return <audio src={blobUrl} controls className="w-full max-w-lg" />;
  }
  if (kind === "text") {
    return (
      <iframe
        title={filename}
        src={blobUrl}
        className="h-52 w-full max-w-3xl rounded-md border border-border bg-muted/20"
      />
    );
  }
  return (
    <p className="text-xs leading-relaxed text-text-3">
      Não há pré-visualização embutida para este tipo de arquivo. Use <strong>Baixar</strong> ou <strong>Abrir em nova aba</strong>.
    </p>
  );
}

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

  const [reportDetailById, setReportDetailById] = useState<Record<number, PublishedReport>>({});
  const [detailLoading, setDetailLoading] = useState<Record<number, boolean>>({});
  const [detailError, setDetailError] = useState<Record<number, string | undefined>>({});
  const detailInflightRef = useRef(new Set<number>());

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
  const linkedClient = clientMe.data;
  const showLinkHint = isCliente && !clientMe.loading && linkedClient == null && !clientMe.error;

  const publishedNormalized = useMemo(() => {
    const list = Array.isArray(published.data) ? published.data : [];
    return list
      .filter((row): row is Record<string, unknown> => row != null && typeof row === "object" && !Array.isArray(row))
      .map((row) => {
        const n = normalizeClientReportFromApi(row);
        const out: PublishedReport = {
          id: Number(n.id) || 0,
          title: n.title,
          url: n.url,
          description: n.description || null,
          summary: n.summary,
          period_label: n.period_label,
          client_id: Number(n.client_id) || undefined,
          created_at: n.created_at,
          attachments: n.attachments,
        };
        return out;
      });
  }, [published.data]);

  const publishedRows = useMemo(() => {
    if (!linkedClient?.id) return publishedNormalized;
    return publishedNormalized.filter((r) => r.client_id == null || r.client_id === linkedClient.id);
  }, [publishedNormalized, linkedClient?.id]);

  const loadReportDetail = useCallback(
    async (id: number) => {
      if (reportDetailById[id]) return;
      if (detailInflightRef.current.has(id)) return;
      detailInflightRef.current.add(id);
      setDetailLoading((p) => ({ ...p, [id]: true }));
      setDetailError((p) => ({ ...p, [id]: undefined }));
      try {
        const res = await apiRequest<unknown>(`/api/client-reports/${id}`);
        const row = extractClientReportRow(res);
        const n = row ? normalizeClientReportFromApi(row) : null;
        setReportDetailById((prev) => ({
          ...prev,
          [id]: {
            id: Number(n?.id ?? id) || 0,
            title: n?.title ?? "",
            url: n?.url ?? "",
            description: n?.description ?? null,
            summary: n?.summary ?? null,
            period_label: n?.period_label ?? null,
            client_id: n?.client_id != null ? Number(n.client_id) : undefined,
            created_at: n?.created_at,
            attachments: n?.attachments ?? [],
          },
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Não foi possível carregar os arquivos.";
        setDetailError((p) => ({ ...p, [id]: msg }));
      } finally {
        detailInflightRef.current.delete(id);
        setDetailLoading((p) => ({ ...p, [id]: false }));
      }
    },
    [reportDetailById],
  );

  useEffect(() => {
    if (published.loading) return;
    for (const r of publishedRows) {
      void loadReportDetail(r.id);
    }
  }, [published.loading, publishedRows, loadReportDetail]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Resumo financeiro e de solicitações com os dados vinculados à sua conta."
      />

      {clientMe.error && (
        <p className="rounded-md border border-tag-amber/20 bg-tag-amber-bg px-3 py-2 text-xs text-tag-amber">
          Não foi possível verificar o vínculo com o cadastro de cliente. {clientMe.error}
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
          <p className="mb-3 text-sm font-bold text-text-1">Materiais da equipe</p>
          <p className="mb-4 text-xs leading-relaxed text-text-3">
            Documentos e imagens enviados pelo administrador para o seu cadastro. Os arquivos são carregados automaticamente; você pode visualizar na página ou baixar.
          </p>
          {published.loading && <p className="text-xs text-text-3">Carregando...</p>}
          {published.error && <p className="text-xs text-tag-amber">Não foi possível carregar os relatórios publicados. {published.error}</p>}
          {!published.loading && !published.error && publishedRows.length === 0 && (
            <p className="text-xs leading-relaxed text-text-3">
              Ainda não há materiais para você. Quando o time enviar algo em <strong>Admin → Relatórios</strong>, aparecerá aqui.
            </p>
          )}
          <div className="space-y-3">
            {publishedRows.map((r) => {
              const detail = reportDetailById[r.id];
              const hasFiles = (detail?.attachments?.length ?? r.attachments?.length ?? 0) > 0;
              const metaCount = r.attachments?.length ?? 0;
              const loading = detailLoading[r.id] === true;
              const err = detailError[r.id];
              return (
                <div key={r.id} className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
                  <p className="text-sm font-semibold text-text-1">{r.title}</p>
                  {r.period_label ? <p className="mt-0.5 text-[11px] text-text-3">{r.period_label}</p> : null}
                  {(r.description || r.summary) ? (
                    <p className="mt-2 text-xs leading-relaxed text-text-3">{r.description || r.summary}</p>
                  ) : null}
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      Link externo <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {loading && !detail ? (
                    <p className="mt-3 flex items-center gap-2 text-xs text-text-3">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      Carregando arquivos…
                    </p>
                  ) : null}
                  {err ? (
                    <div className="mt-3 space-y-2 rounded-md border border-tag-amber/30 bg-tag-amber-bg/30 px-3 py-2 text-xs text-text-2">
                      <p className="text-tag-amber">{err}</p>
                      <button
                        type="button"
                        onClick={() => void loadReportDetail(r.id)}
                        className="rounded-md border border-primary/40 bg-background px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : null}
                  {!loading && !err && metaCount > 0 && !detail ? (
                    <p className="mt-2 text-[11px] text-text-3">{metaCount} arquivo(s) anexado(s).</p>
                  ) : null}
                  {detail?.attachments && detail.attachments.length > 0 ? (
                    <div className="mt-3 space-y-4">
                      {detail.attachments.map((att, idx) => {
                        const b64 = att.data_base64;
                        if (!b64) {
                          return (
                            <div key={`${att.filename}-${idx}`} className="rounded-lg border border-border/80 bg-card/40 p-3">
                              <p className="text-[11px] font-medium text-text-2">{att.filename}</p>
                              <p className="mt-1 text-xs text-tag-amber">Binário indisponível nesta resposta.</p>
                            </div>
                          );
                        }
                        const mime = att.mime_type || "application/octet-stream";
                        return (
                          <div key={`${att.filename}-${idx}`} className="rounded-lg border border-border/80 bg-card/40 p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-text-2">{att.filename}</p>
                              {att.size > 0 ? (
                                <span className="text-[10px] text-text-3">{(att.size / 1024).toFixed(0)} KB</span>
                              ) : null}
                            </div>
                            <ClientReportAttachmentPreview att={att} />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => downloadAttachmentFromBase64(att.filename, mime, b64)}
                                className="rounded-lg border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                onClick={() => openAttachmentInNewTab(mime, b64)}
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-text-2 hover:bg-muted/60"
                              >
                                Abrir em nova aba
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {detail && !hasFiles && !r.url ? (
                    <p className="mt-2 text-[11px] text-text-3">Nenhum arquivo neste envio.</p>
                  ) : null}
                </div>
              );
            })}
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
                Em <strong>Relatórios</strong> (admin), use <strong>Enviar materiais</strong> para anexar arquivos ao cliente — aparecem nesta aba no portal.
              </li>
            </ol>
          </div>
        </div>
      </PortalCard>
    </div>
  );
}
