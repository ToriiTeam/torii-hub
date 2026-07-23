import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  ALL_CHANNELS, CHANNELS, CHANNEL_LABELS,
  type ChannelFilter, type ContentPillar, type ContentMechanism, type ContentHypothesis,
  type ContentCalendarItem, type ContentPhaseStatusRow, type ContentPhaseGate, type ContentMetricsTanda,
} from '@/components/contenido/types';
import TabPilares from '@/components/contenido/TabPilares';
import TabFases from '@/components/contenido/TabFases';
import TabBitacora from '@/components/contenido/TabBitacora';
import TabCalendario from '@/components/contenido/TabCalendario';
import TabMetricasTanda from '@/components/contenido/TabMetricasTanda';

const TORII = 'torii';

interface ClientOption { id: string; name: string; }

const TABS = [
  { value: 'pilares', label: 'Pilares y Mecanismos', Component: TabPilares },
  { value: 'fases', label: 'Fases y KPIs', Component: TabFases },
  { value: 'hipotesis', label: 'Bitácora de Hipótesis', Component: TabBitacora },
  { value: 'calendario', label: 'Calendario', Component: TabCalendario },
  { value: 'metricas', label: 'Métricas por Tanda', Component: TabMetricasTanda },
];

export default function ContenidoOrganico() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>(TORII);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(ALL_CHANNELS);
  const [activeTab, setActiveTab] = useState('pilares');

  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [mechanisms, setMechanisms] = useState<ContentMechanism[]>([]);
  const [hypotheses, setHypotheses] = useState<ContentHypothesis[]>([]);
  const [calendar, setCalendar] = useState<ContentCalendarItem[]>([]);
  const [phaseStatus, setPhaseStatus] = useState<ContentPhaseStatusRow[]>([]);
  const [phaseGates, setPhaseGates] = useState<ContentPhaseGate[]>([]);
  const [metricsTanda, setMetricsTanda] = useState<ContentMetricsTanda[]>([]);
  const [loading, setLoading] = useState(true);

  const clientId = selectedClient === TORII ? null : selectedClient;

  useEffect(() => {
    supabase.from('clients').select('id, name').eq('status', 'active').order('name')
      .then(({ data }) => setClients(data ?? []));
  }, []);

  // Full datasets for the selected client, loaded once — every tab
  // filters/aggregates client-side, same pattern as Finanzas.tsx. Pillars
  // and mechanisms are shared catalogs (not scoped by client_id) and are
  // always fetched in full regardless of the client selector.
  const fetchData = useCallback(async () => {
    setLoading(true);

    // Torii (clientId === null) needs `.is('client_id', null)` — `.eq()`
    // with a null value doesn't translate to "IS NULL" in PostgREST.
    const [
      pillarsRes, mechanismsRes, hypothesesRes, calendarRes,
      phaseStatusRes, phaseGatesRes, metricsTandaRes,
    ] = await Promise.all([
      supabase.from('content_pillars').select('*').order('nombre'),
      supabase.from('content_mechanisms').select('*').order('nombre'),
      clientId === null
        ? supabase.from('content_hypotheses').select('*').is('client_id', null).order('created_at', { ascending: false })
        : supabase.from('content_hypotheses').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      clientId === null
        ? supabase.from('content_calendar').select('*').is('client_id', null).order('fecha_programada', { ascending: true })
        : supabase.from('content_calendar').select('*').eq('client_id', clientId).order('fecha_programada', { ascending: true }),
      clientId === null
        ? supabase.from('content_phase_status').select('*').is('client_id', null)
        : supabase.from('content_phase_status').select('*').eq('client_id', clientId),
      clientId === null
        ? supabase.from('content_phase_gates').select('*').is('client_id', null).order('from_phase')
        : supabase.from('content_phase_gates').select('*').eq('client_id', clientId).order('from_phase'),
      clientId === null
        ? supabase.from('content_metrics_tanda').select('*').is('client_id', null).order('semana')
        : supabase.from('content_metrics_tanda').select('*').eq('client_id', clientId).order('semana'),
    ]);

    if (pillarsRes.data) setPillars(pillarsRes.data);
    if (mechanismsRes.data) setMechanisms(mechanismsRes.data);
    if (hypothesesRes.data) setHypotheses(hypothesesRes.data);
    if (calendarRes.data) setCalendar(calendarRes.data);
    if (phaseStatusRes.data) setPhaseStatus(phaseStatusRes.data);
    if (phaseGatesRes.data) setPhaseGates(phaseGatesRes.data);
    if (metricsTandaRes.data) setMetricsTanda(metricsTandaRes.data);

    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tabProps = {
    clientId,
    channelFilter,
    pillars,
    mechanisms,
    hypotheses,
    calendar,
    phaseStatus,
    phaseGates,
    metricsTanda,
    loading,
    refetch: fetchData,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Contenido Orgánico</h1>
          <p className="text-sm text-muted-foreground">Pilares, fases, hipótesis y calendario de producción de contenido</p>
        </div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-48 h-9 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TORII}>Torii</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as ChannelFilter)}>
          <SelectTrigger className="w-40 h-9 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CHANNELS}>Todos los canales</SelectItem>
            {CHANNELS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ value, Component }) => (
          <TabsContent key={value} value={value}>
            <Component {...tabProps} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
