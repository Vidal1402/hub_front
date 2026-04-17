import { useState } from "react";
import logo from "@/assets/logo.png";
import {
  LayoutDashboard, Users, Kanban, UserCog, CreditCard, Package,
  TrendingUp, AlertTriangle, FileText, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, X, Lock,
} from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Kanban, UserCog, CreditCard, Package,
  TrendingUp, AlertTriangle, FileText, Settings,
};

const ADMIN_NAV: {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  comingSoon?: boolean;
}[] = [
  { id: "visao-geral", label: "Visão Geral", icon: "LayoutDashboard" },
  { id: "clientes", label: "Clientes", icon: "Users" },
  { id: "producao", label: "Produção", icon: "Kanban" },
  { id: "colaboradores", label: "Colaboradores", icon: "UserCog", comingSoon: true },
  { id: "financeiro", label: "Financeiro", icon: "CreditCard" },
  { id: "produtos", label: "Produtos / Planos", icon: "Package" },
  { id: "comercial", label: "Comercial", icon: "TrendingUp" },
  { id: "alertas", label: "Alertas", icon: "AlertTriangle", comingSoon: true },
  { id: "relatorios", label: "Relatórios", icon: "FileText" },
  { id: "config", label: "Configurações", icon: "Settings" },
];

interface Props {
  page: string;
  setPage: (p: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (o: boolean) => void;
  onLogout: () => void;
}

export function AdminSidebar({ page, setPage, collapsed, setCollapsed, mobileOpen, setMobileOpen, onLogout }: Props) {
  const content = (isMobile: boolean) => (
    <div className={`flex flex-col h-full bg-card border-r border-border ${!isMobile && collapsed ? "w-[68px]" : isMobile ? "w-[260px]" : "w-[240px]"} transition-all duration-200`}>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        {(!collapsed || isMobile) && <img src={logo} alt="Admin" className="h-7 object-contain" />}
        {isMobile ? (
          <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-text-2 bg-transparent border-none cursor-pointer">
            <X size={18} />
          </button>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-text-3 bg-transparent border-none cursor-pointer">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {ADMIN_NAV.map((item) => {
          const Icon = ICONS[item.icon];
          const active = page === item.id;
          if (item.comingSoon) {
            return (
              <button
                key={item.id}
                type="button"
                disabled
                aria-disabled="true"
                title={collapsed && !isMobile ? `${item.label} — em breve` : undefined}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium border-none cursor-not-allowed opacity-65 text-text-3 bg-transparent"
              >
                <Lock size={18} className="shrink-0" aria-hidden />
                {(!collapsed || isMobile) && (
                  <span className="flex-1 text-left min-w-0">
                    <span className="block truncate text-text-2">{item.label}</span>
                    <span className="block text-[10px] font-normal text-text-3 truncate">Em breve</span>
                  </span>
                )}
              </button>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPage(item.id);
                if (isMobile) setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium border-none cursor-pointer transition-all
                ${active ? "bg-primary/10 text-primary font-semibold" : "bg-transparent text-text-2 hover:bg-muted hover:text-text-1"}`}
              title={collapsed && !isMobile ? item.label : undefined}
            >
              {Icon && <Icon size={18} className="shrink-0" />}
              {(!collapsed || isMobile) && <span className="flex-1 text-left truncate">{item.label}</span>}
              {(!collapsed || isMobile) && item.badge && (
                <span className="text-[10px] font-bold bg-destructive text-destructive-foreground w-5 h-5 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">AD</span>
          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-1 truncate">Admin</p>
              <p className="text-[10px] text-text-3 truncate">Super Admin</p>
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-3 hover:text-destructive hover:bg-destructive/10 bg-transparent border-none cursor-pointer transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex h-screen sticky top-0 shrink-0">
        {content(false)}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-foreground/20 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 md:hidden shadow-xl animate-in slide-in-from-left duration-200">
            {content(true)}
          </aside>
        </>
      )}
    </>
  );
}
