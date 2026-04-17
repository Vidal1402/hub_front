import { PageHeader, PortalCard } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";

type TaskMaterial = { id: number; title: string; type?: string; updated_at?: string; due_date?: string };

export function MateriaisPage() {
  const { data, loading, error } = useApiData<TaskMaterial[]>("/api/tasks", []);

  return (
    <div>
      <PageHeader title="Materiais" subtitle="Materiais gerados a partir das tarefas reais" />
      {error && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2 mb-4">
          Não foi possível carregar dados de materiais.
        </p>
      )}
      <PortalCard>
        <div className="p-5">
          {loading && <p className="text-xs text-text-3">Carregando...</p>}
          {!loading && data.length === 0 && <p className="text-xs text-text-3">Nenhum material disponível.</p>}
          {data.map((item) => (
            <div key={item.id} className="py-2 border-b border-border last:border-0">
              <p className="text-xs font-semibold text-text-1">{item.title}</p>
              <p className="text-[11px] text-text-3">
                {item.type || "Sem tipo"}
                {(item.updated_at || item.due_date)
                  ? ` · ${new Date(item.updated_at || item.due_date || "").toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
            </div>
          ))}
        </div>
      </PortalCard>
    </div>
  );
}
