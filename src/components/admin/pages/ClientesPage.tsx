import { FormEvent, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Eye, Edit, Loader2, Trash2, KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useApiData } from "@/hooks/useApiData";
import { useToast } from "@/hooks/use-toast";

type ClientApi = {
  id: number;
  name: string;
  empresa: string;
  email: string;
  telefone?: string | null;
  plano: string;
  valor: number;
  status: string;
};

function clientFromApiRow(row: Record<string, unknown>): ClientApi {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    empresa: String(row.empresa ?? ""),
    email: String(row.email ?? ""),
    telefone: row.telefone != null ? String(row.telefone) : "",
    plano: String(row.plano ?? "Growth"),
    valor: Number(row.valor ?? 0),
    status: String(row.status ?? "ativo"),
  };
}

/** GET /api/clients/:id pode vir como `{ data: {...} }` ou corpo plano com `id`. */
function extractClientFromShowResponse(json: unknown): Record<string, unknown> | null {
  if (json == null || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const inner = o.data;
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  if (o.id != null) {
    return o;
  }
  return null;
}

export function ClientesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clients, loading, error: loadError } = useApiData<ClientApi[]>("/api/clients", []);
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    empresa: "",
    email: "",
    telefone: "",
    plano: "Growth",
    valor: "0",
    status: "ativo",
  });
  const [createAccess, setCreateAccess] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [viewClient, setViewClient] = useState<ClientApi | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    empresa: "",
    email: "",
    telefone: "",
    plano: "Growth",
    valor: "0",
    status: "ativo",
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientApi | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessTarget, setAccessTarget] = useState<ClientApi | null>(null);
  const [accessModalPassword, setAccessModalPassword] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);

  const refreshClients = async () => {
    await queryClient.invalidateQueries({ queryKey: ["api", "/api/clients"] });
  };

  const openDeleteConfirm = (c: ClientApi) => {
    setDeleteTarget(c);
    setDeleteOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiRequest(`/api/clients/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Cliente removido", description: `${deleteTarget.name} foi excluído.` });
      if (viewClient?.id === deleteTarget.id) {
        setViewOpen(false);
        setViewClient(null);
      }
      if (editId === deleteTarget.id) {
        setEditOpen(false);
        setEditId(null);
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      await refreshClients();
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const openAccessModal = (c: ClientApi) => {
    setAccessTarget(c);
    setAccessModalPassword("");
    setAccessOpen(true);
  };

  const handleGrantAccess = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessTarget || !accessModalPassword) return;

    setAccessLoading(true);
    try {
      const userRes = await apiRequest<{ user: { id: number } }>("/api/admin/users", {
        method: "POST",
        body: {
          name: accessTarget.name,
          email: accessTarget.email,
          password: accessModalPassword,
          role: "cliente",
          reset_if_exists: true,
        },
      });

      if (userRes.user?.id != null) {
        await apiRequest(`/api/clients/${accessTarget.id}`, {
          method: "PATCH",
          body: { user_id: userRes.user.id },
        });
      }

      toast({
        title: "Acesso liberado",
        description: `Login do cliente ${accessTarget.name} criado/atualizado e vinculado ao cadastro.`,
      });
      setAccessOpen(false);
      setAccessTarget(null);
      setAccessModalPassword("");
    } catch (error) {
      toast({
        title: "Erro ao liberar acesso",
        description: error instanceof Error ? error.message : "Não foi possível criar/redefinir o acesso.",
        variant: "destructive",
      });
    } finally {
      setAccessLoading(false);
    }
  };

  const openViewClient = async (c: ClientApi) => {
    setViewClient(c);
    setViewOpen(true);
    setViewLoading(true);
    try {
      const res = await apiRequest<unknown>(`/api/clients/${c.id}`);
      const row = extractClientFromShowResponse(res);
      if (row) {
        setViewClient(clientFromApiRow(row));
      }
    } catch {
      /* mantém dados da linha da tabela */
    } finally {
      setViewLoading(false);
    }
  };

  const openEditClient = (c: ClientApi) => {
    setEditId(c.id);
    setEditForm({
      name: c.name,
      empresa: c.empresa,
      email: c.email,
      telefone: c.telefone ?? "",
      plano: c.plano,
      valor: String(c.valor ?? 0),
      status: c.status,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (editId == null) return;
    if (!editForm.name || !editForm.empresa || !editForm.email) return;

    setSaving(true);
    try {
      await apiRequest(`/api/clients/${editId}`, {
        method: "PATCH",
        body: {
          name: editForm.name,
          empresa: editForm.empresa,
          email: editForm.email,
          telefone: editForm.telefone || null,
          plano: editForm.plano,
          valor: Number(editForm.valor || 0),
          status: editForm.status,
        },
      });
      toast({ title: "Cliente atualizado", description: "As alterações foram salvas." });
      setEditOpen(false);
      setEditId(null);
      await refreshClients();
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.empresa || !newClient.email) return;
    if (createAccess && !accessPassword) {
      toast({
        title: "Senha obrigatória",
        description: "Informe uma senha para criar acesso do cliente.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const created = await apiRequest<{ id: number }>("/api/clients", {
        method: "POST",
        body: {
          ...newClient,
          valor: Number(newClient.valor || 0),
        },
      });

      if (createAccess) {
        const userRes = await apiRequest<{ user: { id: number } }>("/api/admin/users", {
          method: "POST",
          body: {
            name: newClient.name,
            email: newClient.email,
            password: accessPassword,
            role: "cliente",
            reset_if_exists: true,
          },
        });
        if (userRes.user?.id != null && created.id != null) {
          await apiRequest(`/api/clients/${created.id}`, {
            method: "PATCH",
            body: { user_id: userRes.user.id },
          });
        }
      }

      toast({
        title: "Cliente criado",
        description: createAccess
          ? "Cliente salvo, acesso criado e vinculado ao cadastro."
          : "Cliente salvo com sucesso (sem usuário de login).",
      });
      setOpenCreate(false);
      setNewClient({
        name: "",
        empresa: "",
        email: "",
        telefone: "",
        plano: "Growth",
        valor: "0",
        status: "ativo",
      });
      setCreateAccess(false);
      setAccessPassword("");
      await refreshClients();
    } catch (error) {
      toast({
        title: "Erro ao criar cliente",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o cliente/acesso.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(
    () =>
      clients.filter(
        (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.empresa.toLowerCase().includes(search.toLowerCase()),
      ),
    [clients, search],
  );

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      ativo: "bg-tag-green-bg text-tag-green",
      pausado: "bg-tag-amber-bg text-tag-amber",
      inadimplente: "bg-tag-red-bg text-tag-red",
    };
    return map[s] || "";
  };

  const planBadge = (p: string) => {
    const map: Record<string, string> = {
      Starter: "bg-muted text-text-2",
      Growth: "bg-tag-blue-bg text-tag-blue",
      Pro: "bg-tag-purple-bg text-tag-purple",
      Scale: "bg-tag-amber-bg text-tag-amber",
    };
    return map[p] || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-1">Clientes</h1>
          <p className="text-sm text-text-3">{clients.length} clientes cadastrados</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setOpenCreate(true)}>
          <Plus size={14} /> Novo Cliente
        </Button>
      </div>

      {loadError && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2">
          {loadError}
        </p>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar clientes..." className="pl-9 h-9 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Email</TableHead>
                <TableHead className="text-xs">Plano</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Valor</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-text-3 py-6">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div>
                      <p className="text-xs font-semibold text-text-1">{c.name}</p>
                      <p className="text-[11px] text-text-3">{c.empresa}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-text-2 hidden md:table-cell">{c.email}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${planBadge(c.plano)}`}>{c.plano}</span>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-text-1 hidden sm:table-cell">
                    R$ {Number(c.valor).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${statusBadge(c.status)}`}>{c.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-text-3 hover:bg-muted bg-transparent border-none cursor-pointer"
                        title="Ver detalhes"
                        onClick={() => void openViewClient(c)}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-text-3 hover:bg-muted bg-transparent border-none cursor-pointer"
                        title="Editar"
                        onClick={() => openEditClient(c)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-text-3 hover:bg-muted bg-transparent border-none cursor-pointer"
                        title="Liberar/redefinir acesso"
                        onClick={() => openAccessModal(c)}
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-text-3 hover:text-destructive hover:bg-destructive/10 bg-transparent border-none cursor-pointer"
                        title="Excluir cliente"
                        onClick={() => openDeleteConfirm(c)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={viewOpen}
        onOpenChange={(o) => {
          setViewOpen(o);
          if (!o) setViewClient(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do cliente</DialogTitle>
          </DialogHeader>
          {viewLoading && (
            <div className="flex items-center gap-2 text-sm text-text-3 py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          )}
          {!viewLoading && viewClient && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-text-3">ID</Label>
                  <p className="font-medium text-text-1">{viewClient.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-text-3">Status</Label>
                  <p className="font-medium text-text-1 capitalize">{viewClient.status}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-text-3">Nome</Label>
                <p className="font-medium text-text-1">{viewClient.name}</p>
              </div>
              <div>
                <Label className="text-xs text-text-3">Empresa</Label>
                <p className="font-medium text-text-1">{viewClient.empresa}</p>
              </div>
              <div>
                <Label className="text-xs text-text-3">Email</Label>
                <p className="font-medium text-text-1 break-all">{viewClient.email}</p>
              </div>
              <div>
                <Label className="text-xs text-text-3">Telefone</Label>
                <p className="font-medium text-text-1">{viewClient.telefone || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-text-3">Plano</Label>
                  <p className="font-medium text-text-1">{viewClient.plano}</p>
                </div>
                <div>
                  <Label className="text-xs text-text-3">Valor</Label>
                  <p className="font-medium text-text-1">R$ {Number(viewClient.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setViewOpen(false);
                setViewClient(null);
              }}
            >
              Fechar
            </Button>
            {viewClient && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setViewOpen(false);
                  openEditClient(viewClient);
                }}
              >
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editOpen && (
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleEditSubmit}>
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Empresa</Label>
              <Input value={editForm.empresa} onChange={(e) => setEditForm((p) => ({ ...p, empresa: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input value={editForm.telefone} onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Plano</Label>
                <Input value={editForm.plano} onChange={(e) => setEditForm((p) => ({ ...p, plano: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$)</Label>
                <Input type="number" min="0" step="0.01" value={editForm.valor} onChange={(e) => setEditForm((p) => ({ ...p, valor: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={editForm.status}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="inadimplente">Inadimplente</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
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
      )}

      {accessOpen && accessTarget && (
      <Dialog
        open={accessOpen}
        onOpenChange={(open) => {
          setAccessOpen(open);
          if (!open) {
            setAccessTarget(null);
            setAccessModalPassword("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Liberar acesso do cliente</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleGrantAccess}>
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <Input value={accessTarget?.name ?? ""} disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email de login</Label>
              <Input type="email" value={accessTarget?.email ?? ""} disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Senha</Label>
              <Input
                type="password"
                placeholder="Defina uma senha"
                value={accessModalPassword}
                onChange={(e) => setAccessModalPassword(e.target.value)}
                required
              />
              <p className="text-[11px] text-text-3">
                Se o usuário já existir, a senha será redefinida.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAccessOpen(false)} disabled={accessLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={accessLoading}>
                {accessLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar acesso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {deleteOpen && deleteTarget && (
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Esta ação remove permanentemente "${deleteTarget.name}" (${deleteTarget.empresa}). Não dá para desfazer.`
                : "Confirme a exclusão do cliente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" size="sm" disabled={deleteLoading} onClick={() => void handleDeleteClient()}>
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}

      {openCreate && (
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleCreateClient}>
            <Input
              placeholder="Nome"
              value={newClient.name}
              onChange={(e) => setNewClient((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Empresa"
              value={newClient.empresa}
              onChange={(e) => setNewClient((prev) => ({ ...prev, empresa: e.target.value }))}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={newClient.email}
              onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <Input
              placeholder="Telefone"
              value={newClient.telefone}
              onChange={(e) => setNewClient((prev) => ({ ...prev, telefone: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Plano (Starter/Growth/Pro/Scale)"
                value={newClient.plano}
                onChange={(e) => setNewClient((prev) => ({ ...prev, plano: e.target.value }))}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor"
                value={newClient.valor}
                onChange={(e) => setNewClient((prev) => ({ ...prev, valor: e.target.value }))}
              />
            </div>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={newClient.status}
              onChange={(e) => setNewClient((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="inadimplente">Inadimplente</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createAccess} onChange={(e) => setCreateAccess(e.target.checked)} />
              Criar acesso ao dashboard para este cliente
            </label>

            {createAccess && (
              <Input
                type="password"
                placeholder="Senha inicial do cliente"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                required
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
