import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  emptyMarketingMetricsValues,
  MarketingMetricsBoard,
  metricsFromApiRow,
  metricsValuesToPayload,
  type MarketingMetricsApiRow,
  type MarketingMetricsValues,
} from "@/components/marketing/MarketingMetricsBoard";
import { apiRequest } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useToast } from "@/hooks/use-toast";

const REPORTS_QUERY_KEY = ["api", "/api/client-reports"] as const;
const METRICS_QUERY_KEY = ["api", "/api/marketing-metrics"] as const;

function defaultPeriodLabel(): string {
  const d = new Date();
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[d.getMonth()]}/${d.getFullYear()}`;
}

/** ID numérico do select; API pode mandar id como string. */
function parseClientIdFromSelect(raw: string): number | null {
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

type ClientReportRow = {
  id: number;
  client_id: number;
  title: string;
  description?: string | null;
  url: string;
  period_label?: string | null;
  client_name?: string;
  client_empresa?: string;
  created_at?: string;
};
type ClientRow = { id: number; name: string; empresa: string };

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
  const clientRows = useMemo(
    () => (Array.isArray(clients.data) ? clients.data : []),
    [clients.data],
  );

  /* Garante refetch ao abrir a tela (cache antigo ou prefetch sem token às vezes deixa lista vazia). */
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["api", "/api/clients"] });
  }, [queryClient]);

  const tasks = useApiData<{ id: number; status: string }[]>("/api/tasks", []);
  const invoices = useApiData<{ id: number; amount: number }[]>("/api/invoices", []);
  const reports = useApiData<ClientReportRow[]>("/api/client-reports", []);

  const totalFaturamento = invoices.data.reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const [metricsClientId, setMetricsClientId] = useState("");
  const [metricsPeriod, setMetricsPeriod] = useState(() => defaultPeriodLabel());
  const [metricsForm, setMetricsForm] = useState<MarketingMetricsValues>(() => emptyMarketingMetricsValues());
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsSaving, setMetricsSaving] = useState(false);

  const loadMarketingMetrics = async () => {
    const clientId = parseClientIdFromSelect(metricsClientId);
    const period = metricsPeriod.trim();
    if (clientId === null) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
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
      toast({
        title: "Erro ao carregar métricas",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setMetricsLoading(false);
    }
  };

  const saveMarketingMetrics = async (e: FormEvent) => {
    e.preventDefault();
    const clientId = parseClientIdFromSelect(metricsClientId);
    const period = metricsPeriod.trim();
    if (clientId === null) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
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
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setMetricsSaving(false);
    }
  };

  const [openCreate, setOpenCreate] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ClientReportRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const refreshReports = async () => {
    await queryClient.invalidateQueries({ queryKey: [...REPORTS_QUERY_KEY] });
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.client_id || !form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      await apiRequest("/api/client-reports", {
        method: "POST",
        body: {
          client_id: Number(form.client_id),
          title: form.title.trim(),
          description: form.description.trim() || null,
          url: form.url.trim(),
          period_label: form.period_label.trim() || null,
        },
      });
      toast({
        title: "Relatório publicado",
        description: "O cliente verá este item na aba Relatórios do portal.",
      });
      setOpenCreate(false);
      setForm(emptyForm);
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

  const startEdit = (r: ClientReportRow) => {
    setEditing(r);
    setForm({
      client_id: String(r.client_id),
      title: r.title,
      description: r.description ?? "",
      url: r.url,
      period_label: r.period_label ?? "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      await apiRequest(`/api/client-reports/${editing.id}`, {
        method: "PATCH",
        body: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          url: form.url.trim(),
          period_label: form.period_label.trim() || null,
        },
      });
      toast({ title: "Relatório atualizado" });
      setEditOpen(false);
      setEditing(null);
      setForm(emptyForm);
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

  const handleDelete = async (id: number) => {
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
          Quadro de performance (Meta, Google, orgânico, outros) por período e publicação de links por cliente — o portal mostra tudo na aba Relatórios.
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
                  {clientRows.map((c) => {
                    const oid = typeof c.id === "number" ? c.id : Number.parseInt(String(c.id), 10);
                    if (!Number.isFinite(oid) || oid <= 0) return null;
                    return (
                      <option key={oid} value={String(oid)}>
                        {c.empresa} — {c.name}
                      </option>
                    );
                  })}
                </select>
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
            <CardTitle className="text-base">Relatórios no portal do cliente</CardTitle>
            <p className="mt-1 text-xs text-text-3">
              Use link para PDF (Drive, Dropbox), planilha ou dashboard. O cliente vê na aba Relatórios.
            </p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs shrink-0" type="button" onClick={() => setOpenCreate(true)}>
            <Plus size={14} /> Publicar relatório
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.error && <p className="text-xs text-tag-amber">Não foi possível carregar relatórios.</p>}
          {reports.loading && <p className="text-xs text-text-3">Carregando…</p>}
          {!reports.loading && reports.data.length === 0 && (
            <p className="text-sm text-text-3">Nenhum relatório publicado. Clique em &quot;Publicar relatório&quot;.</p>
          )}
          {reports.data.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-text-1">{r.title}</p>
                <p className="text-xs text-text-3">
                  {(r.client_empresa || r.client_name) && (
                    <span className="font-medium text-text-2">{r.client_empresa || r.client_name}</span>
                  )}
                  {r.period_label ? ` · ${r.period_label}` : ""}
                </p>
                {r.description ? <p className="text-xs leading-relaxed text-text-3">{r.description}</p> : null}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Abrir link <ExternalLink size={12} />
                </a>
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
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Publicar relatório</DialogTitle>
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
                <Label className="text-xs">Link (URL)</Label>
                <Input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://..."
                  required
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
                  Publicar
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
            if (!o) setEditing(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar relatório</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleUpdate}>
              <p className="text-xs text-text-3">
                Cliente: <span className="font-medium text-text-2">{editing.client_empresa || editing.client_name || `#${editing.client_id}`}</span>
              </p>
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
                <Label className="text-xs">Link</Label>
                <Input type="url" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} required />
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
