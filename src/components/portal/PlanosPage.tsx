import { PageHeader, PortalCard } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";

type ClientPlan = { id: number; plano: string; valor: number; status: string };
type PlanGroup = { name: string; clients: number; monthly: number; active: number };

export function PlanosPage() {
  const { data, loading, error } = useApiData<ClientPlan[]>("/api/clients", []);
  const grouped = data.reduce<Record<string, PlanGroup>>((acc, item) => {
    const key = item.plano || "Sem plano";
    if (!acc[key]) acc[key] = { name: key, clients: 0, monthly: 0, active: 0 };
    acc[key].clients += 1;
    acc[key].monthly += Number(item.valor || 0);
    if ((item.status || "").toLowerCase() === "ativo") acc[key].active += 1;
    return acc;
  }, {});
  const plans = Object.values(grouped);

  return (
    <div>
      <PageHeader title="Planos" subtitle="Distribuição real por plano de cliente" />
      {error && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2 mb-4">
          Não foi possível carregar planos.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading && <p className="text-xs text-text-3">Carregando...</p>}
        {!loading && plans.length === 0 && <p className="text-xs text-text-3">Nenhum plano encontrado.</p>}
        {plans.map((plan) => (
          <PortalCard key={plan.name}>
            <div className="p-5">
              <p className="text-sm font-semibold text-text-1">{plan.name}</p>
              <p className="text-[11px] text-text-3">
                {plan.clients} clientes · {plan.active} ativos
              </p>
              <p className="text-sm font-bold text-text-1 mt-1">
                R$ {plan.monthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
              </p>
            </div>
          </PortalCard>
        ))}
      </div>
    </div>
  );
}
