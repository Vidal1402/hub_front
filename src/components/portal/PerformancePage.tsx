import { PageHeader, PortalCard } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";

type Task = { id: number; status: string; created_at?: string; updated_at?: string };
type Invoice = { id: number; amount: number; status: string };

export function PerformancePage() {
  const tasks = useApiData<Task[]>("/api/tasks", []);
  const invoices = useApiData<Invoice[]>("/api/invoices", []);

  const concluded = tasks.data.filter((t) => ["entregue", "done", "concluido", "concluído"].includes((t.status || "").toLowerCase())).length;
  const total = tasks.data.length;
  const conversionRate = total > 0 ? (concluded / total) * 100 : 0;
  const billed = invoices.data.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);

  return (
    <div>
      <PageHeader title="Performance" subtitle="Indicadores com dados reais da API" />

      {(tasks.error || invoices.error) && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2 mb-4">
          Não foi possível carregar todos os dados de performance.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PortalCard><div className="p-5"><p className="text-xs text-text-3">Tarefas concluídas</p><p className="text-2xl font-bold">{concluded}</p></div></PortalCard>
        <PortalCard><div className="p-5"><p className="text-xs text-text-3">Taxa de conclusão</p><p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p></div></PortalCard>
        <PortalCard><div className="p-5"><p className="text-xs text-text-3">Valor faturado</p><p className="text-2xl font-bold">R$ {billed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div></PortalCard>
      </div>
    </div>
  );
}
