/**
 * Contrato do backend (Mongo / commit reposi): `client_reports` usa `summary`, não `description`.
 * O front mantém `description` + `period_label` na UI; serializamos em `summary` para a API.
 */

export function parseClientReportSummaryFromApi(summary: string | null | undefined): {
  period_label: string;
  description: string;
} {
  const s = String(summary ?? "").replace(/^\uFEFF/, "").trim();
  if (!s) return { period_label: "", description: "" };
  const m = /^\[([^\]\r\n]+)\]\s*(?:\r?\n\r?\n([\s\S]*))?$/u.exec(s);
  if (m) {
    return { period_label: m[1].trim(), description: (m[2] ?? "").trim() };
  }
  return { period_label: "", description: s };
}

export function buildClientReportSummaryForApi(periodLabel: string, description: string): string | null {
  const p = periodLabel.trim();
  const d = description.trim();
  if (p && d) return `[${p}]\n\n${d}`;
  if (p) return `[${p}]`;
  if (d) return d;
  return null;
}

export type NormalizedClientReport = {
  id: number | string;
  client_id: number | string;
  title: string;
  url: string;
  description: string;
  period_label: string | null;
  summary: string | null;
  client_name?: string;
  client_empresa?: string;
  created_at?: string;
};

export function normalizeClientReportFromApi(r: Record<string, unknown>): NormalizedClientReport {
  const id = r.id;
  const clientId = r.client_id;
  const rawSummary =
    r.summary != null && String(r.summary).trim() !== ""
      ? String(r.summary)
      : r.description != null
        ? String(r.description)
        : "";
  const parsed = parseClientReportSummaryFromApi(rawSummary);
  const explicitPeriod =
    r.period_label != null && String(r.period_label).trim() !== "" ? String(r.period_label).trim() : "";

  return {
    id: typeof id === "number" || typeof id === "string" ? id : 0,
    client_id: typeof clientId === "number" || typeof clientId === "string" ? clientId : 0,
    title: String(r.title ?? ""),
    url: String(r.url ?? ""),
    description: parsed.description,
    period_label: explicitPeriod || (parsed.period_label ? parsed.period_label : null),
    summary: rawSummary || null,
    client_name: r.client_name != null ? String(r.client_name) : undefined,
    client_empresa: r.client_empresa != null ? String(r.client_empresa) : undefined,
    created_at: typeof r.created_at === "string" ? r.created_at : undefined,
  };
}
