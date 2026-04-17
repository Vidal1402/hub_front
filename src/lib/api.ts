/** Origem pública da API no Railway. Rotas: `GET /api/clients`, `POST /api/auth/login`, etc. */
const PROD_FALLBACK_API = "https://backflow-production.up.railway.app";

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  organization_id: number;
};

export type ApiSession = {
  token: string;
  user: ApiUser;
};

const TOKEN_KEY = "united_flow_token";
const USER_KEY = "united_flow_user";

function normalizeStoredToken(raw: string | null): string | null {
  if (!raw) return null;
  let token = String(raw).trim();
  if (!token || token === "null" || token === "undefined") return null;
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1).trim();
  }
  if (token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  }
  return token || null;
}

/** Token pode estar só no localStorage da origem certa (porta) ou no sessionStorage. */
function readStoredToken(): string | null {
  const fromStorage = (s: Storage): string | null => {
    const t = normalizeStoredToken(s.getItem(TOKEN_KEY));
    return t || null;
  };
  return fromStorage(localStorage) ?? fromStorage(sessionStorage);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((base64Url.length + 3) % 4);
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function userFromToken(token: string): ApiUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const id = Number(payload.sub ?? 0);
  const role = String(payload.role ?? "cliente");
  const org = Number(payload.org ?? 1);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    name: "",
    email: "",
    role,
    organization_id: Number.isFinite(org) ? org : 1,
  };
}

/**
 * Em desenvolvimento, usa URL relativa `/api` na mesma origem do Vite (proxy em vite.config.ts),
 * evitando CORS no navegador. Em produção, usa `VITE_API_URL` ou o fallback.
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return "";
  }
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") || "";
  if (/^https?:\/\/localhost:8082$/i.test(configured)) {
    return PROD_FALLBACK_API;
  }
  return configured || PROD_FALLBACK_API;
}

export function getStoredSession(): ApiSession | null {
  const token = readStoredToken();
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token) return null;

  // Se o user não existir, ainda mantenha a sessão usando o payload do JWT.
  if (!userRaw) {
    const user =
      userFromToken(token) ?? {
        id: 0,
        name: "",
        email: "",
        role: "cliente",
        organization_id: 1,
      };
    return { token, user };
  }

  try {
    const user = JSON.parse(userRaw) as ApiUser;
    return { token, user };
  } catch {
    // Não remova `united_flow_user` automaticamente.
    // Se estiver corrompido, caia para um user mínimo derivado do JWT (ou padrão).
    const user =
      userFromToken(token) ?? {
        id: 0,
        name: "",
        email: "",
        role: "cliente",
        organization_id: 1,
      };
    return { token, user };
  }
}

export function storeSession(session: ApiSession) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

// Limpeza leve: por padrão, não apaga nada automaticamente.
export function clearStoredSession() {}

// Logout explícito: apaga tudo.
export function clearStoredSessionHard() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
};

function errorMessageFromApiBody(json: Record<string, unknown>, status: number): string {
  const msg = typeof json.message === "string" ? json.message.trim() : "";
  const err = typeof json.error === "string" ? json.error.trim() : "";
  const det =
    json.details != null && String(json.details).trim() !== ""
      ? String(json.details).trim()
      : "";
  const base = msg || err || "";
  if (det && status >= 500) {
    return base ? `${base} (${det})` : det;
  }
  return base || `Erro HTTP ${status}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token ?? getStoredSession()?.token ?? readStoredToken() ?? null;
  const url = `${getApiBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (e) {
    const hint =
      import.meta.env.DEV && url.startsWith("/api")
        ? " Confirme se o Vite está rodando com proxy (/api) e reinicie após mudar vite.config."
        : "";
    const base =
      e instanceof Error
        ? e.message
        : "Falha de rede";
    throw new Error(`NETWORK_ERROR:${base}${hint}`);
  }

  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let json: Record<string, unknown> = {};
  if (text.trim() !== "") {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      const snippet = text.replace(/\s+/g, " ").trim().slice(0, 160);
      const looksHtml = /<\/?[a-z][\s\S]*>/i.test(snippet);
      const hint =
        import.meta.env.DEV && looksHtml
          ? " O servidor provavelmente devolveu HTML (erro PHP ou proxy). Verifique deploy do backend e logs do Railway."
          : "";
      throw new Error(
        `Resposta não é JSON (HTTP ${response.status}, ${contentType || "sem Content-Type"}).${hint}` +
          (snippet ? ` Trecho: ${snippet}` : ""),
      );
    }
  }

  if (!response.ok) {
    throw new Error(errorMessageFromApiBody(json, response.status));
  }

  return json as T;
}

export async function loginWithApi(email: string, password: string): Promise<ApiSession> {
  return apiRequest<ApiSession>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    token: null,
  });
}

