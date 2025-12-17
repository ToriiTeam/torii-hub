import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Usuarios from "@/pages/Usuarios";
import Tareas from "@/pages/Tareas";
import Finanzas from "@/pages/Finanzas";
import Setters from "@/pages/Setters";
import Closers from "@/pages/Closers";
import Documentos from "@/pages/Documentos";
import Clientes from "@/pages/Clientes";
import Disponibilidad from "@/pages/Disponibilidad";
import Reportes from "@/pages/Reportes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/tareas" element={<Tareas />} />
        <Route path="/finanzas" element={<Finanzas />} />
        <Route path="/setters" element={<Setters />} />
        <Route path="/closers" element={<Closers />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/disponibilidad" element={<Disponibilidad />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
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
