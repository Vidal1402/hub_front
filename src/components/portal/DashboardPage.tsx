import { ArrowRight, Kanban, Plus } from "lucide-react";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, PortalBtn, PortalCard } from "./Primitives";

export type PortalDashboardNavigate = (id: string, opts?: { openCreate?: boolean }) => void;

type Task = { id: number; title: string; status: string; due_date?: string | null; owner_name?: string | null };
type Invoice = { id: number; amount: number; status: string };

export function DashboardPage({ onNav }: { onNav: PortalDashboardNavigate }) {
  const { session } = useAuth();
  const isCliente = (session?.user?.role ?? "") === "cliente";
  const tasks = useApiData<Task[]>("/api/tasks", []);
  const invoices = useApiData<Invoice[]>("/api/invoices", []);

  const taskList = tasks.data.slice(0, 5);
  const totalInvoices = invoices.data.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const openTasks = tasks.data.filter((t) => !["entregue", "done", "concluido", "concluído"].includes((t.status || "").toLowerCase())).length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          isCliente
            ? "Visão geral, faturas e envio de solicitações para a equipe de produção."
            : "Visão geral com dados reais da API"
        }
      />

      {isCliente && (
        <div className="mb-6">
          <PortalCard lift style={{ borderColor: "hsl(var(--primary) / 0.35)" }}>
            <div className="p-5 bg-primary/[0.07]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Kanban className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-1">Solicitações de produção</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-3">
                      Abra um pedido para a equipe (design, ajustes, entregas). Ele entra na coluna Solicitações e acompanha o fluxo até a entrega.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <PortalBtn size="lg" onClick={() => onNav("producao", { openCreate: true })}>
                    <span className="inline-flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Nova solicitação
                    </span>
                  </PortalBtn>
                  <PortalBtn variant="ghost" onClick={() => onNav("producao")}>
                    Ver quadro
                  </PortalBtn>
                </div>
              </div>
            </div>
          </PortalCard>
        </div>
      )}

      {(tasks.error || invoices.error) && (
        <p className="mb-4 rounded-md border border-tag-amber/20 bg-tag-amber-bg px-3 py-2 text-xs text-tag-amber">
          Algumas informações não puderam ser carregadas da API.
        </p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <PortalCard>
          <div className="p-5">
            <p className="text-xs text-text-3">{isCliente ? "Suas solicitações" : "Tarefas"}</p>
            <p className="text-2xl font-bold">{tasks.data.length}</p>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="p-5">
            <p className="text-xs text-text-3">{isCliente ? "Em andamento" : "Tarefas abertas"}</p>
            <p className="text-2xl font-bold">{openTasks}</p>
          </div>
        </PortalCard>
        <PortalCard>
          <div className="p-5">
            <p className="text-xs text-text-3">Total de faturas</p>
            <p className="text-2xl font-bold">R$ {totalInvoices.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        </PortalCard>
      </div>

      <PortalCard>
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">{isCliente ? "Suas solicitações recentes" : "Próximas tarefas"}</p>
            <div className="flex flex-wrap items-center gap-2">
              {isCliente && (
                <button
                  type="button"
                  onClick={() => onNav("producao", { openCreate: true })}
                  className="flex cursor-pointer items-center gap-1 rounded-md border-none bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
                >
                  <Plus size={12} />
                  Nova solicitação
                </button>
              )}
              <button
                type="button"
                onClick={() => onNav("producao")}
                className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-xs text-text-3"
              >
                Ver produção <ArrowRight size={12} />
              </button>
            </div>
          </div>
          {tasks.loading && <p className="text-xs text-text-3">Carregando...</p>}
          {!tasks.loading && taskList.length === 0 && (
            <p className="text-xs text-text-3">
              {isCliente ? "Nenhuma solicitação ainda. Use o bloco acima ou o menu Produção para enviar a primeira." : "Sem tarefas para exibir."}
            </p>
          )}
          {taskList.map((task) => (
            <div key={task.id} className="border-b border-border py-2 last:border-0">
              <p className="text-xs font-semibold">{task.title}</p>
              <p className="text-[11px] text-text-3">
                {task.owner_name || "Sem responsável"} · {task.status || "Sem status"}
              </p>
            </div>
          ))}
        </div>
      </PortalCard>
    </div>
  );
}
