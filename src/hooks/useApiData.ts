import { keepPreviousData, useQuery, type QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

type ApiDataState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

/** Dados permanecem “frescos” na navegação; depois disso só atualiza em segundo plano. */
const STALE_TIME_MS = 30 * 60_000;
/** Mantém cache em memória ao sair da tela (ex.: voltar ao admin no mesmo dia). */
const GC_TIME_MS = 24 * 60 * 60_000;

export function useApiData<T>(path: string, initialData: T): ApiDataState<T> {
  const query = useQuery({
    queryKey: ["api", path],
    queryFn: async () => {
      const res = await apiRequest<unknown>(path);
      return normalizeApiPayload<T>(res, initialData);
    },
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    placeholderData: path === "/api/clients" ? undefined : keepPreviousData,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: path === "/api/clients" ? "always" : true,
  });

  let raw = (query.isError ? initialData : (query.data ?? initialData)) as T;
  if (path === "/api/clients" && Array.isArray(initialData) && !Array.isArray(raw)) {
    raw = initialData;
  }
  const data = raw;
  const loading = query.isPending;
  const error = query.isError
    ? query.error instanceof Error
      ? query.error.message
      : "Nao foi possivel carregar dados da API."
    : null;

  return { data, loading, error };
}

/** Pré-carrega a mesma chave usada em `useApiData` (ex.: ao montar o admin). */
export function prefetchApiPath(queryClient: QueryClient, path: string) {
  return queryClient.prefetchQuery({
    queryKey: ["api", path],
    queryFn: async (): Promise<unknown> => {
      const res = await apiRequest<unknown>(path);
      return normalizeApiPayload<unknown>(res, [] as unknown);
    },
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/** Chaves comuns onde APIs aninham a lista real dentro de `data`. */
const NESTED_LIST_KEYS = ["clients", "items", "rows", "results", "records", "content", "list", "data"] as const;

/**
 * Alguns proxies/backends devolvem:
 * - lista pura `[...]`
 * - objeto indexado `{"0":{...},"1":{...}}`
 * - `{ items: [...] }` ou `{ clients: [...] }` ou aninhado `{ clients: { data: [...] } }`
 * Sem normalizar, `useApiData<[]>` recebe objeto e o `<select>` fica só em "Selecione".
 */
function coerceListShape(inner: unknown, depth = 0): unknown {
  if (depth > 8) return inner;
  if (inner === null || inner === undefined) return inner;
  if (Array.isArray(inner)) return inner;
  if (typeof inner !== "object") return inner;
  const o = inner as Record<string, unknown>;

  if (Array.isArray(o.items)) return o.items;

  for (const k of NESTED_LIST_KEYS) {
    if (Object.prototype.hasOwnProperty.call(o, k) && Array.isArray(o[k])) {
      return o[k];
    }
  }

  const keys = Object.keys(o);
  if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
    return keys.sort((a, b) => Number(a) - Number(b)).map((k) => o[k]);
  }

  const arrayValues = Object.values(o).filter((v): v is unknown[] => Array.isArray(v));
  if (arrayValues.length === 1) {
    return arrayValues[0];
  }

  /* Um único objeto-filho (ex.: `{ clients: { data: [...] } }`). */
  const objectValues = Object.values(o).filter(
    (v): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v),
  ) as Record<string, unknown>[];
  if (objectValues.length === 1) {
    const nested = coerceListShape(objectValues[0], depth + 1);
    if (Array.isArray(nested)) return nested;
  }

  return inner;
}

function unwrapDataField(data: unknown): unknown {
  if (typeof data === "string") {
    const t = data.trim();
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        return JSON.parse(t) as unknown;
      } catch {
        return data;
      }
    }
  }
  return data;
}

function normalizeApiPayload<T>(payload: unknown, initialData: T): T {
  if (payload === null || payload === undefined) return initialData;
  if (typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")) {
    const raw = unwrapDataField((payload as { data: unknown }).data);
    const inner = coerceListShape(raw);
    /**
     * Listas (ex.: GET /api/clients → `{ data: [...] }`): se `inner` não for array,
     * o cache virava objeto e o `<select>` não renderizava opções.
     */
    if (Array.isArray(initialData) && !Array.isArray(inner)) {
      if (Array.isArray(raw)) return raw as T;
      return initialData;
    }
    return inner as T;
  }
  if (typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "user")) {
    return (payload as { user: T }).user;
  }
  return payload as T;
}
