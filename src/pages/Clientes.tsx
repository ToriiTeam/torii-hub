import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/hooks/useStore';
import { initialClients } from '@/data/initialData';
import { Client, ClientStatus, OfferType, PaymentType, PaymentPlatform } from '@/types/torii';
import { toast } from 'sonner';
import { Plus, Search, DollarSign, Trash2, Edit2, Calendar, CreditCard, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors: Record<ClientStatus, string> = {
  activo: 'bg-success/20 text-success',
  pausado: 'bg-warning/20 text-warning',
  finalizado: 'bg-info/20 text-info',
  cancelado: 'bg-destructive/20 text-destructive'
};

const statusLabels: Record<ClientStatus, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado'
};

const offerLabels: Record<OfferType, string> = {
  DWY: 'Done With You',
  DFY: 'Done For You'
};

const paymentTypeLabels: Record<PaymentType, string> = {
  Upfront: 'Upfront',
  Mensual: 'Mensual',
  Cuotas: 'Cuotas'
};

export default function Clientes() {
  const [clients, setClients] = useStore('clientes', initialClients);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    offerType: 'DFY',
    startDate: '',
    status: 'activo',
    paymentType: 'Cuotas',
    totalInstallments: 1,
    paidInstallments: 0,
    installmentAmount: 0,
    platform: 'Stripe',
    platformFee: 2.9,
    country: '',
    notes: '',
    email: '',
    phone: ''
  });

  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const resetForm = () => {
    setFormData({
      name: '', offerType: 'DFY', startDate: '', status: 'activo', paymentType: 'Cuotas',
      totalInstallments: 1, paidInstallments: 0, installmentAmount: 0, platform: 'Stripe',
      platformFee: 2.9, country: '', notes: '', email: '', phone: ''
    });
    setEditingClient(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.startDate) {
      toast.error('Complete los campos requeridos');
      return;
    }
    
    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...formData } as Client : c));
      toast.success('Cliente actualizado');
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        name: formData.name!,
        offerType: formData.offerType!,
        startDate: formData.startDate!,
        endDate: formData.endDate,
        status: formData.status!,
        paymentType: formData.paymentType!,
        totalInstallments: formData.totalInstallments!,
        paidInstallments: formData.paidInstallments!,
        installmentAmount: formData.installmentAmount!,
        nextDueDate: formData.nextDueDate,
        platform: formData.platform!,
        platformFee: formData.platformFee!,
        country: formData.country!,
        notes: formData.notes,
        email: formData.email,
        phone: formData.phone
      };
      setClients(prev => [...prev, newClient]);
      toast.success('Cliente agregado');
    }
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData(client);
    setIsDialogOpen(true);
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    toast.success('Cliente eliminado');
  };

  const activeClients = clients.filter(c => c.status === 'activo');
  const totalContractValue = activeClients.reduce((s, c) => s + (c.installmentAmount * c.totalInstallments), 0);
  const totalPending = activeClients.reduce((s, c) => s + (c.installmentAmount * (c.totalInstallments - c.paidInstallments)), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clients.length} clientes • ${totalContractValue.toLocaleString()} total contratos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Nuevo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingClient ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cliente *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Oferta</Label>
                  <Select value={formData.offerType} onValueChange={v => setFormData({ ...formData, offerType: v as OfferType })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DWY">DWY (Done With You)</SelectItem>
                      <SelectItem value="DFY">DFY (Done For You)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Inicio *</Label><Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Fin</Label><Input type="date" value={formData.endDate || ''} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Estado</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as ClientStatus })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Tipo Pago</Label>
                  <Select value={formData.paymentType} onValueChange={v => setFormData({ ...formData, paymentType: v as PaymentType })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(paymentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Total Cuotas</Label><Input type="number" min="1" value={formData.totalInstallments} onChange={e => setFormData({ ...formData, totalInstallments: parseInt(e.target.value) || 1 })} className="bg-secondary/50" /></div>
                <div><Label>Cuotas Pagadas</Label><Input type="number" min="0" value={formData.paidInstallments} onChange={e => setFormData({ ...formData, paidInstallments: parseInt(e.target.value) || 0 })} className="bg-secondary/50" /></div>
                <div><Label>Monto/Cuota USD</Label><Input type="number" min="0" value={formData.installmentAmount} onChange={e => setFormData({ ...formData, installmentAmount: parseFloat(e.target.value) || 0 })} className="bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Próx. Vencimiento</Label><Input type="date" value={formData.nextDueDate || ''} onChange={e => setFormData({ ...formData, nextDueDate: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Plataforma</Label>
                  <Select value={formData.platform} onValueChange={v => setFormData({ ...formData, platform: v as PaymentPlatform })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                      <SelectItem value="Binance">Binance</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fee %</Label><Input type="number" step="0.1" value={formData.platformFee} onChange={e => setFormData({ ...formData, platformFee: parseFloat(e.target.value) || 0 })} className="bg-secondary/50" /></div>
                <div><Label>País</Label><Input value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className="bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Teléfono</Label><Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="bg-secondary/50" /></div>
              </div>
              <div><Label>Notas</Label><Textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="bg-secondary/50" /></div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSubmit} className="bg-primary">{editingClient ? 'Guardar' : 'Agregar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['activo', 'pausado', 'finalizado', 'cancelado'] as ClientStatus[]).map(status => (
          <Card key={status} className="bg-card border-border/50 cursor-pointer hover:border-primary/30" onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{clients.filter(c => c.status === status).length}</p>
              <Badge className={cn('text-xs border-0 mt-1', statusColors[status])}>{statusLabels[status]}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="bg-secondary/50" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] bg-secondary/50"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="bg-card border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30 border-b border-border/50">
              <tr>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Oferta</th>
                <th className="text-left p-3 font-medium">Fechas</th>
                <th className="text-left p-3 font-medium">Estado</th>
                <th className="text-left p-3 font-medium">Pago</th>
                <th className="text-left p-3 font-medium">Cuotas</th>
                <th className="text-left p-3 font-medium">Monto</th>
                <th className="text-left p-3 font-medium">Próx. Venc.</th>
                <th className="text-left p-3 font-medium">Plataforma</th>
                <th className="text-left p-3 font-medium">País</th>
                <th className="text-right p-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => (
                <tr key={client.id} className="border-b border-border/30 hover:bg-secondary/20">
                  <td className="p-3">
                    <div className="font-medium">{client.name}</div>
                    {client.email && <div className="text-xs text-muted-foreground">{client.email}</div>}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">{client.offerType}</Badge>
                  </td>
                  <td className="p-3 text-xs">
                    <div>{client.startDate}</div>
                    {client.endDate && <div className="text-muted-foreground">→ {client.endDate}</div>}
                  </td>
                  <td className="p-3">
                    <Badge className={cn('text-xs border-0', statusColors[client.status])}>{statusLabels[client.status]}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">{client.paymentType}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-medium text-success">{client.paidInstallments}</span>
                    <span className="text-muted-foreground">/{client.totalInstallments}</span>
                  </td>
                  <td className="p-3 font-medium">${client.installmentAmount.toLocaleString()}</td>
                  <td className="p-3 text-xs">
                    {client.nextDueDate ? (
                      <span className={new Date(client.nextDueDate) < new Date() ? 'text-destructive' : ''}>
                        {client.nextDueDate}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">{client.platform}</Badge>
                      <span className="text-xs text-muted-foreground">{client.platformFee}%</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{client.country || '-'}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(client)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteClient(client.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
            <p className="text-xl font-bold">${activeClients.length > 0 ? Math.round(totalContractValue / activeClients.length).toLocaleString() : 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
