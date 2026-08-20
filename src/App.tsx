import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import ExecutiveDashboard from "@/pages/ExecutiveDashboard";
import Tareas from "@/pages/Tareas";
import Finanzas from "@/pages/Finanzas";
import Setters from "@/pages/Setters";
import Closers from "@/pages/Closers";
import Clientes from "@/pages/Clientes";
import ClienteDetalle from "@/pages/ClienteDetalle";
import ClientesGlobalDashboard from "@/pages/ClientesGlobalDashboard";
import Reportes from "@/pages/Reportes";
import VslTracking from "@/pages/VslTracking";
import MaquinaCierres from "@/pages/MaquinaCierres";
import MetaAds from "@/pages/MetaAds";
import ContenidoOrganico from "@/pages/ContenidoOrganico";
import ToriiVslFunnel from "@/pages/ToriiVslFunnel";
import ToriiSocialFunnel from "@/pages/ToriiSocialFunnel";
import ToriiClientes from "@/pages/ToriiClientes";
import Portal from "@/pages/Portal";
import Academia from "@/pages/Academia";
import AuditorVslFunnel from "@/pages/AuditorVslFunnel";
import Landings from "@/pages/Landings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Redirects de compatibilidad para las rutas viejas (/clientes/:id/...) —
// preserva :tab/:subtab al saltar a la ruta canónica nueva (/c/:id/...).
// Cualquier navigate()/Link que haya quedado apuntando a /clientes/*
// (bookmarks, o algún rincón del código que no se tocó en el rediseño)
// sigue funcionando, solo con un hop de redirect extra.
function RedirectClientPath() {
  const { id, tab, subtab } = useParams<{ id: string; tab?: string; subtab?: string }>();
  let path = `/c/${id}`;
  if (tab) path += `/${tab}`;
  if (subtab) path += `/${subtab}`;
  return <Navigate to={path} replace />;
}

// Igual que <Navigate> pero preservando el query string — necesario para
// /vsl-tracking?landing=X (el deep-link del mini-resumen de métricas de
// VSL Funnel), que un <Navigate to="/torii/vsl-tracking"> simple pisaría.
function RedirectPreserveQuery({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}

function Unauthorized() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm px-4">
        <h1 className="text-xl font-semibold">Acceso no autorizado</h1>
        <p className="text-sm text-muted-foreground">
          Tu cuenta no tiene un rol asignado en el Hub. Contactá a un administrador si creés que esto es un error.
        </p>
        <button
          onClick={signOut}
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, isAuditor, hasAccess } = useAuth();

  // isAuditor/hasAccess stay undefined until the user_roles lookup
  // resolves — wait for it too, otherwise a client or an auditor would
  // flash the full Hub for a moment before being cut down to size.
  if (isLoading || (isAuthenticated && hasAccess === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Auth alone is not enough: Supabase Auth is shared with torii-portal, so
  // a client logging into the Portal has a valid session here too. Only a
  // recognized Hub role (admin/moderator/auditor) grants entry — 'client'
  // and no-row-at-all both land here.
  if (!hasAccess) {
    return <Unauthorized />;
  }

  // Auditor role: exactly 3 routes exist for this user, nothing else — not
  // just hidden from the sidebar, genuinely unreachable. Any other path
  // (typed by hand, an old bookmark, whatever) redirects to /dashboard,
  // the default landing.
  if (isAuditor) {
    return (
      <Routes>
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<AuditorVslFunnel />} />
              <Route path="/meta-ads" element={<MetaAds />} />
              <Route path="/vsl-tracking" element={<VslTracking />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="*" element={
        <Layout>
          <Routes>
            {/* Home — Salud de la cartera (Vista Global), sin ninguna
                subcuenta elegida todavía. Antes "/" era el Dashboard
                Ejecutivo; ese ahora vive en /torii/dashboard. */}
            <Route path="/" element={<Clientes />} />

            {/* Torii (portafolio) — rutas canónicas */}
            <Route path="/torii" element={<Navigate to="/torii/dashboard" replace />} />
            <Route path="/torii/dashboard" element={<ExecutiveDashboard />} />
            <Route path="/torii/finanzas" element={<Finanzas />} />
            <Route path="/torii/closing" element={<Closers />} />
            <Route path="/torii/setting" element={<Setters />} />
            <Route path="/torii/vsl-tracking" element={<VslTracking />} />
            <Route path="/torii/meta-ads" element={<MetaAds />} />
            <Route path="/torii/maquina-cierres" element={<MaquinaCierres />} />
            <Route path="/torii/contenido" element={<ContenidoOrganico />} />
            <Route path="/torii/vsl-funnel" element={<ToriiVslFunnel />} />
            <Route path="/torii/social-funnel" element={<ToriiSocialFunnel />} />
            <Route path="/torii/clientes" element={<ToriiClientes />} />
            <Route path="/torii/tareas" element={<Tareas />} />
            <Route path="/torii/portal" element={<Portal />} />
            <Route path="/torii/reportes" element={<Reportes />} />
            <Route path="/torii/landings" element={<Landings />} />
            <Route path="/torii/academia" element={<Academia />} />

            {/* Clientes (subcuenta puntual) — rutas canónicas */}
            <Route path="/c/:id" element={<ClienteDetalle />} />
            <Route path="/c/:id/:tab" element={<ClienteDetalle />} />
            <Route path="/c/:id/:tab/:subtab" element={<ClienteDetalle />} />

            {/* Redirects de compatibilidad — rutas viejas, ver
                RedirectClientPath/RedirectPreserveQuery arriba. */}
            <Route path="/dashboard" element={<Navigate to="/torii/dashboard" replace />} />
            <Route path="/finanzas" element={<Navigate to="/torii/finanzas" replace />} />
            <Route path="/closers" element={<Navigate to="/torii/closing" replace />} />
            <Route path="/setters" element={<Navigate to="/torii/setting" replace />} />
            <Route path="/vsl-tracking" element={<RedirectPreserveQuery to="/torii/vsl-tracking" />} />
            <Route path="/maquina-cierres" element={<Navigate to="/torii/maquina-cierres" replace />} />
            <Route path="/contenido" element={<Navigate to="/torii/contenido" replace />} />
            <Route path="/tareas" element={<Navigate to="/torii/tareas" replace />} />
            <Route path="/portal" element={<Navigate to="/torii/portal" replace />} />
            <Route path="/reportes" element={<Navigate to="/torii/reportes" replace />} />
            <Route path="/landings" element={<Navigate to="/torii/landings" replace />} />
            <Route path="/academia" element={<Navigate to="/torii/academia" replace />} />
            <Route path="/clientes" element={<Navigate to="/" replace />} />
            <Route path="/clientes/global" element={<ClientesGlobalDashboard />} />
            <Route path="/clientes/:id" element={<RedirectClientPath />} />
            <Route path="/clientes/:id/:tab" element={<RedirectClientPath />} />
            <Route path="/clientes/:id/:tab/:subtab" element={<RedirectClientPath />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
