import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type MarketingMetricsValues = {
  meta_account_id: string;
  meta_account_name: string;
  meta_spend: string;
  meta_leads: string;
  meta_conversions: string;
  google_account_id: string;
  google_account_name: string;
  google_spend: string;
  google_leads: string;
  google_conversions: string;
  organic_spend: string;
  organic_leads: string;
  organic_conversions: string;
  outros_spend: string;
  outros_leads: string;
  outros_conversions: string;
};

export const emptyMarketingMetricsValues = (): MarketingMetricsValues => ({
  meta_account_id: "",
  meta_account_name: "",
  meta_spend: "0,00",
  meta_leads: "0",
  meta_conversions: "0",
  google_account_id: "",
  google_account_name: "",
  google_spend: "0,00",
  google_leads: "0",
  google_conversions: "0",
  organic_spend: "0,00",
  organic_leads: "0",
  organic_conversions: "0",
  outros_spend: "0,00",
  outros_leads: "0",
  outros_conversions: "0",
});

export type MarketingMetricsApiRow = {
  meta_account_id?: string | null;
  meta_account_name?: string | null;
  meta_spend?: number;
  meta_leads?: number;
  meta_conversions?: number;
  google_account_id?: string | null;
  google_account_name?: string | null;
  google_spend?: number;
  google_leads?: number;
  google_conversions?: number;
  organic_spend?: number;
  organic_leads?: number;
  organic_conversions?: number;
  outros_spend?: number;
  outros_leads?: number;
  outros_conversions?: number;
};

export function metricsFromApiRow(row: MarketingMetricsApiRow | null | undefined): MarketingMetricsValues {
  const v = emptyMarketingMetricsValues();
  if (!row) return v;
  const spend = (n: number | undefined) =>
    Number.isFinite(n) ? (n as number).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00";
  const intStr = (n: number | undefined) => (Number.isFinite(n) ? String(Math.trunc(n as number)) : "0");
  return {
    meta_account_id: row.meta_account_id ?? "",
    meta_account_name: row.meta_account_name ?? "",
    meta_spend: spend(row.meta_spend),
    meta_leads: intStr(row.meta_leads),
    meta_conversions: intStr(row.meta_conversions),
    google_account_id: row.google_account_id ?? "",
    google_account_name: row.google_account_name ?? "",
    google_spend: spend(row.google_spend),
    google_leads: intStr(row.google_leads),
    google_conversions: intStr(row.google_conversions),
    organic_spend: spend(row.organic_spend),
    organic_leads: intStr(row.organic_leads),
    organic_conversions: intStr(row.organic_conversions),
    outros_spend: spend(row.outros_spend),
    outros_leads: intStr(row.outros_leads),
    outros_conversions: intStr(row.outros_conversions),
  };
}

