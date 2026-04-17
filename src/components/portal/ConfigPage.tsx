import { PortalCard, PageHeader } from "./Primitives";
import { useApiData } from "@/hooks/useApiData";

type UserMe = { id: number; name: string; email: string; role: string };

export function ConfigPage() {
  const { data, loading, error } = useApiData<UserMe | null>("/api/auth/me", null);

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Dados da conta autenticada" />
      <PortalCard>
        <div className="p-5">
          {loading && <p className="text-xs text-text-3">Carregando...</p>}
          {error && <p className="text-xs text-tag-amber">Não foi possível carregar os dados do usuário.</p>}
          {!loading && data && (
            <div className="space-y-2">
              <p className="text-xs text-text-3">Nome</p>
              <p className="text-sm font-semibold text-text-1">{data.name}</p>
              <p className="text-xs text-text-3">Email</p>
              <p className="text-sm font-semibold text-text-1">{data.email}</p>
              <p className="text-xs text-text-3">Perfil</p>
              <p className="text-sm font-semibold text-text-1">{data.role}</p>
            </div>
          )}
          {!loading && !data && !error && <p className="text-xs text-text-3">Sem dados de usuário.</p>}
        </div>
      </PortalCard>
    </div>
  );
}
