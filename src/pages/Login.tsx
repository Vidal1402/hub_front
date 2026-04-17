import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { loginWithApi, storeSession } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const session = await loginWithApi(email, password);
      storeSession(session);
      window.dispatchEvent(new Event("auth-changed"));

      const role = session.user?.role;
      if (role === "admin") {
        window.location.href = "/admin";
      } else if (role === "colaborador") {
        window.location.href = "/colaborador";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const isNetwork =
        raw.startsWith("NETWORK_ERROR:") ||
        raw === "Failed to fetch" ||
        raw.includes("Load failed") ||
        raw.includes("NetworkError");

      let description: string;
      if (isNetwork) {
        if (raw.startsWith("NETWORK_ERROR:")) {
          const detail = raw.slice("NETWORK_ERROR:".length).trim();
          description =
            (detail || "Falha de rede.") +
            " No DevTools → Network, ative “Preserve log” e procure POST /api/auth/login (ou login em vermelho).";
        } else {
          description =
            "O navegador não completou a requisição. No Network, filtro “Fetch/XHR”, Preserve log ligado, tente de novo.";
        }
      } else if (raw.toLowerCase().includes("credenciais") || raw.toLowerCase().includes("inválid")) {
        description = "E-mail ou senha incorretos.";
      } else {
        description = raw || "Não foi possível entrar.";
      }

      toast({
        title: isNetwork ? "Sem conexão com a API" : "Erro ao entrar",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="United Hub" className="h-8 object-contain" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-bold text-foreground text-center mb-1">Bem-vindo de volta</h1>
          <p className="text-xs text-muted-foreground text-center mb-6">
            Entre com suas credenciais para acessar o portal
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Entrar
            </button>
          </form>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-6">
          © {new Date().getFullYear()} United Hub. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
