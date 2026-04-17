import { FormEvent, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useToast } from "@/hooks/use-toast";
import { ProducaoKanban, type KanbanColumnId, type KanbanTask } from "./ProducaoKanban";

type Task = KanbanTask;

const TASKS_QUERY_KEY = ["api", "/api/tasks"] as const;

function normalizeTaskStatus(status: string | undefined): KanbanColumnId {
  const value = String(status ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (value === "entregue" || value === "done" || value === "concluido") return "entregue";
  if (value === "revisao") return "revisao";
  if (value === "em_andamento" || value === "emandamento") return "em_andamento";
  return "solicitacoes";
}

export function ProducaoAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, loading, error } = useApiData<Task[]>("/api/tasks", []);
  const [openEdit, setOpenEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    type: "Outros",
    priority: "Média",
    due_date: "",
    status: "solicitacoes" as KanbanColumnId,
  });

  const openEditTask = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title ?? "",
      type: task.type ?? "Outros",
      priority: task.priority ?? "Média",
      due_date: task.due_date ? String(task.due_date).slice(0, 10) : "",
      status: normalizeTaskStatus(task.status),
    });
    setOpenEdit(true);
  }, []);

  const refreshTasks = async () => {
    await queryClient.invalidateQueries({ queryKey: [...TASKS_QUERY_KEY] });
  };

  const handleMoveTask = useCallback(
    async (taskId: number, newStatus: KanbanColumnId) => {
      const key = [...TASKS_QUERY_KEY];
      const previous = queryClient.getQueryData<Task[]>(key);
      queryClient.setQueryData(key, (old) => {
        if (!old) return old;
        return old.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
      });
      try {
        await apiRequest(`/api/tasks/${taskId}/status`, {
          method: "PATCH",
          body: { status: newStatus },
        });
      } catch (err) {
        queryClient.setQueryData(key, previous);
        toast({
          title: "Não foi possível mover",
          description: err instanceof Error ? err.message : "Tente novamente.",
          variant: "destructive",
        });
      }
    },
    [queryClient, toast],
  );

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !form.title.trim()) return;
    setSaving(true);
    try {
      await apiRequest(`/api/tasks/${editingTaskId}`, {
        method: "PATCH",
        body: {
          title: form.title.trim(),
          type: form.type,
          priority: form.priority,
          due_date: form.due_date || null,
          status: form.status,
        },
      });
      toast({ title: "Tarefa atualizada", description: "As alterações foram salvas." });
      setOpenEdit(false);
      setEditingTaskId(null);
      setForm({ title: "", type: "Outros", priority: "Média", due_date: "", status: "solicitacoes" });
      await refreshTasks();
    } catch (err) {
      toast({
        title: "Erro ao atualizar tarefa",
        description: err instanceof Error ? err.message : "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-1">Produção</h1>
        <p className="text-sm text-text-3">
          Os cartões vêm das solicitações dos clientes no portal. Arraste entre colunas para atualizar o status e clique no cartão para editar.
        </p>
      </div>
      {error && <p className="text-xs text-tag-amber">Não foi possível carregar tarefas.</p>}
      <ProducaoKanban tasks={data} loading={loading} onMoveTask={handleMoveTask} onEditTask={openEditTask} />

      {openEdit && (
        <Dialog
          open={openEdit}
          onOpenChange={(open) => {
            setOpenEdit(open);
            if (!open) setEditingTaskId(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar tarefa #{editingTaskId ?? ""}</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleUpdate}>
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex.: Revisar landing page" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Input value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} placeholder="Outros" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prioridade</Label>
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
                <Label className="text-xs">Prazo (opcional)</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as KanbanColumnId }))}
                >
                  <option value="solicitacoes">Solicitações</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="revisao">Revisão</option>
                  <option value="entregue">Entregue</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenEdit(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || editingTaskId == null}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
