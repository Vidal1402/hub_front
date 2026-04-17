import { Card, CardContent } from "@/components/ui/card";
import { useApiData } from "@/hooks/useApiData";

export function AlertasPage() {
  const { data, loading, error } = useApiData<{ id: number; invoice_code?: string; status: string; amount: number; due_date?: string }>("/api/invoices", [] as any);
  const alerts = (data as any[])
    .filter((inv) => ["pendente", "vencido", "overdue", "pending"].includes((inv.status || "").toLowerCase()))
    .map((inv) => ({
      id: inv.id,
      titulo: `Fatura ${inv.invoice_code || `INV-${inv.id}`} com atenção`,
      descricao: `Valor R$ ${Number(inv.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      severidade: ["vencido", "overdue"].includes((inv.status || "").toLowerCase()) ? "alta" : "media",
      dueDate: inv.due_date,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-1">Alertas</h1>
        <p className="text-sm text-text-3">Alertas reais de cobrança</p>
      </div>
      {error && <p className="text-xs text-tag-amber">Não foi possível carregar alertas.</p>}
      <Card>
        <CardContent className="p-4 space-y-2">
          {loading && <p className="text-xs text-text-3">Carregando...</p>}
          {!loading && alerts.length === 0 && <p className="text-xs text-text-3">Nenhum alerta ativo.</p>}
          {alerts.map((a) => (
            <div key={a.id} className="py-2 border-b border-border last:border-0">
              <p className="text-xs font-semibold text-text-1">{a.titulo}</p>
              <p className="text-[11px] text-text-3">
                {a.descricao || "Sem descrição"} · {a.severidade || "Sem severidade"}
                {a.dueDate ? ` · vence ${new Date(a.dueDate).toLocaleDateString("pt-BR")}` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
