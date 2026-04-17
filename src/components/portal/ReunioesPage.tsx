import { PageHeader, PortalCard } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";

type TaskMeeting = { id: number | string; title: string; due_date?: string; status?: string; owner_name?: string };

export function ReunioesPage() {
  const { data, loading, error } = useApiData<TaskMeeting[]>("/api/tasks", []);
  const meetings = data.filter((item) => !!item.due_date);

  return (
    <div>
      <PageHeader title="Reuniões" subtitle="Agenda gerada a partir de prazos das tarefas" />
      {error && <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2 mb-4">Não foi possível carregar agenda.</p>}
      <PortalCard>
        <div className="p-5">
          {loading && <p className="text-xs text-text-3">Carregando...</p>}
          {!loading && meetings.length === 0 && <p className="text-xs text-text-3">Nenhuma reunião agendada.</p>}
          {meetings.map((m) => (
            <div key={m.id} className="py-2 border-b border-border last:border-0">
              <p className="text-xs font-semibold text-text-1">{m.title}</p>
              <p className="text-[11px] text-text-3">
                {m.status || "Sem status"}
                {m.due_date ? ` · ${new Date(m.due_date).toLocaleDateString("pt-BR")}` : ""}
                {m.owner_name ? ` · ${m.owner_name}` : ""}
              </p>
            </div>
          ))}
        </div>
      </PortalCard>
    </div>
  );
}
