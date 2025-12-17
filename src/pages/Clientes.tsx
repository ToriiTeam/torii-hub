import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useStore } from '@/hooks/useStore';
import { initialClients, userNames } from '@/data/initialData';
import { Client, ClientStatus } from '@/types/torii';
import { toast } from 'sonner';
import { Plus, Search, Users, Mail, Phone, DollarSign, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors: Record<ClientStatus, string> = {
  lead: 'bg-muted text-muted-foreground', prospecto: 'bg-info/20 text-info',
  activo: 'bg-success/20 text-success', inactivo: 'bg-destructive/20 text-destructive'
};

const statusLabels: Record<ClientStatus, string> = {
  lead: 'Lead', prospecto: 'Prospecto', activo: 'Activo', inactivo: 'Inactivo'
};

export default function Clientes() {
  const [clients, setClients] = useStore('clientes', initialClients);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', phone: '', status: 'lead' as ClientStatus, contractValue: '', responsibleId: '1' });

  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.company?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.email) { toast.error('Complete los campos requeridos'); return; }
    const newClient: Client = {
      id: Date.now().toString(), ...formData,
      contractValue: parseFloat(formData.contractValue) || 0,
      startDate: new Date().toISOString().split('T')[0]
    };
    setClients(prev => [...prev, newClient]);
    setFormData({ name: '', company: '', email: '', phone: '', status: 'lead', contractValue: '', responsibleId: '1' });
    setIsDialogOpen(false);
    toast.success('Cliente agregado');
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    toast.success('Cliente eliminado');
  };

  const activeClients = clients.filter(c => c.status === 'activo');
  const totalValue = activeClients.reduce((s, c) => s + c.contractValue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clients.length} clientes registrados</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Nuevo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nombre *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Empresa</Label><Input value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email *</Label><Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Teléfono</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Estado</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as ClientStatus })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Valor Contrato</Label><Input type="number" value={formData.contractValue} onChange={e => setFormData({ ...formData, contractValue: e.target.value })} className="bg-secondary/50" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} className="bg-primary">Agregar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {(['lead', 'prospecto', 'activo', 'inactivo'] as ClientStatus[]).map(status => (
          <Card key={status} className="bg-card border-border/50 cursor-pointer hover:border-primary/30" onClick={() => setFilterStatus(status)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{clients.filter(c => c.status === status).length}</p>
              <Badge className={cn('text-xs border-0 mt-1', statusColors[status])}>{statusLabels[status]}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

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

      <div className="grid gap-4">
        {filtered.map(client => (
          <Card key={client.id} className="bg-card border-border/50 hover:border-primary/30 transition-all group">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold">
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{client.name}</h3>
                    {client.company && <span className="text-sm text-muted-foreground">• {client.company}</span>}
                    <Badge className={cn('text-xs border-0', statusColors[client.status])}>{statusLabels[client.status]}</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success">${client.contractValue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{userNames[client.responsibleId]}</p>
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteClient(client.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
