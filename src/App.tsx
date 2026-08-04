import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import Reportes from "@/pages/Reportes";
import VslTracking from "@/pages/VslTracking";
import MaquinaCierres from "@/pages/MaquinaCierres";
import MetaAds from "@/pages/MetaAds";
import ContenidoOrganico from "@/pages/ContenidoOrganico";
import Portal from "@/pages/Portal";
import Academia from "@/pages/Academia";
import AuditorVslFunnel from "@/pages/AuditorVslFunnel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Route path="/" element={<ExecutiveDashboard />} />
            <Route path="/dashboard" element={<ExecutiveDashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalle />} />
            <Route path="/setters" element={<Setters />} />
            <Route path="/closers" element={<Closers />} />
            <Route path="/finanzas" element={<Finanzas />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/vsl-tracking" element={<VslTracking />} />
            <Route path="/maquina-cierres" element={<MaquinaCierres />} />
            <Route path="/tareas" element={<Tareas />} />
            <Route path="/meta-ads" element={<MetaAds />} />
            <Route path="/contenido" element={<ContenidoOrganico />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/academia" element={<Academia />} />
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
