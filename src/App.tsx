import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Colaborador from "./pages/Colaborador";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

type SessionLike = { user?: { role?: string } } | null;

function ProtectedRoute({ children, session }: { children: React.ReactNode; session: SessionLike }) {
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({
  children,
  session,
  allow,
  fallback,
}: {
  children: React.ReactNode;
  session: SessionLike;
  allow: string[];
  fallback: string;
}) {
  if (!session) return <Navigate to="/login" replace />;
  const role = session.user?.role || "cliente";
  if (!allow.includes(role)) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}

function AuthGate() {
  const { session, loading } = useAuth();
  const role = session?.user?.role || "cliente";
  const defaultPath = role === "admin" ? "/admin" : role === "colaborador" ? "/colaborador" : "/";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to={defaultPath} replace /> : <Login />} />
      <Route
        path="/admin"
        element={
          <RoleRoute session={session} allow={["admin"]} fallback={defaultPath}>
            <Admin />
          </RoleRoute>
        }
      />
      <Route
        path="/colaborador"
        element={
          <RoleRoute session={session} allow={["colaborador", "admin"]} fallback={defaultPath}>
            <Colaborador />
          </RoleRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute session={session}>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
