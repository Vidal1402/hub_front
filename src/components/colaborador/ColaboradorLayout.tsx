import { useState } from "react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { ProducaoPage } from "@/components/portal/ProducaoPage";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Kanban, Bell, Menu, X, LogOut, User,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "producao", icon: Kanban, label: "Minhas Tarefas" },
];

function SidebarContent({
  page,
  setPage,
  onClose,
  onLogout,
  userName,
  initials,
}: {
  page: string;
  setPage: (p: string) => void;
  onClose?: () => void;
  onLogout: () => void;
  userName: string;
  initials: string;
}) {
  return (
    <>
      <div className="p-5 pb-3 flex items-center justify-between">
        <img src={logo} alt="United Hub" className="h-7 object-contain" />
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted border-none cursor-pointer text-muted-foreground md:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-4 py-3 mx-3 mb-2 bg-muted rounded-lg flex items-center gap-3 border border-primary/20">
        <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
          {initials || <User size={16} />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{userName}</p>
          <p className="text-[11px] text-muted-foreground truncate">Colaborador</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setPage(item.id);
              onClose?.();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all mb-0.5
              ${page === item.id ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <item.icon size={16} />
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground">{initials || "CL"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground truncate">Colaborador</p>
          </div>
          <button
            onClick={onLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-transparent border-none cursor-pointer transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

export function ColaboradorLayout() {
  const [page, setPage] = useState("producao");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { signOut, session } = useAuth();
  const userName = session?.user?.name || "Colaborador";
  const initials = userName
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background flex">
      {!isMobile && (
        <aside className="w-[220px] bg-card border-r border-border flex flex-col shrink-0 h-screen sticky top-0">
          <SidebarContent page={page} setPage={setPage} onLogout={signOut} userName={userName} initials={initials} />
        </aside>
      )}

      {isMobile && sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] bg-card flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <SidebarContent page={page} setPage={setPage} onClose={() => setSidebarOpen(false)} onLogout={signOut} userName={userName} initials={initials} />
          </aside>
        </>
      )}

      <main className="flex-1 min-h-screen overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 md:px-8 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border cursor-pointer"
              >
                <Menu size={18} />
              </button>
            )}
            <h1 className="text-sm font-bold text-foreground">Minhas Tarefas</h1>
          </div>
          <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border cursor-pointer hover:bg-accent transition-colors">
            <Bell size={16} />
          </button>
        </div>

        <div className="p-4 md:p-8">
          <ProducaoPage />
        </div>
      </main>
    </div>
  );
}
