import { Bell, ChevronDown, Download, Menu, Plus } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApiData } from "@/hooks/useApiData";

export type AdminNavPage =
  | "visao-geral"
  | "clientes"
  | "producao"
  | "colaboradores"
  | "financeiro"
  | "produtos"
  | "comercial"
  | "alertas"
  | "relatorios"
  | "config";

interface Props {
  onMenuClick: () => void;
  onNavigate: (page: AdminNavPage) => void;
}

function formatCurrencyCompactBrl(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `R$ ${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(1)}k`;
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function AdminTopbar({ onMenuClick, onNavigate }: Props) {
  const clients = useApiData<Array<Record<string, unknown>>>("/api/clients", []);
  const invoices = useApiData<Array<{ amount?: number; status?: string }>>("/api/invoices", []);

  const { mrrLabel, clientesLabel, aReceberLabel } = useMemo(() => {
    const list = Array.isArray(clients.data) ? clients.data : [];
    const mrr = list.reduce((acc, row) => acc + Number(row.valor ?? 0), 0);
    const clientes = list.length;

    const inv = Array.isArray(invoices.data) ? invoices.data : [];
    const pending = inv.filter((i) => !/^(pago|paid)$/i.test(String(i.status ?? "").trim()));
    const aReceber = pending.reduce((acc, i) => acc + Number(i.amount ?? 0), 0);

    return {
      mrrLabel: formatCurrencyCompactBrl(mrr),
      clientesLabel: String(clientes),
      aReceberLabel: formatCurrencyCompactBrl(aReceber),
    };
  }, [clients.data, invoices.data]);

  return (
    <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border px-4 md:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-2 hover:bg-muted bg-transparent border border-border cursor-pointer md:hidden"
        >
          <Menu size={18} />
        </button>
        <div className="hidden sm:flex items-center gap-4">
          <Stat label="MRR" value={clients.loading && !clients.data.length ? "…" : mrrLabel} hint="Soma dos planos (valor) dos clientes" />
          <div className="w-px h-6 bg-border" />
          <Stat label="Clientes" value={clients.loading && !clients.data.length ? "…" : clientesLabel} hint="Cadastros ativos na base" />
          <div className="w-px h-6 bg-border" />
          <Stat label="A Receber" value={invoices.loading && !invoices.data.length ? "…" : aReceberLabel} hint="Faturas não pagas (pendentes)" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="hidden sm:flex gap-1.5 text-xs" type="button">
          <Download size={14} /> Exportar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs" type="button">
              <Plus size={14} /> Cadastrar
              <ChevronDown size={14} className="opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs font-normal text-text-3">Novo registro</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sm cursor-pointer" onClick={() => onNavigate("clientes")}>
              Cliente
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm cursor-pointer" onClick={() => onNavigate("financeiro")}>
              Cobrança / fatura
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm cursor-pointer" onClick={() => onNavigate("producao")}>
              Tarefa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-normal text-text-3 leading-snug">
              Relatórios, comercial e alertas usam dados já cadastrados (não há cadastro separado).
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          className="relative w-8 h-8 rounded-full flex items-center justify-center text-text-2 hover:bg-muted bg-transparent border border-border cursor-pointer"
        >
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">4</span>
        </button>
        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary cursor-pointer">AD</span>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint}>
      <p className="text-[10px] text-text-3 uppercase tracking-wider font-medium">{label}</p>
      <p className="text-sm font-bold text-text-1 tabular-nums">{value}</p>
    </div>
  );
}
