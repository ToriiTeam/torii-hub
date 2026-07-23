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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, isLoading, isAuditor } = useAuth();

  // isAuditor stays undefined until the has_role lookup resolves — wait for
  // it too, otherwise an auditor would flash the full Hub (and its full
  // sidebar) for a moment before being cut down to size.
  if (isLoading || (isAuthenticated && isAuditor === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Auditor role: exactly 2 routes exist for this user, nothing else — not
  // just hidden from the sidebar, genuinely unreachable. Any other path
  // (typed by hand, an old bookmark, whatever) redirects to /meta-ads.
  if (isAuditor) {
    return (
      <Routes>
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/meta-ads" element={<MetaAds />} />
              <Route path="/vsl-tracking" element={<VslTracking />} />
              <Route path="*" element={<Navigate to="/meta-ads" replace />} />
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
