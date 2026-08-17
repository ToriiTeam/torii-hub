import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Edit2, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CancelClientDialog } from '@/features/clientes/components/CancelClientDialog';
import TabEstrategiaCliente from '@/components/clientes/TabEstrategiaCliente';
import TabCreativosCliente from '@/components/clientes/TabCreativosCliente';
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

// Los antiguos 9 tabs sueltos (Ficha Operativa/Básica/Onboarding/Roadmap/
// CSB/CSL y Árbol de Iteraciones/Ángulos/Creativos) se agruparon en
// Estrategia y Creativos respectivamente — ver TabEstrategiaCliente.tsx/
// TabCreativosCliente.tsx (sub-tabs internos, estado local, sin ruta
// propia). Los 5 de acá son TODOS deep-linkeables vía /clientes/:id/:tab.
const TABS = [
  { value: 'estrategia', label: 'Estrategia' },
  { value: 'creativos', label: 'Creativos' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'closing', label: 'Closing' },
  { value: 'contenido', label: 'Contenido Orgánico' },
];

// 'estrategia' es el default — mantiene la URL limpia /clientes/:id, sin
// sufijo, mismo criterio que tenía 'ficha' antes de este cambio.
const DEFAULT_TAB = 'estrategia';

export default function ClienteDetalle() {
  const { id, tab: urlTab } = useParams<{ id: string; tab?: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  // Contador (no boolean) para que el atajo del header dispare el modo
  // edición de TabFichaBasica cada vez que se clickea, incluso si ya
  // estabas en Estrategia/Ficha Básica y el valor "no cambiaría".
  const [autoEditTrigger, setAutoEditTrigger] = useState(0);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Los 5 tabs son todos deep-linkeables — la URL es la única fuente de
  // verdad, sin estado local propio. Cambiar de tab (dashboard→closing) NO
  // dispara un re-fetch del cliente — fetchClient solo depende de :id.
  const effectiveTab = urlTab && TABS.some((t) => t.value === urlTab) ? urlTab : DEFAULT_TAB;

  function handleTabChange(value: string) {
    navigate(value === DEFAULT_TAB ? `/clientes/${id}` : `/clientes/${id}/${value}`);
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setAutoEditTrigger((n) => n + 1); handleTabChange('estrategia'); }}
          >
            <Edit2 className="h-4 w-4 mr-1.5" />Editar
          </Button>
          {client.status !== 'cancelled' && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setCancelDialogOpen(true)}>
              <Ban className="h-4 w-4 mr-1.5" />Cancelar cliente
            </Button>
          )}
        </div>
      </div>

      <CancelClientDialog
        client={client}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onCancelled={fetchClient}
      />

      {/* Tabs */}
      <Tabs value={effectiveTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
          {TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="estrategia">
          <TabEstrategiaCliente client={client} onClientUpdate={fetchClient} autoEditTrigger={autoEditTrigger} />
        </TabsContent>

        <TabsContent value="creativos">
          <TabCreativosCliente clientId={client.id} />
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
