import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from "react";
import { Filter, ChevronDown, CheckCircle, X } from "lucide-react";

/* ── Card ── */
export function PortalCard({
  children,
  style = {},
  lift = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  lift?: boolean;
}) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className="bg-card border rounded-lg transition-all duration-200"
      style={{
        borderColor: h && lift ? "hsl(var(--border-strong))" : undefined,
        boxShadow: h && lift ? "var(--tw-shadow)" : undefined,
        transform: h && lift ? "translateY(-2px)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Button ── */
export function PortalBtn({
  children,
  onClick,
  variant = "primary",
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "subtle";
  size?: "sm" | "md" | "lg";
}) {
  const [h, setH] = useState(false);
  const sizeClass = size === "sm" ? "px-3 py-1 text-xs" : size === "lg" ? "px-6 py-2.5 text-sm" : "px-4 py-2 text-xs";
  const variantClass =
    variant === "primary"
      ? `bg-primary text-primary-foreground border border-primary ${h ? "opacity-90" : ""}`
      : variant === "ghost"
        ? `bg-transparent text-text-2 border border-border ${h ? "bg-surface-3" : ""}`
        : `bg-surface-3 text-text-2 border border-border ${h ? "bg-surface-4" : ""}`;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className={`rounded-lg cursor-pointer font-bold transition-all duration-150 ${sizeClass} ${variantClass}`}
    >
      {children}
    </button>
  );
}

/* ── Tag ── */
export function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}

/* ── StatusBadge ── */
const STATUS_MAP: Record<string, { c: string; bg: string }> = {
  Pago: { c: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  Pendente: { c: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  Vencido: { c: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  "Em análise": { c: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  Concluído: { c: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  Confirmada: { c: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  Conectado: { c: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  Desconectado: { c: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { c: "#888", bg: "rgba(128,128,128,0.1)" };
  return <Tag label={status} color={s.c} bg={s.bg} />;
}

/* ── DeltaBadge ── */
export function DeltaBadge({ delta }: { delta: string }) {
  const pos = !delta.startsWith("−");
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{
        color: pos ? "#22C55E" : "#EF4444",
        background: pos ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
      }}
    >
      {delta}
    </span>
  );
}

/* ── FilterPill / FilterBar (legacy) ── */
export function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className={`px-3 py-1 rounded-md cursor-pointer text-xs font-semibold border transition-all duration-150
        ${active ? "border-border-strong bg-surface-3 text-text-1" : `border-border text-text-3 ${h ? "bg-surface-3" : "bg-transparent"}`}`}
    >
      {label}
    </button>
  );
}

export function FilterBar({
  opts,
  active,
  onChange,
  label,
}: {
  opts: string[];
  active: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {label && <span className="text-text-3 text-xs font-medium mr-1">{label}</span>}
      {opts.map((o) => (
        <FilterPill key={o} label={o} active={active === o} onClick={() => onChange(o)} />
      ))}
    </div>
  );
}

/* ── FilterDropdown (standard filter) ── */
export function FilterDropdown({
  options,
  active,
  onChange,
  label = "Filtro",
  icon,
  icons,
}: {
  options: string[];
  active: string;
  onChange: (v: string) => void;
  label?: string;
  icon?: ReactNode;
  icons?: Record<string, ReactNode>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isFiltered = active !== options[0];

  return (
    <div className="flex items-center gap-2">
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all duration-150
            ${open
              ? "bg-primary/10 border-primary text-primary"
              : "bg-surface-3 border-border text-text-2 hover:border-border-strong hover:bg-surface-4"
            }`}
        >
          {icon || <Filter size={14} />}
          <span>{label}</span>
          {isFiltered && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              1
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1.5 w-[220px] bg-card border border-border rounded-xl shadow-lg z-30 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-semibold text-text-3 uppercase tracking-wider">Filtrar por {label.toLowerCase()}</p>
            </div>
            {options.map((opt) => {
              const isActive = active === opt;
              return (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer border-none transition-all
                    ${isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-transparent text-text-2 hover:bg-surface-3"
                    }`}
                >
                  {icons && (
                    <span className={`w-5 flex items-center justify-center ${isActive ? "text-primary" : "text-text-3"}`}>
                      {icons[opt] || <Filter size={14} />}
                    </span>
                  )}
                  <span className="flex-1 text-left">{opt}</span>
                  {isActive && opt !== options[0] && (
                    <CheckCircle size={14} className="text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isFiltered && (
        <button
          onClick={() => onChange(options[0])}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/15 transition-all"
        >
          {icons?.[active]}
          {active}
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/* ── PageHeader ── */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-text-1">{title}</h1>
        {subtitle && <p className="text-text-3 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

/* ── ScoreRing ── */
export function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="block mx-auto">
      <circle cx="70" cy="70" r={r} fill="none" stroke="hsl(var(--surface-3))" strokeWidth="8" />
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke="hsl(var(--primary))" strokeWidth="8"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
      <text x="70" y="66" textAnchor="middle" className="fill-text-1 text-3xl font-bold">{score}</text>
      <text x="70" y="86" textAnchor="middle" className="fill-text-3 text-xs">Score</text>
    </svg>
  );
}

/* ── BarChart ── */
export function PortalBarChart({
  data,
  dataKey = "leads",
}: {
  data: Array<Record<string, any>>;
  dataKey?: string;
}) {
  const max = Math.max(...data.map((d) => d[dataKey]));
  return (
    <div className="flex items-end gap-2 h-20 mt-4">
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const h = Math.max(5, (d[dataKey] / max) * 60);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex flex-col items-center justify-end" style={{ height: 70 }}>
              {isLast && (
                <span className="text-[10px] font-bold text-text-1 mb-1">
                  {d[dataKey].toLocaleString("pt-BR")}
                </span>
              )}
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: h,
                  background: isLast ? "hsl(var(--primary))" : "hsl(var(--surface-4))",
                  minWidth: 16,
                  maxWidth: 28,
                }}
              />
            </div>
            <span className="text-[10px] text-text-3">{d.m}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── FunnelViz ── */
export function FunnelViz({ data }: { data: Array<{ s: string; v: number; p: number }> }) {
  return (
    <div className="flex flex-col gap-3 mt-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-text-3 w-16 text-right shrink-0">{item.s}</span>
          <div className="flex-1 h-6 bg-surface-3 rounded overflow-hidden">
            <div
              className="h-full bg-primary/80 rounded flex items-center justify-end pr-2 transition-all"
              style={{ width: `${item.p}%`, minWidth: 40 }}
            >
              <span className="text-[10px] font-bold text-primary-foreground">
                {item.v.toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-text-3 w-10">{item.p}%</span>
        </div>
      ))}
    </div>
  );
}