export function parseSpendInput(s: string): number {
  const t = s.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

export function parseIntInput(s: string): number {
  const t = s.trim().replace(/\D/g, "");
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function isMetaChannelEmpty(v: MarketingMetricsValues): boolean {
  return (
    parseSpendInput(v.meta_spend) === 0 &&
    parseIntInput(v.meta_leads) === 0 &&
    parseIntInput(v.meta_conversions) === 0
  );
}

function isGoogleChannelEmpty(v: MarketingMetricsValues): boolean {
  return (
    parseSpendInput(v.google_spend) === 0 &&
    parseIntInput(v.google_leads) === 0 &&
    parseIntInput(v.google_conversions) === 0
  );
}

function isOrganicChannelEmpty(v: MarketingMetricsValues): boolean {
  return (
    parseSpendInput(v.organic_spend) === 0 &&
    parseIntInput(v.organic_leads) === 0 &&
    parseIntInput(v.organic_conversions) === 0
  );
}

function isOutrosChannelEmpty(v: MarketingMetricsValues): boolean {
  return (
    parseSpendInput(v.outros_spend) === 0 &&
    parseIntInput(v.outros_leads) === 0 &&
    parseIntInput(v.outros_conversions) === 0
  );
}

/** Corpo JSON para POST /api/marketing-metrics (campos numéricos já convertidos). */
export function metricsValuesToPayload(
  clientId: number,
  periodLabel: string,
  values: MarketingMetricsValues,
): Record<string, string | number | null> {
  return {
    client_id: clientId,
    period_label: periodLabel.trim(),
    meta_account_id: null,
    meta_account_name: null,
    meta_spend: parseSpendInput(values.meta_spend),
    meta_leads: parseIntInput(values.meta_leads),
    meta_conversions: parseIntInput(values.meta_conversions),
    google_account_id: null,
    google_account_name: null,
    google_spend: parseSpendInput(values.google_spend),
    google_leads: parseIntInput(values.google_leads),
    google_conversions: parseIntInput(values.google_conversions),
    organic_spend: parseSpendInput(values.organic_spend),
    organic_leads: parseIntInput(values.organic_leads),
    organic_conversions: parseIntInput(values.organic_conversions),
    outros_spend: parseSpendInput(values.outros_spend),
    outros_leads: parseIntInput(values.outros_leads),
    outros_conversions: parseIntInput(values.outros_conversions),
  };
}

type Props = {
  mode: "edit" | "read";
  values: MarketingMetricsValues;
  onChange?: (next: MarketingMetricsValues) => void;
  className?: string;
  /** No portal: esconde cards 100% vazios para não parecer obrigatório preencher os 4. */
  hideEmptyChannels?: boolean;
};

function Field({
  label,
  readOnly,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  readOnly: boolean;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const base =
    "h-9 w-full rounded-md border border-border/80 bg-background/80 px-3 text-sm text-text-1 placeholder:text-text-3/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  if (readOnly) {
    return (
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-text-3">{label}</p>
        <div className={`${base} flex items-center text-text-1`}>{value || "—"}</div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-text-3">{label}</Label>
      <Input
        className={`${base} border-input bg-card/60`}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

export function MarketingMetricsBoard({ mode, values, onChange, className, hideEmptyChannels }: Props) {
  const readOnly = mode === "read";
  const hideEmpty = readOnly && hideEmptyChannels === true;
  const set = (patch: Partial<MarketingMetricsValues>) => {
    if (!onChange) return;
    onChange({ ...values, ...patch });
  };

  const cardClass =
    "rounded-xl border border-border/80 bg-card/40 p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/5";

  const showMeta = !hideEmpty || !isMetaChannelEmpty(values);
  const showGoogle = !hideEmpty || !isGoogleChannelEmpty(values);
  const showOrganic = !hideEmpty || !isOrganicChannelEmpty(values);
  const showOutros = !hideEmpty || !isOutrosChannelEmpty(values);

  return (
    <div className={["grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4", className].filter(Boolean).join(" ")}>
      {showMeta ? (
      <div className={cardClass}>
        <p className="mb-3 text-sm font-bold text-text-1">Meta Ads</p>
        <div className="space-y-3">
          <Field
            label="Gasto (R$)"
            readOnly={readOnly}
            value={values.meta_spend}
            inputMode="decimal"
            onChange={(v) => set({ meta_spend: v })}
          />
          <Field label="Leads" readOnly={readOnly} value={values.meta_leads} inputMode="numeric" onChange={(v) => set({ meta_leads: v })} />
          <Field
            label="Conversões"
            readOnly={readOnly}
            value={values.meta_conversions}
            inputMode="numeric"
            onChange={(v) => set({ meta_conversions: v })}
          />
        </div>
      </div>
      ) : null}

      {showGoogle ? (
      <div className={cardClass}>
        <p className="mb-3 text-sm font-bold text-text-1">Google Ads</p>
        <div className="space-y-3">
          <Field
            label="Gasto (R$)"
            readOnly={readOnly}
            value={values.google_spend}
            inputMode="decimal"
            onChange={(v) => set({ google_spend: v })}
          />
          <Field label="Leads" readOnly={readOnly} value={values.google_leads} inputMode="numeric" onChange={(v) => set({ google_leads: v })} />
          <Field
            label="Conversões"
            readOnly={readOnly}
            value={values.google_conversions}
            inputMode="numeric"
            onChange={(v) => set({ google_conversions: v })}
          />
        </div>
      </div>
      ) : null}

      {showOrganic ? (
      <div className={cardClass}>
        <p className="mb-3 text-sm font-bold text-text-1">Orgânico</p>
        <div className="space-y-3">
          <Field
            label="Gasto (R$)"
            readOnly={readOnly}
            value={values.organic_spend}
            inputMode="decimal"
            onChange={(v) => set({ organic_spend: v })}
          />
          <Field label="Leads" readOnly={readOnly} value={values.organic_leads} inputMode="numeric" onChange={(v) => set({ organic_leads: v })} />
          <Field
            label="Conversões"
            readOnly={readOnly}
            value={values.organic_conversions}
            inputMode="numeric"
            onChange={(v) => set({ organic_conversions: v })}
          />
        </div>
      </div>
      ) : null}

      {showOutros ? (
      <div className={cardClass}>
        <p className="mb-3 text-sm font-bold text-text-1">Outros</p>
        <div className="space-y-3">
          <Field
            label="Gasto (R$)"
            readOnly={readOnly}
            value={values.outros_spend}
            inputMode="decimal"
            onChange={(v) => set({ outros_spend: v })}
          />
          <Field label="Leads" readOnly={readOnly} value={values.outros_leads} inputMode="numeric" onChange={(v) => set({ outros_leads: v })} />
          <Field
            label="Conversões"
            readOnly={readOnly}
            value={values.outros_conversions}
            inputMode="numeric"
            onChange={(v) => set({ outros_conversions: v })}
          />
        </div>
      </div>
      ) : null}
      {hideEmpty && !showMeta && !showGoogle && !showOrganic && !showOutros ? (
        <p className="col-span-full text-sm text-text-3">Nenhuma métrica de canal registrada neste período.</p>
      ) : null}
    </div>
  );
}
