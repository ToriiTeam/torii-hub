import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  veredictoColor, veredictoDetail, entregaLabel, conversionLabel,
  entregaSeverity, conversionSeverity, type ScorecardSalud, type VeredictoColor, type PillSeverity,
} from '@/features/clientes/lib/scorecardVeredicto';
import { NuevoClienteDialog } from '@/features/clientes/components/NuevoClienteDialog';
import { statusColors, statusLabels, type ClientStatus } from '@/lib/clientStatus';

type OfferType = 'DWY' | 'DFY';
type PaymentType = 'Upfront' | 'Mensual' | 'Cuotas';
type PaymentPlatform = 'Stripe' | 'Binance' | 'Transfer';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  offer_type: OfferType;
  start_date?: string;
  end_date?: string;
  status: ClientStatus;
  payment_type: PaymentType;
  total_installments: number;
  paid_installments: number;
  installment_amount: number;
  total_amount?: number;
  next_due_date?: string;
  platform: PaymentPlatform;
  platform_fee: number;
  country?: string;
  notes?: string;
  task_phase?: string;
  result_phase?: string;
  renewal_risk?: string;
  motivo_cancelacion?: string;
  fecha_cancelacion?: string;
}

// Acento de la tarjeta (fondo degradé + borde + glow del dot) según el
// veredicto de Scorecard de Salud — variables CSS seteadas en la Card raíz
// y consumidas por sus hijos (dot incluido), mismo mecanismo que el mockup
// de referencia (--accent/--glow/--border por card), pero con los tokens de
// tema del proyecto (hsl(var(--success)) etc.) en vez de hex literales.
const veredictoAccentVars: Record<VeredictoColor, React.CSSProperties> = {
  verde: {
    '--card-accent': 'hsl(var(--success))',
    '--card-glow': 'hsl(var(--success) / 0.16)',
    '--card-border': 'hsl(var(--success) / 0.35)',
  } as React.CSSProperties,
  rojo: {
    '--card-accent': 'hsl(var(--destructive))',
    '--card-glow': 'hsl(var(--destructive) / 0.16)',
    '--card-border': 'hsl(var(--destructive) / 0.35)',
  } as React.CSSProperties,
  amarillo: {
    '--card-accent': 'hsl(var(--warning))',
    '--card-glow': 'hsl(var(--warning) / 0.16)',
    '--card-border': 'hsl(var(--warning) / 0.35)',
  } as React.CSSProperties,
  neutro: {
    '--card-accent': 'hsl(var(--muted-foreground))',
    '--card-glow': 'hsl(var(--muted-foreground) / 0.10)',
    '--card-border': 'hsl(var(--border))',
  } as React.CSSProperties,
};

// Pills de Entrega/Conversión — solo 3 colores (igual que el mockup: sus
// clases .pill no tienen variante ámbar, el ámbar es exclusivo del acento
// de la card cuando el veredicto general es "Amarillo — ...").
const pillStyles: Record<PillSeverity, string> = {
  muybueno: 'bg-success/20 text-success',
  bueno: 'bg-success/10 text-success',
  critico: 'bg-destructive/15 text-destructive',
  neutro: 'bg-muted text-muted-foreground',
};

function SeverityPill({ severity, children }: { severity: PillSeverity; children: React.ReactNode }) {
  const Icon = severity === 'critico' ? ArrowDownRight : severity === 'neutro' ? null : ArrowUpRight;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold', pillStyles[severity])}>
      {Icon ? <Icon className="h-3 w-3" /> : <span aria-hidden="true">—</span>}
      {children}
    </span>
  );
}

function isStaleActivity(fecha: string | undefined): boolean {
  if (!fecha) return false;
  return differenceInCalendarDays(new Date(), parseISO(fecha)) > 2;
}

