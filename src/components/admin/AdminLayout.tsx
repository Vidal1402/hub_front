import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar, type AdminNavPage } from "./AdminTopbar";
import { VisaoGeralPage } from "./pages/VisaoGeralPage";
import { ClientesPage } from "./pages/ClientesPage";
import { ProducaoAdminPage } from "./pages/ProducaoAdminPage";
import { Lock } from "lucide-react";
import { FinanceiroAdminPage } from "./pages/FinanceiroAdminPage";
import { ProdutosPlanosPage } from "./pages/ProdutosPlanosPage";
import { ComercialPage } from "./pages/ComercialPage";
import { RelatoriosAdminPage } from "./pages/RelatoriosAdminPage";
import { ConfigAdminPage } from "./pages/ConfigAdminPage";
import { useAuth } from "@/hooks/useAuth";
import { prefetchApiPath } from "@/hooks/useApiData";

function SecaoEmBreveAdmin({ titulo }: { titulo: string }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/40 text-text-3">
        <Lock className="h-8 w-8" aria-hidden />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-text-1">{titulo}</h2>
        <p className="mt-2 text-sm text-text-3">Em breve</p>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState<AdminNavPage>("visao-geral");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, loading: authLoading, signOut } = useAuth();

  useEffect(() => {
    if (authLoading || !session?.token) return;
    const paths = ["/api/clients", "/api/tasks", "/api/invoices"] as const;
    for (const path of paths) {
      void prefetchApiPath(queryClient, path);
    }
  }, [queryClient, authLoading, session?.token]);

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar
        page={page}
        setPage={setPage}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={signOut}
      />
      <main className="flex-1 min-h-screen overflow-y-auto">
        <AdminTopbar onMenuClick={() => setMobileOpen(true)} onNavigate={setPage} />
        <div className="p-4 md:p-6 lg:p-8">
          {page === "visao-geral" && <VisaoGeralPage />}
          {page === "clientes" && <ClientesPage />}
          {page === "producao" && <ProducaoAdminPage />}
          {page === "colaboradores" && <SecaoEmBreveAdmin titulo="Colaboradores" />}
          {page === "financeiro" && <FinanceiroAdminPage />}
          {page === "produtos" && <ProdutosPlanosPage />}
          {page === "comercial" && <ComercialPage />}
          {page === "alertas" && <SecaoEmBreveAdmin titulo="Alertas" />}
          {page === "relatorios" && <RelatoriosAdminPage />}
          {page === "config" && <ConfigAdminPage />}
        </div>
      </main>
    </div>
  );
}
