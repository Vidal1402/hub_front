import { PageHeader, PortalCard } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";

type Invoice = {
  id: number;
  invoice_code?: string;
  period?: string;
  amount: number;
  status: string;
  due_date?: string | null;
  method?: string;
};

export function FinanceiroPage() {
  const { session } = useAuth();
  const isCliente = (session?.user?.role ?? "") === "cliente";
  const { data: invoices, loading, error } = useApiData<Invoice[]>("/api/invoices", []);

  const total = invoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
  const pending = invoices.filter((inv) => !/^(pago|paid)$/i.test(String(inv.status || "").trim()));

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle={
          isCliente
            ? "Apenas cobranças vinculadas ao seu cadastro pela equipe. Aqui você vê o valor, o vencimento e o status para pagar."
            : "Faturas e status carregados da API."
        }
      />
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
          {!loading && invoices.length === 0 && (
            <p className="text-xs text-text-3">
              {isCliente
                ? "Nenhuma cobrança vinculada a você ainda. Quando o admin registrar uma fatura com seu cliente, ela aparece aqui automaticamente."
                : "Nenhuma fatura retornada pela API."}
            </p>
          )}
          {invoices.map((inv) => (
            <div key={inv.id} className="py-2 border-b border-border last:border-0">
              <p className="text-xs font-semibold">
                {inv.invoice_code || `INV-${inv.id}`}
                {inv.period ? <span className="font-normal text-text-3"> · {inv.period}</span> : null}
              </p>
              <p className="text-[11px] text-text-3">
                R$ {Number(inv.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · {inv.status || "Sem status"}
                {inv.due_date ? ` · vence ${new Date(inv.due_date).toLocaleDateString("pt-BR")}` : ""}
                {inv.method ? ` · ${inv.method}` : ""}
              </p>
            </div>
          ))}
        </div>
      </PortalCard>
    </div>
  );
}
