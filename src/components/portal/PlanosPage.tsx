import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, PortalCard } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { Check } from "lucide-react";

type PlanCatalog = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  billing_cycle: string;
  features: string[];
};

type ClientMePayload = {
  plano?: string;
  name?: string;
  empresa?: string;
};

const CYCLE_LABEL: Record<string, string> = {
  monthly: "/mês",
  yearly: "/ano",
};

function unwrapClientMe(res: unknown): ClientMePayload | null {
  if (res == null || typeof res !== "object" || Array.isArray(res)) return null;
  const o = res as Record<string, unknown>;
  const inner = o.data;
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as ClientMePayload;
  }
  if (o.plano != null || o.name != null) return o as ClientMePayload;
  return null;
}

export function PlanosPage() {
  const { session } = useAuth();
  const isCliente = (session?.user?.role ?? "") === "cliente";

  const { data: plans, loading: plansLoading, error: plansError } = useApiData<PlanCatalog[]>("/api/plans", []);
  const { data: meRaw, isPending: meLoading } = useQuery({
    queryKey: ["api", "/api/clients/me", "portal-planos"],
    queryFn: async () => apiRequest<unknown>("/api/clients/me"),
    enabled: isCliente,
    staleTime: 5 * 60_000,
  });

  const myPlano = useMemo(() => {
    const row = unwrapClientMe(meRaw);
    return row?.plano != null ? String(row.plano).trim() : "";
  }, [meRaw]);

  const list = useMemo(() => {
    const arr = Array.isArray(plans) ? plans : [];
    return [...arr].sort((a, b) => a.name.localeCompare(b.name));
  }, [plans]);

  const matchName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  return (
    <div>
      <PageHeader
        title="Planos"
        subtitle={
          isCliente
            ? "Catálogo de planos disponíveis na sua agência. O plano contratado aparece destacado quando bate com o cadastro vinculado ao seu login."
            : "Visão dos planos ativos cadastrados pela equipe."
        }
      />

      {plansError && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2 mb-4">
          Não foi possível carregar os planos.
        </p>
      )}

      {isCliente && !meLoading && myPlano === "" && !plansLoading && (
        <p className="text-xs text-text-3 bg-muted/50 border border-border rounded-md px-3 py-2 mb-4">
          Seu cadastro ainda não tem um plano definido. A equipe pode ajustar no painel administrativo.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plansLoading && <p className="text-xs text-text-3">Carregando planos…</p>}
        {!plansLoading && list.length === 0 && (
          <p className="text-xs text-text-3">Nenhum plano ativo no momento. Volte mais tarde ou fale com o suporte.</p>
        )}
        {list.map((plan) => {
          const isYours = myPlano !== "" && matchName(plan.name, myPlano);
          return (
            <PortalCard key={plan.id}>
              <div className="p-5 flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text-1">{plan.name}</p>
                    {plan.description ? <p className="text-[11px] text-text-3 mt-1 leading-relaxed">{plan.description}</p> : null}
                  </div>
                  {isYours ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-tag-green-bg text-tag-green">
                      <Check size={12} /> Seu plano
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-1">
                    R$ {Number(plan.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    <span className="text-sm font-normal text-text-3">{CYCLE_LABEL[plan.billing_cycle] ?? ""}</span>
                  </p>
                </div>
                {Array.isArray(plan.features) && plan.features.length > 0 ? (
                  <ul className="text-[11px] text-text-2 space-y-1.5 border-t border-border pt-3 mt-auto">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-tag-green shrink-0">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </PortalCard>
          );
        })}
      </div>
    </div>
  );
}
