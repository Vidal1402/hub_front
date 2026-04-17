import { FormEvent, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useToast } from "@/hooks/use-toast";

export type PlanRow = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  billing_cycle: string;
  features: string[];
  is_active: boolean;
  sort_order: number;
};

const BILLING_LABEL: Record<string, string> = {
  monthly: "Mensal",
  yearly: "Anual",
};

function featuresToText(features: string[] | undefined): string {
  return Array.isArray(features) ? features.join("\n") : "";
}

function textToFeatures(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProdutosPlanosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, loading, error } = useApiData<PlanRow[]>("/api/plans", []);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    billing_cycle: "monthly",
    featuresText: "",
    is_active: true,
    sort_order: "0",
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["api", "/api/plans"] });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      slug: "",
      description: "",
      price: "",
      billing_cycle: "monthly",
      featuresText: "",
      is_active: true,
      sort_order: "0",
    });
    setOpenForm(true);
  };

  const openEdit = (p: PlanRow) => {
    setEditing(p);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      price: String(p.price ?? 0),
      billing_cycle: p.billing_cycle || "monthly",
      featuresText: featuresToText(p.features),
      is_active: p.is_active,
      sort_order: String(p.sort_order ?? 0),
    });
    setOpenForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      toast({ title: "Preço inválido", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || "",
        price,
        billing_cycle: form.billing_cycle,
        features: textToFeatures(form.featuresText),
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };

      if (editing) {
        await apiRequest(`/api/plans/${editing.id}`, {
          method: "PATCH",
          body,
        });
        toast({ title: "Plano atualizado" });
      } else {
        await apiRequest("/api/plans", { method: "POST", body });
        toast({ title: "Plano criado" });
      }
      setOpenForm(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      toast({
        title: editing ? "Erro ao salvar" : "Erro ao criar",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/plans/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Plano removido" });
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const sorted = useMemo(() => {
    const list = Array.isArray(data) ? [...data] : [];
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
    return list;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-1">Produtos / Planos</h1>
          <p className="text-sm text-text-3">
            Cadastre ofertas com preço de referência e benefícios. No portal, o cliente vê só planos ativos; o vínculo ao
            cadastro de cliente continua pelo campo &quot;plano&quot; no cliente.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" type="button" onClick={openCreate}>
          <Plus size={14} /> Novo plano
        </Button>
      </div>

      {error && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2">
          Não foi possível carregar /api/plans. Confirme o deploy do backend.
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Planos cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {loading && <p className="text-xs text-text-3 px-4 py-6">Carregando...</p>}
          {!loading && sorted.length === 0 && (
            <p className="text-xs text-text-3 px-4 py-6">Nenhum plano ainda. Crie o primeiro para exibir no portal.</p>
          )}
          {!loading && sorted.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço ref.</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="text-sm font-medium text-text-1">{p.name}</p>
                        <p className="text-[11px] text-text-3 font-mono">{p.slug}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        R$ {Number(p.price ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs">{BILLING_LABEL[p.billing_cycle] ?? p.billing_cycle}</TableCell>
                      <TableCell className="text-xs">{p.sort_order ?? 0}</TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.is_active ? "bg-tag-green-bg text-tag-green" : "bg-muted text-text-3"
                          }`}
                        >
                          {p.is_active ? "Sim" : "Não"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil size={14} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Slug (opcional, URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="ex.: growth"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <textarea
                className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Preço de referência (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ciclo de cobrança</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.billing_cycle}
                  onChange={(e) => setForm((f) => ({ ...f, billing_cycle: e.target.value }))}
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ordem de exibição</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  Plano ativo no portal
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Benefícios (um por linha)</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                value={form.featuresText}
                onChange={(e) => setForm((f) => ({ ...f, featuresText: e.target.value }))}
                placeholder={"Ex.:\nDashboard completo\nSuporte por e-mail"}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove o plano &quot;{deleteTarget?.name}&quot; do catálogo. Clientes já vinculados pelo nome do plano no cadastro não são alterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