export default function Clientes() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [scorecards, setScorecards] = useState<Record<string, ScorecardSalud>>({});
  const [bottlenecks, setBottlenecks] = useState<Record<string, { count: number; nombre: string }>>({});
  const [lastActivity, setLastActivity] = useState<Record<string, { texto: string; fecha: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, bottlenecksRes, activityRes] = await Promise.all([
      // es_interno = false: el casillero interno de Torii (VSL Funnel propio,
      // ver migración clients_es_interno_and_torii_casillero) nunca debe
      // aparecer acá — esta es la Vista Global de cartera de clientes reales.
      supabase.from('clients').select('*').eq('es_interno', false).order('name'),
      // Misma query que usaba el viejo Dashboard Global (ClientesGlobalDashboard.tsx)
      // para procesos bloqueados — fusionada acá en vez de en una página aparte.
      supabase.from('roadmap_processes').select('id, nombre, client_id').eq('status', 'bloqueado'),
      // Última actividad por cliente — client_activity_log (Delivery OS) recién
      // se creó y todavía no lo puebla nada, así que hoy esto vuelve vacío y
      // cada card cae en el fallback "Sin actividad registrada". Ya queda
      // conectado de verdad: en cuanto haya filas, aparecen solas.
      supabase.from('client_activity_log').select('client_id, texto, fecha').order('fecha', { ascending: false }),
    ]);
    if (clientsRes.data) setClients(clientsRes.data as Client[]);
    if (bottlenecksRes.error) {
      console.error('[Clientes] bottlenecks query failed:', bottlenecksRes.error.message);
    } else {
      const byClient: Record<string, { count: number; nombre: string }> = {};
      for (const row of bottlenecksRes.data ?? []) {
        const existing = byClient[row.client_id];
        if (existing) existing.count += 1;
        else byClient[row.client_id] = { count: 1, nombre: row.nombre };
      }
      setBottlenecks(byClient);
    }
    if (activityRes.error) {
      console.error('[Clientes] last activity query failed:', activityRes.error.message);
    } else {
      const byClient: Record<string, { texto: string; fecha: string }> = {};
      for (const row of activityRes.data ?? []) {
        if (!byClient[row.client_id]) byClient[row.client_id] = { texto: row.texto, fecha: row.fecha };
      }
      setLastActivity(byClient);
    }
    setLoading(false);

    const activeIds = (clientsRes.data ?? [])
      .filter((c) => c.status === 'active')
      .map((c) => c.id as string);
    fetchScorecards(activeIds);
  };

  // Scorecard de Salud (get_scorecard_salud) — solo para clientes activos.
  // Cada llamada es independiente: si una falla, el resto sigue mostrando
  // su color y esa tarjeta queda en estado neutro/"Cargando…".
  const fetchScorecards = async (activeClientIds: string[]) => {
    const results = await Promise.all(
      activeClientIds.map(async (id) => {
        const { data, error } = await supabase.rpc('get_scorecard_salud', { p_client_id: id });
        if (error) {
          console.error('[Clientes] get_scorecard_salud failed for', id, error.message);
          return null;
        }
        return (data?.[0] as ScorecardSalud | undefined) ?? null;
      }),
    );
    setScorecards((prev) => {
      const next = { ...prev };
      results.forEach((row, i) => {
        if (row) next[activeClientIds[i]] = row;
      });
      return next;
    });
  };

  const filtered = clients.filter(c => {
    const statusMatch = showInactive ? c.status !== 'active' : c.status === 'active';
    if (!statusMatch) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeClients = clients.filter(c => c.status === 'active');
  const totalContractValue = activeClients.reduce((s, c) => s + (c.total_amount || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <>
      <NuevoClienteDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchData} />

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Salud de la cartera</h1>
            <p className="text-muted-foreground">{clients.length} clientes • ${totalContractValue.toLocaleString()} total</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive" />
              <Label htmlFor="show-inactive" className="text-sm text-muted-foreground cursor-pointer">Mostrar inactivos</Label>
            </div>
            <Button className="bg-primary" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="bg-secondary/50" />
            </div>
          </CardContent>
        </Card>

        {/* Clients Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(client => {
            const isActive = client.status === 'active';
            const scorecard = isActive ? scorecards[client.id] : undefined;
            const health = isActive ? veredictoColor(scorecard) : null;
            const bottleneck = isActive ? bottlenecks[client.id] : undefined;
            const activity = lastActivity[client.id];

            // undefined = todavía no llegó la respuesta de get_scorecard_salud
            // (distinto de sin_campana=true, que sí llegó y no tiene datos).
            const scorecardLoading = isActive && !scorecard;
            const sinCampana = scorecard?.sin_campana === true;

            const stale = isActive && activity ? isStaleActivity(activity.fecha) : false;

            return (
              <Card
                key={client.id}
                style={isActive && health ? veredictoAccentVars[health] : undefined}
                className={cn(
                  'rounded-[18px] border cursor-pointer transition-all min-h-[190px] flex flex-col hover:-translate-y-0.5',
                  !isActive && 'bg-card border-border/50 opacity-70',
                  isActive && health && [
                    'border-[color:var(--card-border)]',
                    'bg-[radial-gradient(120%_100%_at_0%_0%,var(--card-glow)_0%,hsl(var(--card))_55%)]',
                  ],
                )}
                onClick={() => navigate(`/c/${client.id}`)}
              >
                <CardContent className="p-[22px] space-y-3 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-sans font-extrabold text-[15px] text-foreground truncate">{client.name}</h3>
                    {isActive ? (
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ background: 'var(--card-accent)', boxShadow: '0 0 10px var(--card-accent)' }}
                        title={veredictoDetail(scorecard)}
                      />
                    ) : (
                      <Badge className={cn('text-xs border-0 flex-shrink-0', statusColors[client.status])}>
                        {statusLabels[client.status]}
                      </Badge>
                    )}
                  </div>

                  {isActive && (
                    <div className="flex flex-wrap gap-2">
                      {scorecardLoading ? (
                        <span className="text-xs text-muted-foreground">Cargando salud…</span>
                      ) : sinCampana ? null : (
                        <>
                          <SeverityPill severity={entregaSeverity(scorecard!.entrega)}>
                            Entrega: {entregaLabel(scorecard!.entrega)}
                          </SeverityPill>
                          <SeverityPill severity={conversionSeverity(scorecard!.conversion, scorecard!.close_rate_real)}>
                            Conversión: {conversionLabel(scorecard!.conversion, scorecard!.close_rate_real)}
                          </SeverityPill>
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-auto space-y-1.5 text-xs text-muted-foreground/70">
                    {isActive && (
                      <p>
                        {sinCampana
                          ? 'Sin campaña activa'
                          : scorecard
                            ? `Día ${scorecard.dias_desde_arranque_real + 1} de campaña`
                            : null}
                      </p>
                    )}

                    {bottleneck && (
                      <p
                        className="flex items-center gap-1 text-warning truncate"
                        title={bottleneck.count === 1 ? bottleneck.nombre : `${bottleneck.count} procesos bloqueados`}
                      >
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {bottleneck.count === 1 ? `1 bloqueado: ${bottleneck.nombre}` : `${bottleneck.count} bloqueados`}
                        </span>
                      </p>
                    )}

                    <p className={cn('flex items-center gap-1 truncate', stale && 'text-destructive')} title={activity?.fecha}>
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      Última actividad: {activity?.texto || 'Sin actividad registrada'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card className="bg-card border-border/50 col-span-full">
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay clientes que coincidan con la búsqueda
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </>
  );
}

