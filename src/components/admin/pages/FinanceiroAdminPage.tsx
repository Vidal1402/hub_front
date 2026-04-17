import { FormEvent, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useToast } from "@/hooks/use-toast";

type InvoiceRow = {
  id: number;
  invoice_code?: string;
  period: string;
  amount: number;
  due_date: string;
  status: string;
  method: string;
  client_id?: number | null;
};
type ClientRow = { id: number; name: string; empresa: string };

export function FinanceiroAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, loading, error } = useApiData<InvoiceRow[]>("/api/invoices", []);
  const clientsQuery = useApiData<ClientRow[]>("/api/clients", []);
  const clients = useMemo(
    () => (Array.isArray(clientsQuery.data) ? clientsQuery.data : []),
    [clientsQuery.data],
  );
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    client_id: "",
    period: "",
    amount: "",
    due_date: "",
    method: "Pix",
    status: "Pendente",
  });

  const clientNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of clients) {
      m.set(c.id, c.empresa || c.name);
    }
    return m;
  }, [clients]);

  const clientsLoadError = clientsQuery.error;
  const clientsLoading = clientsQuery.loading && clients.length === 0;

  const refreshInvoices = async () => {
    await queryClient.invalidateQueries({ queryKey: ["api", "/api/invoices"] });
  };

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const patchInvoiceStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await apiRequest(`/api/invoices/${id}`, {
        method: "PATCH",
        body: { status },
      });
      toast({ title: "Status atualizado", description: "A cobrança foi atualizada." });
      await refreshInvoices();
    } catch (err) {
      toast({
        title: "Erro ao atualizar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!newInvoice.client_id || !newInvoice.period || !newInvoice.amount || !newInvoice.due_date) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione o cliente para vincular a cobrança ao portal dele.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/api/invoices", {
        method: "POST",
        body: {
          client_id: Number(newInvoice.client_id),
          period: newInvoice.period,
          amount: Number(newInvoice.amount),
          due_date: newInvoice.due_date,
          method: newInvoice.method,
          status: newInvoice.status,
        },
      });
      toast({ title: "Cobrança criada", description: "Nova fatura registrada com sucesso." });
      setOpenCreate(false);
      setNewInvoice({
        client_id: "",
        period: "",
        amount: "",
        due_date: "",
        method: "Pix",
        status: "Pendente",
      });
      await refreshInvoices();
    } catch (err) {
      toast({
        title: "Erro ao criar cobrança",
        description: err instanceof Error ? err.message : "Não foi possível criar a cobrança.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalFaturado = data.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-1">Financeiro</h1>
          <p className="text-sm text-text-3">Cada cobrança deve ser vinculada a um cliente para aparecer no portal dele (Relatórios e Financeiro).</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setOpenCreate(true)}>
          <Plus size={14} /> Nova Cobrança
        </Button>
      </div>
      {error && <p className="text-xs text-tag-amber">Não foi possível carregar faturas.</p>}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-text-3">Total faturado</p>
          <p className="text-xl font-bold text-text-1">R$ {totalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          {loading && <p className="text-xs text-text-3 mt-2">Carregando...</p>}
          {!loading && data.length === 0 && <p className="text-xs text-text-3 mt-2">Sem faturas retornadas.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Faturas recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.map((inv) => (
            <div key={inv.id} className="flex flex-col gap-2 py-3 border-b border-border last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text-1">{inv.invoice_code || `INV-${inv.id}`} · {inv.period}</p>
                <p className="text-[11px] text-text-3">
                  {inv.client_id != null && clientNameById.has(inv.client_id) ? (
                    <span className="font-medium text-text-2">{clientNameById.get(inv.client_id)} · </span>
                  ) : inv.client_id == null ? (
                    <span className="text-tag-amber">Sem cliente · </span>
                  ) : null}
                  R$ {Number(inv.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  {" · "}
                  {inv.method}
                  {" · vence "}
                  {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-text-3">Status</span>
                <select
                  className="h-9 min-w-[140px] rounded-md border border-input bg-background px-2 text-xs"
                  value={inv.status}
                  disabled={updatingId === inv.id}
                  onChange={(e) => void patchInvoiceStatus(inv.id, e.target.value)}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Pago">Pago</option>
                  <option value="Vencido">Vencido</option>
                </select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {openCreate && (
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova cobrança</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleCreateInvoice}>
              <div className="space-y-1">
                <Label className="text-xs">Cliente (obrigatório)</Label>
                {clientsLoadError ? (
                  <p className="text-[11px] text-tag-amber">Não foi possível carregar a lista de clientes. Atualize a página.</p>
                ) : null}
                {clientsLoading ? <p className="text-[11px] text-text-3">Carregando clientes…</p> : null}
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newInvoice.client_id}
                  onChange={(e) => setNewInvoice((prev) => ({ ...prev, client_id: e.target.value }))}
                  required
                  disabled={clientsLoading}
                >
                  <option value="">Selecione o cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.empresa} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                placeholder="Período (ex: Maio/2026)"
                value={newInvoice.period}
                onChange={(e) => setNewInvoice((prev) => ({ ...prev, period: e.target.value }))}
                required
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
              <Input
                type="date"
                value={newInvoice.due_date}
                onChange={(e) => setNewInvoice((prev) => ({ ...prev, due_date: e.target.value }))}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newInvoice.method}
                  onChange={(e) => setNewInvoice((prev) => ({ ...prev, method: e.target.value }))}
                >
                  <option value="Pix">Pix</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Cartão">Cartão</option>
                </select>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newInvoice.status}
                  onChange={(e) => setNewInvoice((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Pago">Pago</option>
                  <option value="Vencido">Vencido</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar cobrança
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
