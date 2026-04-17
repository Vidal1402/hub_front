import { useEffect, useState } from "react";
import { apiRequest, clearStoredSession, clearStoredSessionHard, getStoredSession, type ApiSession } from "@/lib/api";

export function useAuth() {
  const [session, setSession] = useState<ApiSession | null>(() => getStoredSession());
  const [loading, setLoading] = useState(true);

  const isAuthInvalidMessage = (message: string) => {
    const m = message.toLowerCase();
    return (
      m.includes("token inválido") ||
      m.includes("assinatura inválida") ||
      m.includes("token expirado") ||
      m.includes("usuário inválido")
    );
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      const stored = getStoredSession();
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const me = await apiRequest<{ user: ApiSession["user"] }>("/api/auth/me", {
          token: stored.token,
        });
        setSession({ token: stored.token, user: me.user });
      } catch (err) {
        // Só limpe a sessão se for realmente erro de autenticação (401/Token inválido).
        // Em falhas temporárias (500/rede/proxy), mantenha o token para não criar loop de redirect.
        const message = err instanceof Error ? err.message : String(err);
        if (isAuthInvalidMessage(message)) {
          clearStoredSession();
          setSession(null);
        } else {
          setSession(stored);
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrapSession();

    const onAuthChanged = () => {
      const stored = getStoredSession();
      if (!stored) {
        setSession(null);
        return;
      }
      setSession(stored);
    };

    window.addEventListener("storage", onAuthChanged);
    window.addEventListener("auth-changed", onAuthChanged as EventListener);

    return () => {
      window.removeEventListener("storage", onAuthChanged);
      window.removeEventListener("auth-changed", onAuthChanged as EventListener);
    };
  }, []);

  const signOut = async () => {
    clearStoredSessionHard();
    setSession(null);
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/login";
  };

  return { session, loading, signOut };
}
