import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { PortfolioView } from '@/features/executive-dashboard/components/PortfolioView';
import { ClientView } from '@/features/executive-dashboard/components/ClientView';
import { ToriiView } from '@/features/executive-dashboard/components/ToriiView';
import { PeriodSelector } from '@/features/executive-dashboard/components/shared/PeriodSelector';
import { fetchPortfolioData } from '@/features/executive-dashboard/lib/fetchPortfolioData';
import { fetchClientData } from '@/features/executive-dashboard/lib/fetchClientData';
import { fetchToriiData } from '@/features/executive-dashboard/lib/fetchToriiData';
import { getPeriodRange, type PeriodType, type PresetKey } from '@/features/executive-dashboard/lib/periodRange';
import type { PortfolioData, ClientDetailData, ToriiData } from '@/features/executive-dashboard/types';

const ALL_CLIENTS = 'all';
const TORII = 'torii';

interface ClientOption { id: string; name: string; }

function navMonth(year: number, month: number, dir: 'prev' | 'next'): { year: number; month: number } {
  if (dir === 'prev') return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export default function ExecutiveDashboard() {
  const now = new Date();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>(ALL_CLIENTS);

  const [periodType, setPeriodType] = useState<PeriodType>('preset');
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [customSince, setCustomSince] = useState(() => now.toISOString().slice(0, 10));
  const [customUntil, setCustomUntil] = useState(() => now.toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [clientData, setClientData] = useState<ClientDetailData | null>(null);
  const [toriiData, setToriiData] = useState<ToriiData | null>(null);

  const range = getPeriodRange({ periodType, preset, year, month, customSince, customUntil });

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => setClients(data ?? []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { since, until, isShortPeriod } = range;

    const load = selectedClient === ALL_CLIENTS
      ? fetchPortfolioData(since, until).then((data) => { if (!cancelled) { setPortfolioData(data); setClientData(null); setToriiData(null); } })
      : selectedClient === TORII
      ? fetchToriiData(since, until).then((data) => { if (!cancelled) { setToriiData(data); setPortfolioData(null); setClientData(null); } })
      : fetchClientData(selectedClient, since, until, isShortPeriod).then((data) => { if (!cancelled) { setClientData(data); setPortfolioData(null); setToriiData(null); } });

    load
      .catch((err) => console.error('[ExecutiveDashboard] load failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, periodType, preset, year, month, customSince, customUntil]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Dashboard Ejecutivo</h1>
          <p className="text-sm text-muted-foreground">Vista consolidada de ads, closing, revenue y VSL por cliente</p>
        </div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-52 h-9 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CLIENTS}>Todos los clientes</SelectItem>
            <SelectItem value={TORII}>Torii</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <PeriodSelector
        periodType={periodType}
        preset={preset}
        monthLabel={range.label}
        customSince={customSince}
        customUntil={customUntil}
        onPresetChange={(p) => { setPeriodType('preset'); setPreset(p); }}
        onModeChange={setPeriodType}
        onNavMonth={(dir) => { const n = navMonth(year, month, dir); setYear(n.year); setMonth(n.month); }}
        onCustomChange={(since, until) => { setCustomSince(since); setCustomUntil(until); }}
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : selectedClient === ALL_CLIENTS ? (
        portfolioData && <PortfolioView data={portfolioData} />
      ) : selectedClient === TORII ? (
        toriiData && <ToriiView data={toriiData} />
      ) : (
        clientData && <ClientView data={clientData} />
      )}
    </div>
  );
}
