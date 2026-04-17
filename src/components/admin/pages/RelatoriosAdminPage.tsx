import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, FileUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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

const REPORTS_STALE_MS = 30 * 60_000;
const REPORTS_GC_MS = 24 * 60 * 60_000;

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
    setSaving(true);
    try {
      const attachments = createFiles.length > 0 ? await filesToAttachmentPayload(createFiles) : [];
      if (attachments.length === 0) {
        toast({
          title: "Inclua arquivos",
          description: "Envie pelo menos um arquivo (PDF, imagem, etc.).",
          variant: "destructive",
        });
        return;
      }
      await apiRequest("/api/client-reports", {
        method: "POST",
        body: {
          client_id: clientIdForPayload(form.client_id),
          title: form.title.trim(),
          summary: buildClientReportSummaryForApi(form.period_label, form.description),
          attachments,
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
      period_label: r.period_label ?? "",
    });
    setEditFiles([]);
    setRemoveAllAttachments(false);
    setEditOpen(true);
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !form.title.trim()) return;
    if (removeAllAttachments && editFiles.length === 0 && !(editing.url && editing.url.trim() !== "")) {
      toast({
        title: "Inclua novos arquivos",
        description:
          "Para remover todos os anexos, envie pelo menos um arquivo novo ou mantenha um link externo já cadastrado neste envio.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        summary: buildClientReportSummaryForApi(form.period_label, form.description),
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
          Envio de arquivos (PDF, imagens, etc.) por cliente. No portal, o cliente abre os materiais na mesma aba.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Materiais para o cliente</CardTitle>
            <p className="mt-1 text-xs text-text-3">
              Escolha o cliente e envie PDFs, imagens ou outros arquivos (convertidos em base64 na API; o servidor grava em formato binário no MongoDB).
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
                    Remover todos os anexos atuais (obrigatório enviar arquivos novos abaixo, salvo envios que já tenham link externo)
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
