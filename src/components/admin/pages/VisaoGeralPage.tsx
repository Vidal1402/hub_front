import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useApiData } from "@/hooks/useApiData";

type ClientRow = { id: number; status?: string; plano?: string; valor?: number };
type TaskRow = { id: number; status?: string };
type InvoiceRow = { id: number; amount?: number; status?: string };

const PIE_COLORS = [
  "hsl(217 91% 50%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(271 91% 65%)",
  "hsl(0 84% 60%)",
  "hsl(188 94% 43%)",
];

const chartConfig = {
  value: { label: "Quantidade", color: PIE_COLORS[0] },
  total: { label: "Total (R$)", color: PIE_COLORS[0] },
} as const;

function countByName(items: { name: string }[]) {
  const map = new Map<string, number>();
  for (const { name } of items) {
    const k = name.trim() || "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value], i) => ({
    name,
    value,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));
}

export function VisaoGeralPage() {
  const clients = useApiData<ClientRow[]>("/api/clients", []);
  const tasks = useApiData<TaskRow[]>("/api/tasks", []);
  const invoices = useApiData<InvoiceRow[]>("/api/invoices", []);

  const invoiceList = Array.isArray(invoices.data) ? invoices.data : [];

  const totalAmount = invoiceList.reduce((acc, item) => acc + Number(item.amount ?? 0), 0);
  const doneTasks = tasks.data.filter((t) =>
    ["entregue", "done", "concluido", "concluído"].includes((t.status || "").toLowerCase()),
  ).length;

  const clientsByStatus = useMemo(
    () => countByName(clients.data.map((c) => ({ name: (c.status || "sem status").toLowerCase() }))),
    [clients.data],
  );

  const tasksByStatus = useMemo(
    () => countByName(tasks.data.map((t) => ({ name: (t.status || "sem status").toLowerCase() }))),
    [tasks.data],
  );

  const invoicesByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of invoiceList) {
      const s = (inv.status || "—").trim() || "—";
      map.set(s, (map.get(s) ?? 0) + Number(inv.amount ?? 0));
    }
    return Array.from(map.entries()).map(([status, total], i) => ({
      status,
      total,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [invoiceList]);

  const chartsLoading = clients.loading && clients.data.length === 0;
  const hasAnyChartData =
    clientsByStatus.length > 0 || tasksByStatus.length > 0 || invoicesByStatus.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-1">Visão Geral</h1>
        <p className="text-sm text-text-3">Resumo executivo carregado da API</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-3">Clientes</p>
            <p className="text-xl font-bold">{clients.data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-3">Tarefas</p>
            <p className="text-xl font-bold">{tasks.data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-3">Concluídas</p>
            <p className="text-xl font-bold">{doneTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-3">Faturado</p>
            <p className="text-xl font-bold">R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {(clients.error || tasks.error || invoices.error) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aviso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-tag-amber">Nem todos os endpoints responderam.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-text-1">Clientes por status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {chartsLoading && <p className="text-xs text-text-3 py-8 text-center">Carregando...</p>}
            {!chartsLoading && clientsByStatus.length === 0 && (
              <p className="text-xs text-text-3 py-8 text-center">Sem clientes para exibir.</p>
            )}
            {clientsByStatus.length > 0 && (
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[260px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                  <Pie data={clientsByStatus} dataKey="value" nameKey="name" innerRadius={52} strokeWidth={2}>
                    {clientsByStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-text-1">Tarefas por status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {chartsLoading && <p className="text-xs text-text-3 py-8 text-center">Carregando...</p>}
            {!chartsLoading && tasksByStatus.length === 0 && (
              <p className="text-xs text-text-3 py-8 text-center">Sem tarefas para exibir.</p>
            )}
            {tasksByStatus.length > 0 && (
              <ChartContainer config={chartConfig} className="aspect-[4/3] max-h-[280px] w-full">
                <BarChart data={tasksByStatus} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-16}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {tasksByStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-text-1">Faturamento por status de fatura</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {chartsLoading && <p className="text-xs text-text-3 py-8 text-center">Carregando...</p>}
            {!chartsLoading && invoicesByStatus.length === 0 && (
              <p className="text-xs text-text-3 py-8 text-center">Sem faturas para exibir.</p>
            )}
            {invoicesByStatus.length > 0 && (
              <ChartContainer config={chartConfig} className="aspect-[5/2] max-h-[300px] w-full">
                <BarChart data={invoicesByStatus} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="status" width={100} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span>R$ {Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {invoicesByStatus.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {!chartsLoading && !hasAnyChartData && !(clients.error || tasks.error || invoices.error) && (
        <p className="text-xs text-text-3 text-center">Cadastre clientes, tarefas ou faturas para ver os gráficos.</p>
      )}
    </div>
  );
}
