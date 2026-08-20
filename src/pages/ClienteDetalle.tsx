import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Edit2, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CancelClientDialog } from '@/features/clientes/components/CancelClientDialog';
import TabDashboardCliente from '@/components/clientes/TabDashboardCliente';
import TabDeliveryOS from '@/components/clientes/TabDeliveryOS';
import TabClosingCliente from '@/components/clientes/TabClosingCliente';
import Setters from '@/pages/Setters';
import VslTracking from '@/pages/VslTracking';
import MetaAds from '@/pages/MetaAds';
import Reportes from '@/pages/Reportes';

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

// Delivery OS es la pantalla principal — absorbe Estrategia (como sub-tab
// "Información"), Creativos (como "VSL Funnel") y Contenido Orgánico (como
// "Social Funnel") como sub-navegación propia, ver TabDeliveryOS.tsx.
// Closing es su propio tab de primer nivel (movido fuera de Delivery OS por
// el rediseño de navegación — reusa TabClosingCliente sin cambios). Estos 3
// son deep-linkeables vía /clientes/:id/:tab — los sub-tabs de Delivery OS
// tienen su propio nivel de URL (/clientes/:id/delivery-os/:subtab), todo lo
// que cuelga de ahí para adentro (ej. los 6 sub-sub-tabs de VSL Funnel) es
// estado local sin ruta propia, mismo criterio que ya usaban
// Estrategia/Creativos antes de esto.
// Setting/VSL/Meta Ads/Reportes — punto B/C del rediseño de navegación:
// antes el sidebar (Layout.tsx::clientNavItems) mandaba estos 4 ítems a las
// páginas globales de Torii (con su propio selector de cliente), sacando al
// usuario de la subcuenta activa. Ahora son tabs de primer nivel acá mismo,
// que montan exactamente los mismos componentes que ya usa Torii
// (Setters/VslTracking/MetaAds/Reportes) pero con fixedClientId — sin
// selector adentro, sin salir de /c/:id.
const TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'delivery-os', label: 'Delivery OS' },
  { value: 'closing', label: 'Closing' },
  { value: 'setting', label: 'Setting' },
  { value: 'vsl', label: 'VSL' },
  { value: 'meta-ads', label: 'Meta Ads' },
  { value: 'reportes', label: 'Reportes' },
];

// 'delivery-os' es el default — mantiene la URL limpia /clientes/:id.
const DEFAULT_TAB = 'delivery-os';

// Sub-tabs de Delivery OS — ver TabDeliveryOS.tsx. 'closing' ya no vive acá,
// ver TABS arriba.
const DELIVERY_OS_SUBTABS = ['resumen', 'informacion', 'vsl-funnel', 'social-funnel'];

export default function ClienteDetalle() {
  const { id, tab: urlTab, subtab: urlSubtab } = useParams<{ id: string; tab?: string; subtab?: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  // Contador (no boolean) para que el atajo del header dispare el modo
  // edición de TabFichaBasica cada vez que se clickea, incluso si ya
  // estabas en Delivery OS/Información/Ficha Básica y el valor "no cambiaría".
  const [autoEditTrigger, setAutoEditTrigger] = useState(0);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Los 2 tabs son deep-linkeables — la URL es la única fuente de verdad,
  // sin estado local propio. Cambiar de tab NO dispara un re-fetch del
  // cliente — fetchClient solo depende de :id.
  const effectiveTab = urlTab && TABS.some((t) => t.value === urlTab) ? urlTab : DEFAULT_TAB;

  // Memoizados con useCallback: identidad estable entre renders para que el
  // useEffect de registro en HeaderNavContext (useRegisterSubsection, dep en
  // row.onChange) no dispare un cleanup+re-registro de más — un re-render de
  // ClienteDetalle/TabDeliveryOS (ej. por un refetch vía canal realtime) no
  // debe hacer parpadear/desaparecer la fila de subsección en el header.
  const handleTabChange = useCallback((value: string) => {
    navigate(value === DEFAULT_TAB ? `/c/${id}` : `/c/${id}/${value}`);
  }, [navigate, id]);

  // Segundo nivel de deep-link, solo para Delivery OS — 'resumen' es su
  // default (URL limpia, mismo criterio que el nivel de arriba).
  const effectiveSubtab = urlSubtab && DELIVERY_OS_SUBTABS.includes(urlSubtab) ? urlSubtab : 'resumen';

  const handleSubtabChange = useCallback((subtab: string) => {
    navigate(subtab === 'resumen' ? `/c/${id}` : `/c/${id}/delivery-os/${subtab}`);
  }, [navigate, id]);

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
      <Button variant="outline" onClick={() => navigate('/')}>
        <ArrowLeft className="h-4 w-4 mr-2" />Volver
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header — sin el nombre del cliente como heading (punto B.3): ya se
          sabe qué cliente es por el SubaccountSwitcher del sidebar/header.
          Email/país/fase y la flecha "volver" se sacaron (ya redundantes
          con el sidebar/switcher) — solo queda el badge de estado y las
          acciones, alineados a la derecha. */}
      <div className="flex items-center justify-end gap-2">
        <Badge className={cn('text-sm border-0', statusColors[client.status])}>
          {statusLabels[client.status]}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setAutoEditTrigger((n) => n + 1); navigate(`/c/${id}/delivery-os/informacion`); }}
        >
          <Edit2 className="h-4 w-4 mr-1.5" />Editar
        </Button>
        {client.status !== 'cancelled' && (
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setCancelDialogOpen(true)}>
            <Ban className="h-4 w-4 mr-1.5" />Cancelar cliente
          </Button>
        )}
      </div>

      <CancelClientDialog
        client={client}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onCancelled={fetchClient}
      />

      {/* La navegación de nivel 1 (Dashboard/Delivery OS/Closing/Setting/
          VSL/Meta Ads/Reportes) ya vive en el sidebar (Layout.tsx::
          clientNavItems) — esta TabsList quedaba 100% duplicada en el
          contenido, ver punto B.1 del rediseño de header. <Tabs> se
          conserva sin TabsList visible, solo para el switching por :tab. */}
      <Tabs value={effectiveTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsContent value="dashboard">
          <TabDashboardCliente clientId={client.id} />
        </TabsContent>

        <TabsContent value="delivery-os">
          <TabDeliveryOS
            client={client}
            onClientUpdate={fetchClient}
            autoEditTrigger={autoEditTrigger}
            activeSubtab={effectiveSubtab}
            onSubtabChange={handleSubtabChange}
          />
        </TabsContent>

        <TabsContent value="closing">
          <TabClosingCliente clientId={client.id} />
        </TabsContent>

        <TabsContent value="setting">
          <Setters fixedClientId={client.id} />
        </TabsContent>

        <TabsContent value="vsl">
          <VslTracking fixedClientId={client.id} />
        </TabsContent>

        <TabsContent value="meta-ads">
          <MetaAds fixedClientId={client.id} />
        </TabsContent>

        <TabsContent value="reportes">
          <Reportes fixedClientId={client.id} fixedClientName={client.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
