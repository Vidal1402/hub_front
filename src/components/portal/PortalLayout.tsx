import { useCallback, useState } from "react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { DashboardPage } from "./DashboardPage";
import { ProducaoPage } from "./ProducaoPage";
import { PerformancePage } from "./PerformancePage";
import { RelatoriosPage } from "./RelatoriosPage";
import { MateriaisPage } from "./MateriaisPage";
import { FinanceiroPage } from "./FinanceiroPage";
import { PlanosPage } from "./PlanosPage";
import { AcademyPage } from "./AcademyPage";
import { SuportePage } from "./SuportePage";
import { ConfigPage } from "./ConfigPage";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard, BarChart3, FolderOpen, Video,
  CreditCard, GraduationCap, LifeBuoy, Settings,
  Bell, Lock, Menu, X, Crown, LogOut, Kanban,
} from "lucide-react";

const NAV_ICONS: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={16} />,
  Kanban: <Kanban size={16} />,
  BarChart3: <BarChart3 size={16} />,
  FolderOpen: <FolderOpen size={16} />,
  Video: <Video size={16} />,
  CreditCard: <CreditCard size={16} />,
  Crown: <Crown size={16} />,
  GraduationCap: <GraduationCap size={16} />,
  LifeBuoy: <LifeBuoy size={16} />,
  Settings: <Settings size={16} />,
};

const NAV = [
  { id: "dashboard", icon: "LayoutDashboard", label: "Dashboard", b: 0 },
  { id: "producao", icon: "Kanban", label: "Produção" },
  { id: "relatorios", icon: "BarChart3", label: "Relatórios" },
  { id: "materiais", icon: "FolderOpen", label: "Materiais" },
  { id: "financeiro", icon: "CreditCard", label: "Financeiro" },
  { id: "planos", icon: "Crown", label: "Planos" },
  { id: "academy", icon: "GraduationCap", label: "Academy" },
  { id: "suporte", icon: "LifeBuoy", label: "Suporte", b: 0 },
  { id: "config", icon: "Settings", label: "Configurações" },
];

function SidebarContent({
  page,
  setPage,
  onClose,
  onLogout,
  userName,
  userRole,
}: {
  page: string;
  setPage: (p: string, opts?: { openCreate?: boolean }) => void;
  onClose?: () => void;
  onLogout: () => void;
  userName: string;
  userRole: string;
}) {
  const initials = userName
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="p-5 pb-3 flex items-center justify-between">
        <img src={logo} alt="United Hub" className="h-7 object-contain" />
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-3 border-none cursor-pointer text-text-2 md:hidden">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="px-4 py-3 mx-3 mb-2 bg-surface-3 rounded-lg flex items-center gap-3 border border-primary/20">
        <span className="w-8 h-8 rounded-lg bg-surface-4 flex items-center justify-center text-xs font-bold text-text-2 shrink-0">{initials || "US"}</span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-1 truncate">{userName}</p>
          <p className="text-[11px] text-text-3 truncate">{userRole}</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {NAV.map((item) => {
          const isLocked = !!(item as any).locked;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (!isLocked) {
                  setPage(item.id);
                  onClose?.();
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all mb-0.5
                ${isLocked ? "opacity-50 cursor-not-allowed" : ""}
                ${page === item.id && !isLocked ? "bg-surface-3 text-text-1" : "bg-transparent text-text-3 hover:bg-surface-3 hover:text-text-2"}`}
            >
              <span className="w-5 flex items-center justify-center">{NAV_ICONS[item.icon]}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {isLocked && <Lock size={12} className="text-text-4" />}
              {item.b && !isLocked && (
                <span className="text-[9px] font-bold bg-primary text-primary-foreground w-4 h-4 rounded-full flex items-center justify-center">
                  {item.b}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-surface-4 flex items-center justify-center text-xs font-bold text-text-2">{initials || "US"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-1 truncate">{userName}</p>
            <p className="text-[10px] text-text-3 truncate">{userRole}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-3 hover:text-destructive hover:bg-destructive/10 bg-transparent border-none cursor-pointer transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

export function PortalLayout() {
  const [page, setPage] = useState("dashboard");
  const [producaoBootOpenCreate, setProducaoBootOpenCreate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { signOut, session } = useAuth();
  const userName = session?.user?.name || "Usuário";
  const userRole = session?.user?.role || "cliente";

  const navigatePortal = useCallback((id: string, opts?: { openCreate?: boolean }) => {
    setPage(id);
    if (id === "producao") {
      setProducaoBootOpenCreate(Boolean(opts?.openCreate));
    } else {
      setProducaoBootOpenCreate(false);
    }
  }, []);

  const clearProducaoBootOpenCreate = useCallback(() => {
    setProducaoBootOpenCreate(false);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-[220px] bg-surface-1 border-r border-border flex flex-col shrink-0 h-screen sticky top-0">
          <SidebarContent page={page} setPage={navigatePortal} onLogout={signOut} userName={userName} userRole={userRole} />
        </aside>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] bg-surface-1 flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <SidebarContent page={page} setPage={navigatePortal} onClose={() => setSidebarOpen(false)} onLogout={signOut} userName={userName} userRole={userRole} />
          </aside>
        </>
      )}

      {/* Main */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 md:px-8 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-text-2 border border-border cursor-pointer"
              >
                <Menu size={18} />
              </button>
            )}
            <div />
          </div>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-text-2 border border-border cursor-pointer hover:bg-surface-4 transition-colors">
              <Bell size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8">
          {page === "dashboard" && <DashboardPage onNav={navigatePortal} />}
          {page === "relatorios" && <RelatoriosPage />}
          {page === "materiais" && <MateriaisPage />}
          {page === "financeiro" && <FinanceiroPage />}
          {page === "planos" && <PlanosPage />}
          {page === "academy" && <AcademyPage />}
          {page === "suporte" && <SuportePage />}
          {page === "config" && <ConfigPage />}
          {page === "producao" && (
            <ProducaoPage bootOpenCreate={producaoBootOpenCreate} onBootOpenCreateConsumed={clearProducaoBootOpenCreate} />
          )}
          {page === "performance" && <PerformancePage />}
        </div>
      </main>
    </div>
  );
}
