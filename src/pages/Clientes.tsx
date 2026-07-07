import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Ban, Edit2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const renewalRiskColors: Record<string, string> = {
  low: 'bg-success/20 text-success',
  medium: 'bg-warning/20 text-warning',
  high: 'bg-destructive/20 text-destructive',
};

const emptyForm = {
  name: '', email: '', phone: '', offer_type: 'DFY' as OfferType,
  start_date: '', end_date: '', status: 'active' as ClientStatus,
  payment_type: 'Cuotas' as PaymentType, total_installments: '1',
  paid_installments: '0', installment_amount: '0', total_amount: '0',
  next_due_date: '', platform: 'Stripe' as PaymentPlatform,
  platform_fee: '2.9', country: '', notes: '',
};

const emptyCancelForm = {
  motivo: '',
  fecha: new Date().toISOString().slice(0, 10),
};

export default function Clientes() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [installments, setInstallments] = useState<{ client_id: string; amount: number; paid: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showCancelled, setShowCancelled] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Client | null>(null);
  const [cancelForm, setCancelForm] = useState(emptyCancelForm);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, installmentsRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('client_installments').select('client_id, amount, paid'),
    ]);
    if (clientsRes.data) setClients(clientsRes.data as Client[]);
    if (installmentsRes.data) setInstallments(installmentsRes.data);
    setLoading(false);
  };

  const filtered = clients.filter(c => {
    if (!showCancelled && c.status === 'cancelled' && filterStatus !== 'cancelled') return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingClient(null);
    setDialogOpen(false);
  };

  const openEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setForm({
      name: client.name, email: client.email || '', phone: client.phone || '',
      offer_type: client.offer_type, start_date: client.start_date || '',
      end_date: client.end_date || '', status: client.status,
      payment_type: client.payment_type,
      total_installments: client.total_installments.toString(),
      paid_installments: client.paid_installments.toString(),
      installment_amount: client.installment_amount.toString(),
      total_amount: (client.total_amount || 0).toString(),
      next_due_date: client.next_due_date || '', platform: client.platform,
      platform_fee: client.platform_fee.toString(),
      country: client.country || '', notes: client.notes || '',
    });
    setDialogOpen(true);
  };

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
    if (editingClient) {
      const { error } = await supabase.from('clients').update(data).eq('id', editingClient.id);
      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Cliente actualizado');
    } else {
      const { error } = await supabase.from('clients').insert(data);
      if (error) { toast.error('Error al crear'); return; }
      toast.success('Cliente agregado');
    }
    resetForm();
    fetchData();
  };

  const openCancel = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setCancelTarget(client);
    setCancelForm(emptyCancelForm);
  };

  const handleCancelClient = async () => {
    if (!cancelTarget) return;
    if (!cancelForm.motivo.trim()) { toast.error('El motivo es requerido'); return; }
    setCancelling(true);
    const { error } = await supabase
      .from('clients')
      .update({
        status: 'cancelled' as ClientStatus,
        motivo_cancelacion: cancelForm.motivo.trim(),
        fecha_cancelacion: cancelForm.fecha,
      })
      .eq('id', cancelTarget.id);
    setCancelling(false);
    if (error) { toast.error('Error al cancelar el cliente'); return; }
    toast.success('Cliente cancelado');
    setCancelTarget(null);
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
          <DialogHeader><DialogTitle>{editingClient ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader>
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
              <Button onClick={handleSubmit} className="bg-primary">{editingClient ? 'Guardar' : 'Agregar'}</Button>
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
            const progress = client.total_installments > 0
              ? (client.paid_installments / client.total_installments) * 100
              : 0;
            return (
              <Card
                key={client.id}
                className="bg-card border-border/50 hover:border-primary/30 cursor-pointer transition-all"
                onClick={() => navigate(`/clientes/${client.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{client.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{client.email || 'Sin email'}</p>
                      </div>
                    </div>
                    <Badge className={cn('text-xs border-0 flex-shrink-0', statusColors[client.status])}>
                      {statusLabels[client.status]}
                    </Badge>
                  </div>

                  {client.task_phase && (
                    <p className="text-xs text-muted-foreground mb-2 truncate">{client.task_phase}</p>
                  )}

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3 flex-wrap">
                    <span>{client.offer_type}</span>
                    <span>•</span>
                    <span>{client.country || 'Sin país'}</span>
                    {client.renewal_risk && client.renewal_risk !== 'low' && (
                      <>
                        <span>•</span>
                        <Badge className={cn('text-xs border-0 px-1.5 py-0', renewalRiskColors[client.renewal_risk])}>
                          riesgo {client.renewal_risk}
                        </Badge>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      Cuotas: {client.paid_installments}/{client.total_installments}
                    </span>
                    <span className="font-medium">${(client.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <Progress value={progress} className="h-1.5 mb-3" />

                  <div
                    className="flex items-center justify-end gap-1 pt-2 border-t border-border/30"
                    onClick={e => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => openEdit(client, e)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    {client.status !== 'cancelled' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => openCancel(client, e)} title="Cancelar cliente">
                        <Ban className="h-3 w-3" />
                      </Button>
                    )}
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

      <Dialog open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Cancelar cliente</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {cancelTarget?.name} pasará a estado <strong>Cancelado</strong> y dejará de contarse como cliente activo.
            No se elimina ningún dato — todo su historial queda accesible.
          </p>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Motivo de cancelación *</Label>
              <Textarea
                value={cancelForm.motivo}
                onChange={e => setCancelForm({ ...cancelForm, motivo: e.target.value })}
                className="bg-secondary/50 mt-1"
                rows={3}
                placeholder="Por qué se cancela este cliente..."
              />
            </div>
            <div>
              <Label>Fecha de cancelación</Label>
              <Input
                type="date"
                value={cancelForm.fecha}
                onChange={e => setCancelForm({ ...cancelForm, fecha: e.target.value })}
                className="bg-secondary/50 mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>Volver</Button>
            <Button
              onClick={handleCancelClient}
              disabled={cancelling || !cancelForm.motivo.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelando…' : 'Confirmar cancelación'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
