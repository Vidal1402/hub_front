import { PageHeader, PortalCard } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";

type TicketLike = { id: number | string; title: string; status?: string; created_at?: string; due_date?: string };

export function SuportePage() {
  const { data, loading, error } = useApiData<TicketLike[]>("/api/tasks", []);
  const tickets = data.filter((item) =>
    ["pendente", "revisao", "solicitacoes", "sol", "rev"].includes((item.status || "").toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Suporte" subtitle="Chamados derivados das tarefas pendentes" />
      {error && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2 mb-4">
          Não foi possível carregar chamados.
        </p>
      )}
      <PortalCard>
        <div className="p-5">
          {loading && <p className="text-xs text-text-3">Carregando...</p>}
          {!loading && tickets.length === 0 && <p className="text-xs text-text-3">Nenhum chamado aberto.</p>}
          {tickets.map((ticket) => (
            <div key={ticket.id} className="py-2 border-b border-border last:border-0">
              <p className="text-xs font-semibold text-text-1">{ticket.title}</p>
              <p className="text-[11px] text-text-3">
                {ticket.status || "Sem status"}
                {(ticket.created_at || ticket.due_date)
                  ? ` · ${new Date(ticket.created_at || ticket.due_date || "").toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
            </div>
          ))}
        </div>
      </PortalCard>
    </div>
  );
}
