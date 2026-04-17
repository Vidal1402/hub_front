import { PageHeader, PortalCard } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";

type Invoice = { id: number; invoice_code?: string; amount: number; status: string; due_date?: string | null; method?: string };

export function FinanceiroPage() {
  const { data: invoices, loading, error } = useApiData<Invoice[]>("/api/invoices", []);

  const total = invoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
  const pending = invoices.filter((inv) => ["pendente", "pending", "aberto"].includes((inv.status || "").toLowerCase()));

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Faturas e status carregados da API" />
      {error && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2 mb-4">
          Não foi possível carregar dados financeiros da API.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PortalCard><div className="p-5"><p className="text-xs text-text-3">Total faturado</p><p className="text-2xl font-bold">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div></PortalCard>
        <PortalCard><div className="p-5"><p className="text-xs text-text-3">Faturas pendentes</p><p className="text-2xl font-bold">{pending.length}</p></div></PortalCard>
        <PortalCard><div className="p-5"><p className="text-xs text-text-3">Total de faturas</p><p className="text-2xl font-bold">{invoices.length}</p></div></PortalCard>
      </div>

      <PortalCard>
        <div className="p-5">
          {loading && <p className="text-xs text-text-3">Carregando...</p>}
          {!loading && invoices.length === 0 && <p className="text-xs text-text-3">Nenhuma fatura retornada pela API.</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="py-2 border-b border-border last:border-0">
              <p className="text-xs font-semibold">{inv.invoice_code || `INV-${inv.id}`}</p>
              <p className="text-[11px] text-text-3">
                R$ {Number(inv.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · {inv.status || "Sem status"}
                {inv.due_date ? ` · ${new Date(inv.due_date).toLocaleDateString("pt-BR")}` : ""}
                {inv.method ? ` · ${inv.method}` : ""}
              </p>
            </div>
          ))}
        </div>
      </PortalCard>
    </div>
  );
}
