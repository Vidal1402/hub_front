import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiData } from "@/hooks/useApiData";

export function ComercialPage() {
  const { data, loading, error } = useApiData<{ id: number; name: string; empresa: string; valor: number; status: string }>("/api/clients", [] as any);
  const stageByStatus = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "ativo") return "Fechado";
    if (s === "pausado") return "Negociação";
    if (s === "inadimplente") return "Risco";
    return "Lead";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-1">Comercial</h1>
        <p className="text-sm text-text-3">Pipeline comercial com base no status dos clientes</p>
      </div>
      {error && <p className="text-xs text-tag-amber">Não foi possível carregar pipeline comercial.</p>}
      <Card>
        <CardHeader><CardTitle className="text-sm">Oportunidades</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-xs text-text-3">Carregando...</p>}
          {!loading && (data as any[]).length === 0 && <p className="text-xs text-text-3">Nenhuma oportunidade retornada.</p>}
          {(data as any[]).map((item) => (
            <div key={item.id} className="py-2 border-b border-border last:border-0">
              <p className="text-xs font-semibold text-text-1">{item.empresa || item.name}</p>
              <p className="text-[11px] text-text-3">
                R$ {Number(item.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · {stageByStatus(item.status)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
