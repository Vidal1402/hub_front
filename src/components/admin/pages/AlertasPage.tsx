import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiData } from "@/hooks/useApiData";
import { AlertTriangle, Bell, Users } from "lucide-react";

type InvoiceRow = {
  id: number;
  invoice_code?: string;
  status?: string;
  amount?: number;
  due_date?: string | null;
};

type ClientRow = {
  id: number;
  name?: string;
  empresa?: string;
  status?: string;
};

function isPaidStatus(status: string | undefined): boolean {
  return /^(pago|paid)$/i.test(String(status || "").trim());
}

function parseDue(due: string | null | undefined): Date | null {
  if (!due) return null;
  const d = new Date(due);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isOverdueDueDate(due: string | null | undefined): boolean {
  const d = parseDue(due ?? undefined);
  if (!d) return false;
  return startOfDay(d) < startOfDay(new Date());
}

export function AlertasPage() {
  const invoices = useApiData<InvoiceRow[]>("/api/invoices", []);
  const clients = useApiData<ClientRow[]>("/api/clients", []);

  const invoiceAlerts = useMemo(() => {
    const list = Array.isArray(invoices.data) ? invoices.data : [];
    const out: {
      id: number;
      kind: "vencida" | "vence_breve" | "status";
      titulo: string;
      detalhe: string;
      severidade: "alta" | "media" | "baixa";
    }[] = [];

    for (const inv of list) {
      const st = String(inv.status || "").trim();
      const code = inv.invoice_code || `INV-${inv.id}`;
      const valor = Number(inv.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      const overdue = isOverdueDueDate(inv.due_date);
      const paid = isPaidStatus(st);

      if (paid) continue;

      const due = parseDue(inv.due_date ?? undefined);
      let daysToDue: number | null = null;
      if (due) {
        const diff = startOfDay(due).getTime() - startOfDay(new Date()).getTime();
        daysToDue = Math.round(diff / (24 * 60 * 60 * 1000));
      }

      const stLower = st.toLowerCase();
      if (overdue || ["vencido", "overdue", "atrasado"].includes(stLower)) {
        out.push({
          id: inv.id,
          kind: "vencida",
          titulo: `Cobrança vencida · ${code}`,
          detalhe: `R$ ${valor}${inv.due_date ? ` · vencia em ${new Date(inv.due_date).toLocaleDateString("pt-BR")}` : ""}`,
          severidade: "alta",
        });
        continue;
      }

      if (daysToDue !== null && daysToDue >= 0 && daysToDue <= 5) {
        out.push({
          id: inv.id,
          kind: "vence_breve",
          titulo: `Vence em breve · ${code}`,
          detalhe:
            daysToDue === 0
              ? `R$ ${valor} · vence hoje`
              : `R$ ${valor} · ${daysToDue} dia(s) para o vencimento (${new Date(inv.due_date!).toLocaleDateString("pt-BR")})`,
          severidade: daysToDue <= 2 ? "media" : "baixa",
        });
        continue;
      }

      if (["pendente", "pending", "aberto"].includes(stLower) && !overdue) {
        out.push({
          id: inv.id,
          kind: "status",
          titulo: `Fatura em aberto · ${code}`,
          detalhe: `R$ ${valor} · status ${st || "—"}`,
          severidade: "baixa",
        });
      }
    }

    return out;
  }, [invoices.data]);

  const clientAlerts = useMemo(() => {
    const list = Array.isArray(clients.data) ? clients.data : [];
    return list
      .filter((c) => {
        const s = (c.status || "").toLowerCase();
        return s === "inadimplente" || s === "pausado";
      })
      .map((c) => ({
        id: c.id,
        titulo: `Cliente ${(c.status || "").toLowerCase() === "inadimplente" ? "inadimplente" : "pausado"} · ${c.empresa || c.name || `#${c.id}`}`,
        detalhe: `Revise contrato e cobrança antes de novas entregas.`,
        severidade: (c.status || "").toLowerCase() === "inadimplente" ? ("alta" as const) : ("media" as const),
      }));
  }, [clients.data]);

  const loading = invoices.loading || clients.loading;
  const error = invoices.error || clients.error;
  const total = invoiceAlerts.length + clientAlerts.length;

  const badgeClass = (s: "alta" | "media" | "baixa") =>
    s === "alta"
      ? "bg-tag-red-bg text-tag-red border-tag-red/25"
      : s === "media"
        ? "bg-tag-amber-bg text-tag-amber border-tag-amber/25"
        : "bg-muted text-text-3 border-border";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-1">Alertas</h1>
        <p className="text-sm text-text-3">
          Resumo automático a partir de faturas e status de clientes. Sem configuração extra — atualiza com os dados da API.
        </p>
      </div>

      {error && (
        <p className="text-xs text-tag-amber bg-tag-amber-bg border border-tag-amber/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tag-red-bg text-tag-red">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[11px] text-text-3 uppercase tracking-wide">Prioridade</p>
              <p className="text-lg font-bold text-text-1">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell size={20} />
            </div>
            <div>
              <p className="text-[11px] text-text-3 uppercase tracking-wide">Financeiro</p>
              <p className="text-lg font-bold text-text-1">{invoiceAlerts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tag-amber-bg text-tag-amber">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] text-text-3 uppercase tracking-wide">Clientes</p>
              <p className="text-lg font-bold text-text-1">{clientAlerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Lista de alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {loading && <p className="text-xs text-text-3 py-4">Carregando dados…</p>}
          {!loading && total === 0 && (
            <p className="text-xs text-text-3 py-6">
              Nada crítico no momento: sem faturas vencidas ou clientes inadimplentes/pausados detectados nos filtros atuais.
            </p>
          )}
          {!loading &&
            [...invoiceAlerts, ...clientAlerts.map((a) => ({ ...a, kind: "cliente" as const }))].map((a, idx) => (
              <div
                key={`${"kind" in a ? a.kind : "inv"}-${a.id}-${idx}`}
                className="flex gap-3 py-3 border-b border-border last:border-0"
              >
                <span
                  className={`shrink-0 self-start mt-0.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${badgeClass(a.severidade)}`}
                >
                  {a.severidade}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-1">{a.titulo}</p>
                  <p className="text-[11px] text-text-3 mt-0.5">{a.detalhe}</p>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
