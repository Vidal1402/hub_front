import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, FileUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  emptyMarketingMetricsValues,
  MarketingMetricsBoard,
  metricsFromApiRow,
  metricsValuesToPayload,
  type MarketingMetricsApiRow,
  type MarketingMetricsValues,
} from "@/components/marketing/MarketingMetricsBoard";
import { apiRequest } from "@/lib/api";
import {
  buildClientReportSummaryForApi,
  normalizeClientReportFromApi,
  type NormalizedClientReport,
} from "@/lib/clientReportsApi";
import { useApiData } from "@/hooks/useApiData";
import { useToast } from "@/hooks/use-toast";

/** Lista de relatórios publicados (bloco inferior da página). O select "Selecione" usa só GET /api/clients. */
const REPORTS_QUERY_KEY = ["api", "/api/client-reports"] as const;
const METRICS_QUERY_KEY = ["api", "/api/marketing-metrics"] as const;

const REPORTS_STALE_MS = 30 * 60_000;
const REPORTS_GC_MS = 24 * 60 * 60_000;

function defaultPeriodLabel(): string {
  const d = new Date();
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[d.getMonth()]}/${d.getFullYear()}`;
}

/** Para métricas, backend atual espera client_id numérico. */
function parseNumericClientId(raw: string): number | null {
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

type ApiId = string | number;

/** Limite alinhado ao backend (Railway): 3 MB/arquivo, 10 arquivos. */
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;

type AttachmentPayload = { filename: string; mime_type: string; data_base64: string };

function readFileAsBase64Payload(file: File): Promise<AttachmentPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const idx = dataUrl.indexOf("base64,");
      const b64 = idx >= 0 ? dataUrl.slice(idx + 7) : "";
      if (!b64) {
        reject(new Error(`Não foi possível ler o arquivo: ${file.name}`));
        return;
      }
      resolve({
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        data_base64: b64,
      });
    };
    reader.onerror = () => reject(new Error(`Falha ao ler: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function filesToAttachmentPayload(files: File[]): Promise<AttachmentPayload[]> {
  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`Máximo de ${MAX_ATTACHMENTS} arquivos por envio.`);
  }
  const out: AttachmentPayload[] = [];
  for (const f of files) {
    if (f.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Arquivo muito grande (máx. 3 MB): ${f.name}`);
    }
    out.push(await readFileAsBase64Payload(f));
  }
  return out;
}

function clientLabelForReport(r: NormalizedClientReport, rows: ClientRow[]): string {
  const idStr = String(r.client_id);
  const match = rows.find((c) => c.id === idStr || String(c.numericId) === idStr);
  if (match) return `${match.empresa} — ${match.name}`;
  return `Cliente #${idStr}`;
}
type ClientRow = { id: string; numericId: number | null; name: string; empresa: string };

function idToStringLoose(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "bigint") {
    return String(v).trim();
  }
  if (typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const oid = o.$oid;
    if (typeof oid === "string" && oid.trim() !== "") return oid.trim();
  }
  return "";
}

function clientIdForPayload(raw: string): string | number {
  const t = raw.trim();
  if (/^\d+$/.test(t)) return Number.parseInt(t, 10);
  return t;
}

/** GET /api/clients — aceita `id` numérico, string, `_id` e `{ _id: { $oid } }`. */
function rowsForClientSelect(raw: unknown): ClientRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ClientRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const r = item as Record<string, unknown>;
    const id =
      idToStringLoose(r.id) ||
      idToStringLoose(r._id) ||
      idToStringLoose(r.ID) ||
      idToStringLoose(r.client_id);
    if (id === "") continue;
    const numericIdCandidates = [
      idToStringLoose(r.client_id),
      idToStringLoose(r.id),
      idToStringLoose(r.ID),
      idToStringLoose(r.clientId),
      idToStringLoose(r.legacy_id),
      idToStringLoose(r.legacyId),
    ];
    const numericId = numericIdCandidates.reduce<number | null>((found, candidate) => {
      if (found !== null) return found;
      return parseNumericClientId(candidate);
    }, null);
    const name = String(r.name ?? r.nome ?? "").trim();
    const empresa = String(r.empresa ?? r.company ?? "").trim();
    out.push({ id, numericId, name, empresa: empresa || name || `Cliente #${id}` });
  }
  return out;
}

