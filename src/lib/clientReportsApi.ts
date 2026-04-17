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

export type ReportAttachmentMeta = {
  attachment_id?: number | null;
  filename: string;
  mime_type: string;
  size: number;
  /** Presente só em GET /api/client-reports/:id (detalhe com arquivo). */
  data_base64?: string;
};

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
  attachments?: ReportAttachmentMeta[];
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

  const attachmentsRaw = r.attachments;
  const attachments: ReportAttachmentMeta[] = Array.isArray(attachmentsRaw)
    ? attachmentsRaw
        .filter((a): a is Record<string, unknown> => a != null && typeof a === "object" && !Array.isArray(a))
        .map((a) => {
          const b64 =
            typeof a.data_base64 === "string"
              ? a.data_base64
              : typeof a.data === "string"
                ? a.data
                : undefined;
          return {
            attachment_id: a.attachment_id != null ? Number(a.attachment_id) : null,
            filename: String(a.filename ?? "arquivo"),
            mime_type: String(a.mime_type ?? "application/octet-stream"),
            size: Number(a.size ?? 0) || 0,
            data_base64: b64,
          };
        })
    : [];

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
    attachments,
  };
}
