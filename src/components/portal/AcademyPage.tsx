import { PageHeader, PortalCard } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";

type ClientLearning = { id: number; name: string; plano: string; status: string };

export function AcademyPage() {
  const { data, loading, error } = useApiData<ClientLearning[]>("/api/clients", []);

  return (
    <div>
      <PageHeader title="Academy" subtitle="Trilhas liberadas por plano de cliente" />
      {error && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2 mb-4">
          Não foi possível carregar trilhas.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && <p className="text-xs text-text-3">Carregando...</p>}
        {!loading && data.length === 0 && <p className="text-xs text-text-3">Nenhuma trilha disponível.</p>}
        {data.map((item) => (
          <PortalCard key={item.id}>
            <div className="p-5">
              <p className="text-sm font-semibold text-text-1">Trilha para {item.name}</p>
              <p className="text-[11px] text-text-3">
                Plano {item.plano || "Sem plano"} · Status {item.status || "Sem status"}
              </p>
            </div>
          </PortalCard>
        ))}
      </div>
    </div>
  );
}
