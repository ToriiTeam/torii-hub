import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import TabFichaOperativa from '@/components/clientes/TabFichaOperativa';
import TabFichaBasica from '@/components/clientes/TabFichaBasica';
import TabCSB from '@/components/clientes/TabCSB';
import TabCSL from '@/components/clientes/TabCSL';
import CreativeTree from '@/components/clientes/creative-tree/CreativeTree';
import TabCreativos from '@/components/clientes/TabCreativos';
import TabAngulos from '@/components/clientes/TabAngulos';
import TabOnboarding from '@/components/clientes/TabOnboarding';
import TabRoadmap from '@/components/clientes/TabRoadmap';
import TabDashboardCliente from '@/components/clientes/TabDashboardCliente';
import TabClosingCliente from '@/components/clientes/TabClosingCliente';
import TabContenidoCliente from '@/components/clientes/TabContenidoCliente';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  offer_type: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'paused' | 'finished' | 'cancelled';
  payment_type: string;
  total_installments: number;
  paid_installments: number;
  installment_amount: number;
  total_amount?: number;
  next_due_date?: string;
  platform: string;
  platform_fee: number;
  country?: string;
  canal?: string;
  canal_captacion?: string;
  oferta?: string;
  notes?: string;
  mrr?: number;
  renewal_risk?: string;
  renewal_probability?: number;
  task_phase?: string;
  result_phase?: string;
  days_in_phase?: number;
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
  profile_id?: string | null;
}

const statusColors: Record<string, string> = {
  active: 'bg-success/20 text-success',
  paused: 'bg-warning/20 text-warning',
  finished: 'bg-info/20 text-info',
  cancelled: 'bg-destructive/20 text-destructive',
};

const statusLabels: Record<string, string> = {
  active: 'Activo',
  paused: 'Pausado',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

const TABS = [
  { value: 'ficha', label: 'Ficha Operativa' },
  { value: 'basica', label: 'Ficha Básica' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'csb', label: 'CSB' },
  { value: 'csl', label: 'CSL' },
  { value: 'arbol', label: 'Árbol de Iteraciones' },
  { value: 'angulos', label: 'Ángulos' },
  { value: 'creativos', label: 'Creativos' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'closing', label: 'Closing' },
  { value: 'contenido', label: 'Contenido Orgánico' },
];

// Únicos 3 tabs deep-linkeables (/clientes/:id/dashboard, etc.) — los otros
// 9 siguen siendo puro estado local (activeTab), sin ruta propia.
const URL_TABS = ['dashboard', 'closing', 'contenido'];

export default function ClienteDetalle() {
  const { id, tab: urlTab } = useParams<{ id: string; tab?: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ficha');

  // Los 3 tabs deep-linkeables mandan cuando la URL los trae; si no,
  // gobierna el estado local de siempre (los 9 tabs viejos, sin ruta
  // propia). Cambiar de sub-ruta (dashboard→closing) NO dispara un
  // re-fetch del cliente — fetchClient solo depende de :id, más abajo.
  const effectiveTab = urlTab && URL_TABS.includes(urlTab) ? urlTab : activeTab;

  function handleTabChange(value: string) {
    if (URL_TABS.includes(value)) {
      navigate(`/clientes/${id}/${value}`);
    } else {
      setActiveTab(value);
      if (urlTab) navigate(`/clientes/${id}`, { replace: true });
    }
  }

  useEffect(() => {
    if (id) fetchClient();
  }, [id]);

  const fetchClient = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id!)
      .single();
    if (!error && data) setClient(data as Client);
    setLoading(false);
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );

  if (!client) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-muted-foreground">Cliente no encontrado</p>
      <Button variant="outline" onClick={() => navigate('/clientes')}>
        <ArrowLeft className="h-4 w-4 mr-2" />Volver
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{client.name}</h1>
          <p className="text-muted-foreground text-sm">
            {client.email || 'Sin email'}
            {client.country && ` • ${client.country}`}
            {client.task_phase && ` • ${client.task_phase}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={cn('text-sm border-0', statusColors[client.status])}>
            {statusLabels[client.status]}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => navigate('/clientes')}>
            <Edit2 className="h-4 w-4 mr-1.5" />Editar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={effectiveTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
          {TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ficha">
          <TabFichaOperativa client={client} onClientUpdate={fetchClient} />
        </TabsContent>

        <TabsContent value="basica">
          <TabFichaBasica client={client} onClientUpdate={fetchClient} />
        </TabsContent>

        <TabsContent value="onboarding">
          <TabOnboarding clientId={client.id} />
        </TabsContent>

        <TabsContent value="roadmap">
          <TabRoadmap clientId={client.id} />
        </TabsContent>

        <TabsContent value="csb">
          <TabCSB clientId={client.id} />
        </TabsContent>

        <TabsContent value="csl">
          <TabCSL clientId={client.id} />
        </TabsContent>

        <TabsContent value="arbol">
          <CreativeTree clientId={client.id} />
        </TabsContent>

        <TabsContent value="angulos">
          <TabAngulos clientId={client.id} />
        </TabsContent>

        <TabsContent value="creativos">
          <TabCreativos clientId={client.id} />
        </TabsContent>

        <TabsContent value="dashboard">
          <TabDashboardCliente clientId={client.id} />
        </TabsContent>

        <TabsContent value="closing">
          <TabClosingCliente clientId={client.id} />
        </TabsContent>

        <TabsContent value="contenido">
          <TabContenidoCliente clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
