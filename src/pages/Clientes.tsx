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
import { cn } from '@/lib/utils';
import { veredictoColor, veredictoDetail, type ScorecardSalud, type VeredictoColor } from '@/features/clientes/lib/scorecardVeredicto';

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

// Franja superior + dot de la tarjeta (Scorecard de Salud, get_scorecard_salud).
// 'neutro' cubre tanto sin_campana=true como el estado transitorio "todavía
// no cargó" — mismos tokens de tema en las dos variantes (top bar y dot),
// no los hex literales del mockup.
const veredictoBarColors: Record<VeredictoColor, string> = {
  verde: 'border-t-success',
  rojo: 'border-t-destructive',
  amarillo: 'border-t-warning',
  neutro: 'border-t-muted-foreground/30',
};

const veredictoDotColors: Record<VeredictoColor, string> = {
  verde: 'bg-success',
  rojo: 'bg-destructive',
  amarillo: 'bg-warning',
  neutro: 'bg-muted-foreground/40',
};

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
  const [installments, setInstallments] = useState<{ client_id: string; amount: number; paid: boolean }[]>([]);
  const [scorecards, setScorecards] = useState<Record<string, ScorecardSalud>>({});
  const [bottlenecks, setBottlenecks] = useState<Record<string, { count: number; nombre: string }>>({});
  const [lastActivity, setLastActivity] = useState<Record<string, { texto: string; fecha: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, installmentsRes, bottlenecksRes, activityRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('client_installments').select('client_id, amount, paid'),
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
    if (installmentsRes.data) setInstallments(installmentsRes.data);
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
    if (!showCancelled && c.status === 'cancelled' && filterStatus !== 'cancelled') return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
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
  const totalPending = activeClients.reduce((s, c) => {
    const ci = installments.filter(i => i.client_id === c.id);
    if (ci.length > 0) return s + ci.filter(i => !i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
    const remaining = c.total_installments - c.paid_installments;
    const avg = c.total_installments > 0 ? (c.total_amount || 0) / c.total_installments : 0;
    return s + avg * remaining;
  }, 0);

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
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">{clients.length} clientes • ${totalContractValue.toLocaleString()} total</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={showCancelled} onCheckedChange={setShowCancelled} id="show-cancelled" />
              <Label htmlFor="show-cancelled" className="text-sm text-muted-foreground cursor-pointer">Mostrar cancelados</Label>
            </div>
            <Button className="bg-primary" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Status filter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['active', 'paused', 'finished', 'cancelled'] as ClientStatus[]).map(status => (
            <Card
              key={status}
              className={cn('bg-card border-border/50 cursor-pointer transition-all', filterStatus === status && 'ring-2 ring-primary')}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{clients.filter(c => c.status === status).length}</p>
                <Badge className={cn('text-xs border-0 mt-1', statusColors[status])}>{statusLabels[status]}</Badge>
              </CardContent>
            </Card>
          ))}
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

            return (
              <Card
                key={client.id}
                className={cn(
                  'bg-card border-border/50 hover:border-primary/30 cursor-pointer transition-all',
                  !isActive && 'opacity-70',
                  health && cn('border-t-4', veredictoBarColors[health]),
                )}
                onClick={() => navigate(`/clientes/${client.id}`)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm truncate">{client.name}</h3>
                    {isActive ? (
                      <span
                        className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', health && veredictoDotColors[health])}
                        title={veredictoDetail(scorecard)}
                      />
                    ) : (
                      <Badge className={cn('text-xs border-0 flex-shrink-0', statusColors[client.status])}>
                        {statusLabels[client.status]}
                      </Badge>
                    )}
                  </div>

                  {isActive && (
                    <div className="flex flex-col gap-1 text-xs">
                      {scorecardLoading ? (
                        <span className="text-muted-foreground">Cargando salud…</span>
                      ) : sinCampana ? null : (
                        <>
                          <EntregaConversionRow
                            good={scorecard!.entrega === 'Verde' || scorecard!.entrega === 'OK'}
                            label={(scorecard!.entrega === 'Verde' || scorecard!.entrega === 'OK') ? 'Entrega buena' : 'Entrega mala'}
                          />
                          {scorecard!.conversion === 'Sin data' ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              Conversión: sin datos suficientes
                            </span>
                          ) : (
                            <EntregaConversionRow
                              good={scorecard!.conversion === 'OK'}
                              label={scorecard!.conversion === 'OK' ? 'Conversión buena' : 'Conversión mala'}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground/70">
                    {!isActive
                      ? null
                      : sinCampana
                        ? 'Sin campaña activa'
                        : scorecard
                          ? `Día ${scorecard.dias_desde_arranque_real + 1} de campaña`
                          : null}
                  </p>

                  {bottleneck && (
                    <p
                      className="flex items-center gap-1 text-xs text-warning truncate"
                      title={bottleneck.count === 1 ? bottleneck.nombre : `${bottleneck.count} procesos bloqueados`}
                    >
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {bottleneck.count === 1 ? `1 bloqueado: ${bottleneck.nombre}` : `${bottleneck.count} bloqueados`}
                      </span>
                    </p>
                  )}

                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70 truncate" title={activity?.fecha}>
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    Última actividad: {activity?.texto || 'Sin actividad registrada'}
                  </p>
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

        {/* Summary Footer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Contratos</p>
              <p className="text-xl font-bold text-success">${totalContractValue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Por Cobrar</p>
              <p className="text-xl font-bold text-warning">${totalPending.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Clientes Activos</p>
              <p className="text-xl font-bold">{activeClients.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Ticket Promedio</p>
              <p className="text-xl font-bold">
                ${activeClients.length > 0 ? Math.round(totalContractValue / activeClients.length).toLocaleString() : 0}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// Fila "Entrega buena/mala" o "Conversión buena/mala" con flecha — buena en
// verde apuntando arriba-derecha, mala en rojo apuntando abajo-derecha,
// mismo criterio del mockup (la dirección de la flecha codifica "bien/mal",
// no un valor que sube o baja).
function EntregaConversionRow({ good, label }: { good: boolean; label: string }) {
  const Icon = good ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('flex items-center gap-1', good ? 'text-success' : 'text-destructive')}>
      <Icon className="h-3 w-3 flex-shrink-0" />
      {label}
    </span>
  );
}