const emptyForm = {
  client_id: "",
  title: "",
  description: "",
  url: "",
  period_label: "",
};

export function RelatoriosAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const clients = useApiData<ClientRow[]>("/api/clients", []);
  const clientRows = useMemo(() => rowsForClientSelect(clients.data as unknown), [clients.data]);

  /* Garante refetch ao abrir a tela (cache antigo ou prefetch sem token às vezes deixa lista vazia). */
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["api", "/api/clients"] });
  }, [queryClient]);

  const tasks = useApiData<{ id: number; status: string }[]>("/api/tasks", []);
  const invoices = useApiData<{ id: number; amount: number }[]>("/api/invoices", []);
  const reportsQuery = useQuery({
    queryKey: REPORTS_QUERY_KEY,
    queryFn: async (): Promise<NormalizedClientReport[]> => {
      try {
        const res = await apiRequest<{ data?: unknown[] }>("/api/client-reports");
        const list = Array.isArray(res.data) ? res.data : [];
        return list
          .filter((row): row is Record<string, unknown> => row != null && typeof row === "object" && !Array.isArray(row))
          .map((row) => normalizeClientReportFromApi(row));
      } catch {
        return [];
      }
    },
    staleTime: REPORTS_STALE_MS,
    gcTime: REPORTS_GC_MS,
    retry: 0,
    refetchOnWindowFocus: false,
  });
  const reportsList = reportsQuery.data ?? [];
  const reportsLoading = reportsQuery.isPending;

  const totalFaturamento = invoices.data.reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const [metricsClientId, setMetricsClientId] = useState("");
  const [metricsManualClientId, setMetricsManualClientId] = useState("");
  const [metricsPeriod, setMetricsPeriod] = useState(() => defaultPeriodLabel());
  const [metricsForm, setMetricsForm] = useState<MarketingMetricsValues>(() => emptyMarketingMetricsValues());
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsSaving, setMetricsSaving] = useState(false);

  const loadMarketingMetrics = async () => {
    const clientId =
      parseNumericClientId(metricsManualClientId) ??
      parseNumericClientId(metricsClientId);
    const period = metricsPeriod.trim();
    if (clientId === null) {
      toast({
        title: metricsClientId || metricsManualClientId ? "ID do cliente inválido para métricas" : "Selecione um cliente",
        description: metricsClientId || metricsManualClientId ? "Esta API de métricas aceita client_id numérico." : undefined,
        variant: "destructive",
      });
      return;
    }
    if (period === "") {
      toast({ title: "Informe o período", description: "Ex.: Abr/2026", variant: "destructive" });
      return;
    }
    setMetricsLoading(true);
    try {
      const q = new URLSearchParams({
        client_id: String(clientId),
        period,
      });
      const res = await apiRequest<{ data: MarketingMetricsApiRow | null }>(`/api/marketing-metrics?${q.toString()}`);
      setMetricsForm(metricsFromApiRow(res.data));
      toast({ title: res.data ? "Métricas carregadas" : "Novo período", description: res.data ? undefined : "Preencha e salve para criar o registro." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast({
        title: "Erro ao carregar métricas",
        description: /Rota n[oã]o encontrada|HTTP 404/i.test(msg)
          ? "Endpoint /api/marketing-metrics não encontrado no backend ativo."
          : msg || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setMetricsLoading(false);
    }
  };

  const saveMarketingMetrics = async (e: FormEvent) => {
    e.preventDefault();
    const clientId =
      parseNumericClientId(metricsManualClientId) ??
      parseNumericClientId(metricsClientId);
    const period = metricsPeriod.trim();
    if (clientId === null) {
      toast({
        title: metricsClientId || metricsManualClientId ? "ID do cliente inválido para métricas" : "Selecione um cliente",
        description: metricsClientId || metricsManualClientId ? "Esta API de métricas aceita client_id numérico." : undefined,
        variant: "destructive",
      });
      return;
    }
    if (period === "") {
      toast({ title: "Informe o período", description: "Ex.: Abr/2026", variant: "destructive" });
      return;
    }
    setMetricsSaving(true);
    try {
      await apiRequest("/api/marketing-metrics", {
        method: "POST",
        body: metricsValuesToPayload(clientId, period, metricsForm),
      });
      toast({ title: "Métricas salvas", description: "O cliente verá na aba Relatórios do portal." });
      await queryClient.invalidateQueries({ queryKey: [...METRICS_QUERY_KEY] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast({
        title: "Erro ao salvar",
        description: /Rota n[oã]o encontrada|HTTP 404/i.test(msg)
          ? "Endpoint /api/marketing-metrics não encontrado no backend ativo."
          : msg || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setMetricsSaving(false);
    }
  };

  const [openCreate, setOpenCreate] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<NormalizedClientReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [removeAllAttachments, setRemoveAllAttachments] = useState(false);

  const refreshReports = async () => {
    await queryClient.invalidateQueries({ queryKey: [...REPORTS_QUERY_KEY] });
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.client_id || !form.title.trim()) return;
    const url = form.url.trim();
    setSaving(true);
    try {
      const attachments = createFiles.length > 0 ? await filesToAttachmentPayload(createFiles) : [];
      if (url === "" && attachments.length === 0) {
        toast({
          title: "Inclua arquivos ou um link",
          description: "Envie pelo menos um arquivo ou preencha uma URL externa.",
          variant: "destructive",
        });
        return;
      }
      await apiRequest("/api/client-reports", {
        method: "POST",
        body: {
          client_id: clientIdForPayload(form.client_id),
          title: form.title.trim(),
          ...(url !== "" ? { url } : {}),
          summary: buildClientReportSummaryForApi(form.period_label, form.description),
          ...(attachments.length > 0 ? { attachments } : {}),
        },
      });
      toast({
        title: "Materiais enviados",
        description: "O cliente verá na aba Relatórios do portal.",
      });
      setOpenCreate(false);
      setForm(emptyForm);
      setCreateFiles([]);
      await refreshReports();
    } catch (err) {
      toast({
        title: "Erro ao publicar",
        description: err instanceof Error ? err.message : "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: NormalizedClientReport) => {
    setEditing(r);
    setForm({
      client_id: String(r.client_id),
      title: r.title,
      description: r.description ?? "",
      url: r.url ?? "",
      period_label: r.period_label ?? "",
    });
    setEditFiles([]);
    setRemoveAllAttachments(false);
    setEditOpen(true);
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !form.title.trim()) return;
    const url = form.url.trim();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        summary: buildClientReportSummaryForApi(form.period_label, form.description),
        url: url === "" ? null : url,
      };
      if (editFiles.length > 0) {
        body.attachments = await filesToAttachmentPayload(editFiles);
      } else if (removeAllAttachments) {
        body.attachments = [];
      }
      await apiRequest(`/api/client-reports/${editing.id}`, {
        method: "PATCH",
        body,
      });
      toast({ title: "Relatório atualizado" });
      setEditOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setEditFiles([]);
      setRemoveAllAttachments(false);
      await refreshReports();
    } catch (err) {
      toast({
        title: "Erro ao atualizar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: ApiId) => {
    if (!window.confirm("Remover este relatório do portal deste cliente?")) return;
    try {
      await apiRequest(`/api/client-reports/${id}`, { method: "DELETE" });
      toast({ title: "Relatório removido" });
      await refreshReports();
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-1">Relatórios</h1>
        <p className="text-sm text-text-3">
          Métricas de marketing por período e envio de arquivos (PDF, imagens, etc.) por cliente. No portal, o cliente abre os materiais na mesma aba.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métricas de marketing por cliente</CardTitle>
          <p className="mt-1 text-xs text-text-3">
            Os quatro canais são opcionais: preencha só o que fizer sentido neste período (o restante fica zerado). Não é preciso usar &quot;Carregar&quot;
            antes de salvar — esse botão só traz o que já estava salvo naquele período. No portal, o cliente vê só os canais com dados. Período ex.: Abr/2026.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-4"
            onSubmit={saveMarketingMetrics}
            noValidate
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[200px] flex-1 space-y-1">
                <Label className="text-xs">Cliente</Label>
                {clients.error ? (
                  <p className="text-[11px] text-tag-amber">Não foi possível carregar a lista de clientes. Atualize a página ou verifique o login.</p>
                ) : null}
                {clients.loading && clientRows.length === 0 ? (
                  <p className="text-[11px] text-text-3">Carregando clientes…</p>
                ) : null}
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  name="metrics_client_id"
                  autoComplete="off"
                  value={metricsClientId}
                  onChange={(e) => setMetricsClientId(e.target.value)}
                  disabled={clients.loading && clientRows.length === 0}
                >
                  <option value="">Selecione</option>
                  {clientRows.map((c) => (
                    <option key={c.id} value={c.numericId != null ? String(c.numericId) : ""} disabled={c.numericId == null}>
                      {c.empresa} — {c.name}
                      {c.numericId == null ? " (sem ID numérico)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full min-w-[140px] sm:w-40 space-y-1">
                <Label className="text-xs">ID numérico (manual)</Label>
                <Input
                  name="metrics_manual_client_id"
                  autoComplete="off"
                  value={metricsManualClientId}
                  onChange={(e) => setMetricsManualClientId(e.target.value)}
                  placeholder="Ex.: 12"
                />
              </div>
              <div className="w-full min-w-[140px] sm:w-40 space-y-1">
                <Label className="text-xs">Período</Label>
                <Input
                  name="metrics_period"
                  autoComplete="off"
                  value={metricsPeriod}
                  onChange={(e) => setMetricsPeriod(e.target.value)}
                  placeholder={defaultPeriodLabel()}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={metricsLoading}
                className="w-full sm:w-auto"
                onClick={() => void loadMarketingMetrics()}
              >
                {metricsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Carregar
              </Button>
            </div>

            <MarketingMetricsBoard mode="edit" values={metricsForm} onChange={setMetricsForm} />
            <div className="flex justify-end">
              <Button type="submit" disabled={metricsSaving}>
                {metricsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar métricas
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{clientRows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Faturamento (org.)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              R$ {totalFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Materiais para o cliente</CardTitle>
            <p className="mt-1 text-xs text-text-3">
              Escolha o cliente e envie PDFs, imagens ou outros arquivos (convertidos em base64 na API; o servidor grava em formato binário no MongoDB). Opcionalmente inclua um link externo.
            </p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs shrink-0" type="button" onClick={() => setOpenCreate(true)}>
            <Plus size={14} /> Enviar materiais
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {reportsLoading && <p className="text-xs text-text-3">Carregando…</p>}
          {!reportsLoading && reportsList.length === 0 && (
            <p className="text-sm text-text-3">Nenhum envio ainda. Use &quot;Enviar materiais&quot;.</p>
          )}
          {reportsList.map((r) => (
            <div
              key={String(r.id)}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-text-1">{r.title}</p>
                <p className="text-xs text-text-3">
                  <span className="font-medium text-text-2">{clientLabelForReport(r, clientRows)}</span>
                  {r.period_label ? ` · ${r.period_label}` : ""}
                </p>
                {r.description ? <p className="text-xs leading-relaxed text-text-3">{r.description}</p> : null}
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Link externo <ExternalLink size={12} />
                  </a>
                ) : null}
                {r.attachments && r.attachments.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-text-3">
                    {r.attachments.map((a, i) => (
                      <li key={`${a.filename}-${i}`} className="flex items-center gap-1">
                        <FileUp className="h-3 w-3 shrink-0 opacity-70" />
                        <span className="truncate">{a.filename}</span>
                        {a.size > 0 ? <span className="text-text-3">({(a.size / 1024).toFixed(0)} KB)</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => startEdit(r)}>
                  <Pencil size={12} /> Editar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                  onClick={() => void handleDelete(r.id)}
                >
                  <Trash2 size={12} /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {openCreate && (
        <Dialog
          open={openCreate}
          onOpenChange={(o) => {
            setOpenCreate(o);
            if (!o) setCreateFiles([]);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar materiais ao cliente</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleCreate}>
              <div className="space-y-1">
                <Label className="text-xs">Cliente</Label>
                {clients.error ? (
                  <p className="text-[11px] text-tag-amber">Não foi possível carregar clientes.</p>
                ) : null}
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.client_id}
                  onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                  required
                  disabled={clients.loading && clientRows.length === 0}
                >
                  <option value="">Selecione</option>
                  {clientRows.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.empresa} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex.: Relatório de performance — março"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Período (opcional)</Label>
                <Input
                  value={form.period_label}
                  onChange={(e) => setForm((p) => ({ ...p, period_label: e.target.value }))}
                  placeholder="Ex.: Mar/2026"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Arquivos (até {MAX_ATTACHMENTS}, máx. 3 MB cada)</Label>
                <Input
                  type="file"
                  multiple
                  className="w-full cursor-pointer text-sm"
                  onChange={(e) => setCreateFiles(Array.from(e.target.files ?? []))}
                />
                {createFiles.length > 0 ? (
                  <p className="text-[11px] text-text-3">{createFiles.length} arquivo(s) selecionado(s).</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Link externo (opcional)</Label>
                <Input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Resumo para o cliente"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {editOpen && editing && (
        <Dialog
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o);
            if (!o) {
              setEditing(null);
              setEditFiles([]);
              setRemoveAllAttachments(false);
            }
          }}
        >
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar envio</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleUpdate}>
              <p className="text-xs text-text-3">
                Cliente:{" "}
                <span className="font-medium text-text-2">{clientLabelForReport(editing, clientRows)}</span>
              </p>
              {editing.attachments && editing.attachments.length > 0 ? (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-text-3">
                  <p className="font-medium text-text-2">Anexos atuais</p>
                  <ul className="mt-1 list-inside list-disc">
                    {editing.attachments.map((a) => (
                      <li key={a.filename}>{a.filename}</li>
                    ))}
                  </ul>
                  <label className="mt-2 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={removeAllAttachments}
                      onChange={(e) => {
                        setRemoveAllAttachments(e.target.checked);
                        if (e.target.checked) setEditFiles([]);
                      }}
                    />
                    Remover todos os anexos (é obrigatório manter um link externo se remover os arquivos)
                  </label>
                </div>
              ) : null}
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Período (opcional)</Label>
                <Input value={form.period_label} onChange={(e) => setForm((p) => ({ ...p, period_label: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Substituir anexos (opcional)</Label>
                <Input
                  type="file"
                  multiple
                  disabled={removeAllAttachments}
                  className="w-full cursor-pointer text-sm disabled:opacity-50"
                  onChange={(e) => setEditFiles(Array.from(e.target.files ?? []))}
                />
                {editFiles.length > 0 ? (
                  <p className="text-[11px] text-text-3">{editFiles.length} arquivo(s) — substituem os anexos atuais.</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Link externo (opcional)</Label>
                <Input type="url" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
