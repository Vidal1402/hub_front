import { Card, CardContent } from "@/components/ui/card";
import { useApiData } from "@/hooks/useApiData";

type TaskOwner = { id: number; owner_name?: string; status?: string; type?: string };

export function ColaboradoresPage() {
  const { data, loading, error } = useApiData<TaskOwner[]>("/api/tasks", []);
  const byOwner = data.reduce<Record<string, { tasks: number; doing: number }>>((acc, item) => {
    const owner = item.owner_name || "Sem responsável";
    if (!acc[owner]) acc[owner] = { tasks: 0, doing: 0 };
    acc[owner].tasks += 1;
    if (!["entregue", "done", "concluido", "concluído"].includes((item.status || "").toLowerCase())) {
      acc[owner].doing += 1;
    }
    return acc;
  }, {});
  const rows = Object.entries(byOwner);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-1">Colaboradores</h1>
        <p className="text-sm text-text-3">Distribuição real de tarefas por responsável</p>
      </div>
      {error && <p className="text-xs text-tag-amber">Não foi possível carregar colaboradores.</p>}
      <Card>
        <CardContent className="p-4 space-y-2">
          {loading && <p className="text-xs text-text-3">Carregando...</p>}
          {!loading && rows.length === 0 && <p className="text-xs text-text-3">Nenhum responsável encontrado.</p>}
          {rows.map(([name, stats]) => (
            <div key={name} className="py-2 border-b border-border last:border-0">
              <p className="text-xs font-semibold text-text-1">{name}</p>
              <p className="text-[11px] text-text-3">{stats.tasks} tarefas · {stats.doing} em andamento</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
