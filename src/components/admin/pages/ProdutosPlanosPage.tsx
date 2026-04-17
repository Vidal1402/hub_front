import { Card, CardContent } from "@/components/ui/card";
import { useApiData } from "@/hooks/useApiData";

export function ProdutosPlanosPage() {
  const { data, loading, error } = useApiData<{ id: number | string; name: string; price?: number }[]>("/api/plans", []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-1">Produtos / Planos</h1>
        <p className="text-sm text-text-3">Dados de planos vindos da API</p>
      </div>
      {error && <p className="text-xs text-tag-amber">Endpoint /api/plans indisponível ou sem dados.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && <p className="text-xs text-text-3">Carregando...</p>}
        {!loading && data.length === 0 && <p className="text-xs text-text-3">Nenhum plano retornado.</p>}
        {data.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-text-1">{plan.name}</p>
              <p className="text-xs text-text-3">
                {typeof plan.price === "number"
                  ? `R$ ${plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "Sem preço"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
