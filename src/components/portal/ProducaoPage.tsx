import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ProducaoKanban, type KanbanTask } from "@/components/admin/pages/ProducaoKanban";

const TASKS_QUERY_KEY = ["api", "/api/tasks"] as const;

export type ProducaoPageProps = {
  /** Quando true na montagem, abre o modal de nova solicitação (ex.: vindo do dashboard). */
  bootOpenCreate?: boolean;
  onBootOpenCreateConsumed?: () => void;
};

export function ProducaoPage(props?: ProducaoPageProps) {
  const { bootOpenCreate = false, onBootOpenCreateConsumed } = props ?? {};
  const { toast } = useToast();
  const { session } = useAuth();
  const isCliente = (session?.user?.role ?? "") === "cliente";
  const queryClient = useQueryClient();
  const { data, loading, error } = useApiData<KanbanTask[]>("/api/tasks", []);
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "Outros",
    priority: "Média",
    due_date: "",
  });

  const refreshTasks = async () => {
    await queryClient.invalidateQueries({ queryKey: [...TASKS_QUERY_KEY] });
  };

  useEffect(() => {
    if (!bootOpenCreate || !isCliente) return;
    setOpenCreate(true);
    onBootOpenCreateConsumed?.();
  }, [bootOpenCreate, isCliente, onBootOpenCreateConsumed]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: {
          title: form.title.trim(),
          type: form.type,
          priority: form.priority,
          due_date: form.due_date || null,
        },
      });
      toast({
        title: "Solicitação enviada",
        description: "Sua equipe verá o cartão em Solicitações no painel administrativo.",
      });
      setOpenCreate(false);
      setForm({ title: "", type: "Outros", priority: "Média", due_date: "" });
      await refreshTasks();
    } catch (err) {
      toast({
        title: "Não foi possível enviar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-1">Produção</h1>
          <p className="text-sm text-text-3">
            {isCliente ? (
              <>
                Envie solicitações aqui (mesmo fluxo em colunas do admin). Você acompanha o andamento; a equipe move os cartões até a entrega.
              </>
            ) : (
              <>Visão do fluxo da organização. Só clientes abrem novas solicitações; alterações ficam no painel admin.</>
            )}
          </p>
        </div>
        {isCliente ? (
          <Button size="sm" className="gap-1.5 text-xs shrink-0" type="button" onClick={() => setOpenCreate(true)}>
            <Plus size={14} /> Nova solicitação
          </Button>
        ) : null}
      </div>
      {error && <p className="text-xs text-tag-amber">Não foi possível carregar suas solicitações.</p>}
      <ProducaoKanban
        tasks={data}
        loading={loading}
        readOnly
        emptyColumnHint={
          isCliente
            ? undefined
            : "Novas entradas aparecem quando um cliente envia uma solicitação no portal."
        }
      />

      {isCliente && openCreate && (
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova solicitação</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleCreate}>
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex.: Ajuste no criativo da campanha X"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Input value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} placeholder="Outros" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prioridade desejada</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prazo desejado (opcional)</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
              <p className="text-[11px] leading-relaxed text-text-3">
                A solicitação entra em <span className="font-medium text-text-2">Solicitações</span>. A equipe administra as demais colunas.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enviar solicitação
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
