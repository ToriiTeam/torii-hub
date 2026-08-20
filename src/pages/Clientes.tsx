import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  veredictoColor, veredictoDetail, entregaLabel, conversionLabel,
  entregaSeverity, conversionSeverity, type ScorecardSalud, type VeredictoColor, type PillSeverity,
} from '@/features/clientes/lib/scorecardVeredicto';

type ClientStatus = 'active' | 'paused' | 'finished' | 'cancelled';
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

const statusColors: Record<ClientStatus, string> = {
  active: 'bg-success/20 text-success',
  paused: 'bg-warning/20 text-warning',
  finished: 'bg-info/20 text-info',
  cancelled: 'bg-destructive/20 text-destructive',
};

const statusLabels: Record<ClientStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

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

const emptyForm = {
  name: '', email: '', phone: '', offer_type: 'DFY' as OfferType,
  start_date: '', end_date: '', status: 'active' as ClientStatus,
  payment_type: 'Cuotas' as PaymentType, total_installments: '1',
  paid_installments: '0', installment_amount: '0', total_amount: '0',
  next_due_date: '', platform: 'Stripe' as PaymentPlatform,
  platform_fee: '2.9', country: '', notes: '',
};

export default function Clientes() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [scorecards, setScorecards] = useState<Record<string, ScorecardSalud>>({});
  const [bottlenecks, setBottlenecks] = useState<Record<string, { count: number; nombre: string }>>({});
  const [lastActivity, setLastActivity] = useState<Record<string, { texto: string; fecha: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, bottlenecksRes, activityRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
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

  const resetForm = () => {
    setForm(emptyForm);
    setDialogOpen(false);
  };

  // Alta únicamente — editar un cliente existente vive en ClienteDetalle.tsx
  // (botón "Editar" del header → TabFichaBasica), no acá.
  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    const data = {
      name: form.name, email: form.email || null, phone: form.phone || null,
      offer_type: form.offer_type, start_date: form.start_date || null,
      end_date: form.end_date || null, status: form.status,
      payment_type: form.payment_type,
      total_installments: parseInt(form.total_installments) || 1,
      paid_installments: parseInt(form.paid_installments) || 0,
      installment_amount: parseFloat(form.installment_amount) || 0,
      total_amount: parseFloat(form.total_amount) || 0,
      next_due_date: form.next_due_date || null, platform: form.platform,
      platform_fee: parseFloat(form.platform_fee) || 0,
      country: form.country || null, notes: form.notes || null,
    };
    const { error } = await supabase.from('clients').insert(data);
    if (error) { toast.error('Error al crear'); return; }
    toast.success('Cliente agregado');
    resetForm();
    fetchData();
  };

  const activeClients = clients.filter(c => c.status === 'active');
  const totalContractValue = activeClients.reduce((s, c) => s + (c.total_amount || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cliente *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary/50" /></div>
              <div><Label>Oferta</Label>
                <Select value={form.offer_type} onValueChange={v => setForm({ ...form, offer_type: v as OfferType })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DWY">DWY (Done With You)</SelectItem>
                    <SelectItem value="DFY">DFY (Done For You)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Inicio</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="bg-secondary/50" /></div>
              <div><Label>Fin</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="bg-secondary/50" /></div>
              <div><Label>Estado</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ClientStatus })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div><Label>Monto Total</Label><Input type="number" min="0" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} className="bg-secondary/50" /></div>
              <div><Label>Total Cuotas</Label><Input type="number" min="1" value={form.total_installments} onChange={e => setForm({ ...form, total_installments: e.target.value })} className="bg-secondary/50" /></div>
              <div><Label>Cuotas Pagadas</Label><Input type="number" min="0" value={form.paid_installments} onChange={e => setForm({ ...form, paid_installments: e.target.value })} className="bg-secondary/50" /></div>
              <div><Label>Tipo Pago</Label>
                <Select value={form.payment_type} onValueChange={v => setForm({ ...form, payment_type: v as PaymentType })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upfront">Upfront</SelectItem>
                    <SelectItem value="Mensual">Mensual</SelectItem>
                    <SelectItem value="Cuotas">Cuotas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div><Label>Próx. Venc.</Label><Input type="date" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} className="bg-secondary/50" /></div>
              <div><Label>Plataforma</Label>
                <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v as PaymentPlatform })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stripe">Stripe</SelectItem>
                    <SelectItem value="Binance">Binance</SelectItem>
                    <SelectItem value="Transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Fee %</Label><Input type="number" step="0.1" value={form.platform_fee} onChange={e => setForm({ ...form, platform_fee: e.target.value })} className="bg-secondary/50" /></div>
              <div><Label>País</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="bg-secondary/50" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-secondary/50" /></div>
              <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-secondary/50" /></div>
            </div>
            <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary/50" /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSubmit} className="bg-primary">Agregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

