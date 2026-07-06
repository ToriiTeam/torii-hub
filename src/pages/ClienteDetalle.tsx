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
import TabMetaAds from '@/components/clientes/TabMetaAds';
import TabCreativos from '@/components/clientes/TabCreativos';
import TabHipotesis from '@/components/clientes/TabHipotesis';
import TabCRMCalls from '@/components/clientes/TabCRMCalls';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  offer_type: string;
  start_date?: string;
  end_date?: string;
  status: 'activo' | 'pausado' | 'finalizado' | 'cancelado';
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
  notes?: string;
  mrr?: number;
  renewal_risk?: string;
  renewal_probability?: number;
  task_phase?: string;
  result_phase?: string;
  days_in_phase?: number;
}

const statusColors: Record<string, string> = {
  activo: 'bg-success/20 text-success',
  pausado: 'bg-warning/20 text-warning',
  finalizado: 'bg-info/20 text-info',
  cancelado: 'bg-destructive/20 text-destructive',
};

const statusLabels: Record<string, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

const TABS = [
  { value: 'ficha', label: 'Ficha Operativa' },
  { value: 'basica', label: 'Ficha Básica' },
  { value: 'csb', label: 'CSB' },
  { value: 'csl', label: 'CSL' },
  { value: 'ads', label: 'Meta Ads' },
  { value: 'creativos', label: 'Creativos' },
  { value: 'hipotesis', label: 'Hipótesis' },
  { value: 'calls', label: 'CRM Calls' },
];

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ficha');

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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

        <TabsContent value="csb">
          <TabCSB clientId={client.id} />
        </TabsContent>

        <TabsContent value="csl">
          <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed border-border/50 rounded-lg">
            CSL — próximamente
          </div>
        </TabsContent>

        <TabsContent value="ads">
          <TabMetaAds clientId={client.id} />
        </TabsContent>

        <TabsContent value="creativos">
          <TabCreativos clientId={client.id} />
        </TabsContent>

        <TabsContent value="hipotesis">
          <TabHipotesis clientId={client.id} />
        </TabsContent>

        <TabsContent value="calls">
          <TabCRMCalls clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
