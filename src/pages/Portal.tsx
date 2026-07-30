import { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Globe } from 'lucide-react';
import TabPortalCliente from '@/components/clientes/TabPortalCliente';
import TabVideosDocs from '@/components/clientes/TabVideosDocs';
import TabPortalCreativos from '@/components/clientes/TabPortalCreativos';
import TabPortalVentas from '@/components/clientes/TabPortalVentas';
import type { Client } from '@/pages/ClienteDetalle';

interface ClientOption { id: string; name: string; }

const TABS = [
  { value: 'fases', label: 'Fases' },
  { value: 'videos-docs', label: 'Videos y Docs' },
  { value: 'creativos', label: 'Creativos' },
  { value: 'ventas', label: 'Ventas' },
];

function ComingSoon({ label }: { label: string }) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-12 text-center text-muted-foreground">
        {label} — próximamente.
      </CardContent>
    </Card>
  );
}

export default function Portal() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [client, setClient] = useState<Client | null>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [activeTab, setActiveTab] = useState('fases');

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setClients(data ?? []));
  }, []);

  const fetchClient = useCallback(async () => {
    if (!selectedClientId) { setClient(null); return; }
    setLoadingClient(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', selectedClientId)
      .single();
    if (!error && data) setClient(data as Client);
    setLoadingClient(false);
  }, [selectedClientId]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Portal</h1>
          <p className="text-sm text-muted-foreground">Gestión del Portal del cliente — fases, videos, documentos y más</p>
        </div>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-64 h-9 bg-secondary/50 text-sm">
            <SelectValue placeholder="Seleccioná un cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedClientId ? (
        <Card className="bg-card border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Globe className="h-10 w-10 opacity-40" />
            Seleccioná un cliente para gestionar su Portal.
          </CardContent>
        </Card>
      ) : loadingClient || !client ? (
        <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
            {TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="fases">
            <TabPortalCliente client={client} onClientUpdate={fetchClient} />
          </TabsContent>

          <TabsContent value="videos-docs">
            <TabVideosDocs clientId={client.id} />
          </TabsContent>

          <TabsContent value="creativos">
            <TabPortalCreativos clientId={client.id} />
          </TabsContent>

          <TabsContent value="ventas">
            <TabPortalVentas clientId={client.id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
