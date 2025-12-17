import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, DollarSign, Trash2, Edit2, Globe, X, Package, CheckSquare, CreditCard, ArrowLeft, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ClientStatus = 'activo' | 'pausado' | 'finalizado' | 'cancelado';
type OfferType = 'DWY' | 'DFY';
type PaymentType = 'Upfront' | 'Mensual' | 'Cuotas';
type PaymentPlatform = 'Stripe' | 'Binance' | 'Transfer';
type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';

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
  next_due_date?: string;
  platform: PaymentPlatform;
  platform_fee: number;
  country?: string;
  notes?: string;
}

interface ClientProduct {
  id: string;
  client_id: string;
  product_name: string;
  description?: string;
  price: number;
  sold_date?: string;
}

interface ClientTask {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  due_date?: string;
  progress: number;
}

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

const taskStatusLabels: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada'
};

const taskStatusColors: Record<TaskStatus, string> = {
  pendiente: 'bg-warning/20 text-warning',
  en_progreso: 'bg-info/20 text-info',
  completada: 'bg-success/20 text-success'
};

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [clientForm, setClientForm] = useState({
    name: '', email: '', phone: '', offer_type: 'DFY' as OfferType, start_date: '', end_date: '',
    status: 'activo' as ClientStatus, payment_type: 'Cuotas' as PaymentType, total_installments: '1',
    paid_installments: '0', installment_amount: '0', next_due_date: '', platform: 'Stripe' as PaymentPlatform,
    platform_fee: '2.9', country: '', notes: ''
  });

  const [productForm, setProductForm] = useState({ product_name: '', description: '', price: '', sold_date: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'pendiente' as TaskStatus, due_date: '', progress: '0' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, productsRes, tasksRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('client_products').select('*'),
      supabase.from('client_tasks').select('*')
    ]);
    
    if (clientsRes.data) setClients(clientsRes.data as Client[]);
    if (productsRes.data) setProducts(productsRes.data as ClientProduct[]);
    if (tasksRes.data) setTasks(tasksRes.data as ClientTask[]);
    setLoading(false);
  };

  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const handleClientSubmit = async () => {
    if (!clientForm.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    const data = {
      name: clientForm.name,
      email: clientForm.email || null,
      phone: clientForm.phone || null,
      offer_type: clientForm.offer_type,
      start_date: clientForm.start_date || null,
      end_date: clientForm.end_date || null,
      status: clientForm.status,
      payment_type: clientForm.payment_type,
      total_installments: parseInt(clientForm.total_installments) || 1,
      paid_installments: parseInt(clientForm.paid_installments) || 0,
      installment_amount: parseFloat(clientForm.installment_amount) || 0,
      next_due_date: clientForm.next_due_date || null,
      platform: clientForm.platform,
      platform_fee: parseFloat(clientForm.platform_fee) || 0,
      country: clientForm.country || null,
      notes: clientForm.notes || null
    };

    if (editingClient) {
      const { error } = await supabase.from('clients').update(data).eq('id', editingClient.id);
      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Cliente actualizado');
      if (selectedClient?.id === editingClient.id) {
        setSelectedClient({ ...selectedClient, ...data } as Client);
      }
    } else {
      const { error } = await supabase.from('clients').insert(data);
      if (error) { toast.error('Error al crear'); return; }
      toast.success('Cliente agregado');
    }
    
    resetClientForm();
    fetchData();
  };

  const resetClientForm = () => {
    setClientForm({
      name: '', email: '', phone: '', offer_type: 'DFY', start_date: '', end_date: '',
      status: 'activo', payment_type: 'Cuotas', total_installments: '1', paid_installments: '0',
      installment_amount: '0', next_due_date: '', platform: 'Stripe', platform_fee: '2.9', country: '', notes: ''
    });
    setEditingClient(null);
    setIsClientDialogOpen(false);
  };

  const editClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      offer_type: client.offer_type,
      start_date: client.start_date || '',
      end_date: client.end_date || '',
      status: client.status,
      payment_type: client.payment_type,
      total_installments: client.total_installments.toString(),
      paid_installments: client.paid_installments.toString(),
      installment_amount: client.installment_amount.toString(),
      next_due_date: client.next_due_date || '',
      platform: client.platform,
      platform_fee: client.platform_fee.toString(),
      country: client.country || '',
      notes: client.notes || ''
    });
    setIsClientDialogOpen(true);
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Cliente eliminado');
    if (selectedClient?.id === id) setSelectedClient(null);
    fetchData();
  };

  const handleProductSubmit = async () => {
    if (!selectedClient || !productForm.product_name.trim()) {
      toast.error('Nombre del producto es requerido');
      return;
    }

    const { error } = await supabase.from('client_products').insert({
      client_id: selectedClient.id,
      product_name: productForm.product_name,
      description: productForm.description || null,
      price: parseFloat(productForm.price) || 0,
      sold_date: productForm.sold_date || null
    });

    if (error) { toast.error('Error al crear'); return; }
    toast.success('Producto agregado');
    setProductForm({ product_name: '', description: '', price: '', sold_date: '' });
    setIsProductDialogOpen(false);
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('client_products').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Producto eliminado');
    fetchData();
  };

  const handleTaskSubmit = async () => {
    if (!selectedClient || !taskForm.title.trim()) {
      toast.error('Título de la tarea es requerido');
      return;
    }

    const { error } = await supabase.from('client_tasks').insert({
      client_id: selectedClient.id,
      title: taskForm.title,
      description: taskForm.description || null,
      status: taskForm.status,
      due_date: taskForm.due_date || null,
      progress: parseInt(taskForm.progress) || 0
    });

    if (error) { toast.error('Error al crear'); return; }
    toast.success('Tarea agregada');
    setTaskForm({ title: '', description: '', status: 'pendiente', due_date: '', progress: '0' });
    setIsTaskDialogOpen(false);
    fetchData();
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const progress = status === 'completada' ? 100 : status === 'en_progreso' ? 50 : 0;
    const { error } = await supabase.from('client_tasks').update({ status, progress }).eq('id', taskId);
    if (error) { toast.error('Error al actualizar'); return; }
    fetchData();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('client_tasks').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Tarea eliminada');
    fetchData();
  };

  const getClientProducts = (clientId: string) => products.filter(p => p.client_id === clientId);
  const getClientTasks = (clientId: string) => tasks.filter(t => t.client_id === clientId);

  const activeClients = clients.filter(c => c.status === 'activo');
  const totalContractValue = activeClients.reduce((s, c) => s + (c.installment_amount * c.total_installments), 0);
  const totalPending = activeClients.reduce((s, c) => s + (c.installment_amount * (c.total_installments - c.paid_installments)), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  // Detail View
  if (selectedClient) {
    const clientProducts = getClientProducts(selectedClient.id);
    const clientTasks = getClientTasks(selectedClient.id);
    const totalProductValue = clientProducts.reduce((s, p) => s + (p.price || 0), 0);
    const completedTasks = clientTasks.filter(t => t.status === 'completada').length;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{selectedClient.name}</h1>
            <p className="text-muted-foreground">{selectedClient.email || 'Sin email'} • {selectedClient.country || 'Sin país'}</p>
          </div>
          <Badge className={cn('text-sm', statusColors[selectedClient.status])}>{statusLabels[selectedClient.status]}</Badge>
          <Button variant="outline" onClick={() => editClient(selectedClient)}>
            <Edit2 className="h-4 w-4 mr-2" />Editar
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Valor Contrato</p>
                  <p className="text-xl font-bold">${(selectedClient.installment_amount * selectedClient.total_installments).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-xs text-muted-foreground">Pagos</p>
                  <p className="text-xl font-bold">{selectedClient.paid_installments}/{selectedClient.total_installments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-info" />
                <div>
                  <p className="text-xs text-muted-foreground">Productos</p>
                  <p className="text-xl font-bold">{clientProducts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Tareas</p>
                  <p className="text-xl font-bold">{completedTasks}/{clientTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="products">Productos ({clientProducts.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tareas ({clientTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card className="bg-card border-border/50">
              <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Datos del Cliente</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Oferta:</span> <span className="font-medium">{selectedClient.offer_type}</span></div>
                    <div><span className="text-muted-foreground">Teléfono:</span> <span className="font-medium">{selectedClient.phone || '-'}</span></div>
                    <div><span className="text-muted-foreground">Inicio:</span> <span className="font-medium">{selectedClient.start_date || '-'}</span></div>
                    <div><span className="text-muted-foreground">Fin:</span> <span className="font-medium">{selectedClient.end_date || '-'}</span></div>
                  </div>
                  {selectedClient.notes && (
                    <div className="pt-2">
                      <span className="text-muted-foreground text-sm">Notas:</span>
                      <p className="text-sm mt-1">{selectedClient.notes}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Información de Pago</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{selectedClient.payment_type}</span></div>
                    <div><span className="text-muted-foreground">Plataforma:</span> <span className="font-medium">{selectedClient.platform} ({selectedClient.platform_fee}%)</span></div>
                    <div><span className="text-muted-foreground">Cuota:</span> <span className="font-medium">${selectedClient.installment_amount.toLocaleString()}</span></div>
                    <div><span className="text-muted-foreground">Próx. Venc:</span> <span className="font-medium">{selectedClient.next_due_date || '-'}</span></div>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progreso de Pagos</span>
                      <span className="font-medium">{Math.round((selectedClient.paid_installments / selectedClient.total_installments) * 100)}%</span>
                    </div>
                    <Progress value={(selectedClient.paid_installments / selectedClient.total_installments) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Agregar Producto</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle>Agregar Producto</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Nombre *</Label><Input value={productForm.product_name} onChange={e => setProductForm({ ...productForm, product_name: e.target.value })} className="bg-secondary/50" /></div>
                    <div><Label>Descripción</Label><Textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} className="bg-secondary/50" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Precio ($)</Label><Input type="number" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} className="bg-secondary/50" /></div>
                      <div><Label>Fecha Venta</Label><Input type="date" value={productForm.sold_date} onChange={e => setProductForm({ ...productForm, sold_date: e.target.value })} className="bg-secondary/50" /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleProductSubmit}>Agregar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card className="bg-card border-border/50">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientProducts.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.description || '-'}</TableCell>
                        <TableCell>${product.price?.toLocaleString() || 0}</TableCell>
                        <TableCell>{product.sold_date || '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(product.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {clientProducts.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay productos</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Agregar Tarea</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle>Agregar Tarea</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div><Label>Título *</Label><Input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="bg-secondary/50" /></div>
                    <div><Label>Descripción</Label><Textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="bg-secondary/50" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Estado</Label>
                        <Select value={taskForm.status} onValueChange={v => setTaskForm({ ...taskForm, status: v as TaskStatus })}>
                          <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(taskStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Fecha Límite</Label><Input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} className="bg-secondary/50" /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleTaskSubmit}>Agregar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid gap-3">
              {clientTasks.map(task => (
                <Card key={task.id} className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Checkbox checked={task.status === 'completada'} onCheckedChange={(c) => updateTaskStatus(task.id, c ? 'completada' : 'pendiente')} />
                      <div className="flex-1">
                        <p className={cn("font-medium", task.status === 'completada' && "line-through text-muted-foreground")}>{task.title}</p>
                        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                      </div>
                      <Badge className={cn('text-xs', taskStatusColors[task.status])}>{taskStatusLabels[task.status]}</Badge>
                      {task.due_date && <span className="text-sm text-muted-foreground">{task.due_date}</span>}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {task.progress > 0 && task.progress < 100 && (
                      <Progress value={task.progress} className="h-1 mt-2" />
                    )}
                  </CardContent>
                </Card>
              ))}
              {clientTasks.length === 0 && (
                <Card className="bg-card border-border/50"><CardContent className="p-8 text-center text-muted-foreground">No hay tareas</CardContent></Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">{clients.length} clientes • ${totalContractValue.toLocaleString()} total</p>
        </div>
        <Dialog open={isClientDialogOpen} onOpenChange={(open) => { setIsClientDialogOpen(open); if (!open) resetClientForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Nuevo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingClient ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cliente *</Label><Input value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Oferta</Label>
                  <Select value={clientForm.offer_type} onValueChange={v => setClientForm({ ...clientForm, offer_type: v as OfferType })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DWY">DWY (Done With You)</SelectItem>
                      <SelectItem value="DFY">DFY (Done For You)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Inicio</Label><Input type="date" value={clientForm.start_date} onChange={e => setClientForm({ ...clientForm, start_date: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Fin</Label><Input type="date" value={clientForm.end_date} onChange={e => setClientForm({ ...clientForm, end_date: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Estado</Label>
                  <Select value={clientForm.status} onValueChange={v => setClientForm({ ...clientForm, status: v as ClientStatus })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Tipo Pago</Label>
                  <Select value={clientForm.payment_type} onValueChange={v => setClientForm({ ...clientForm, payment_type: v as PaymentType })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Upfront">Upfront</SelectItem>
                      <SelectItem value="Mensual">Mensual</SelectItem>
                      <SelectItem value="Cuotas">Cuotas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Total Cuotas</Label><Input type="number" min="1" value={clientForm.total_installments} onChange={e => setClientForm({ ...clientForm, total_installments: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Pagadas</Label><Input type="number" min="0" value={clientForm.paid_installments} onChange={e => setClientForm({ ...clientForm, paid_installments: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Monto/Cuota</Label><Input type="number" min="0" value={clientForm.installment_amount} onChange={e => setClientForm({ ...clientForm, installment_amount: e.target.value })} className="bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Próx. Venc.</Label><Input type="date" value={clientForm.next_due_date} onChange={e => setClientForm({ ...clientForm, next_due_date: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Plataforma</Label>
                  <Select value={clientForm.platform} onValueChange={v => setClientForm({ ...clientForm, platform: v as PaymentPlatform })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stripe">Stripe</SelectItem>
                      <SelectItem value="Binance">Binance</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fee %</Label><Input type="number" step="0.1" value={clientForm.platform_fee} onChange={e => setClientForm({ ...clientForm, platform_fee: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>País</Label><Input value={clientForm.country} onChange={e => setClientForm({ ...clientForm, country: e.target.value })} className="bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Teléfono</Label><Input value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className="bg-secondary/50" /></div>
              </div>
              <div><Label>Notas</Label><Textarea value={clientForm.notes} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })} className="bg-secondary/50" /></div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetClientForm}>Cancelar</Button>
                <Button onClick={handleClientSubmit} className="bg-primary">{editingClient ? 'Guardar' : 'Agregar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['activo', 'pausado', 'finalizado', 'cancelado'] as ClientStatus[]).map(status => (
          <Card key={status} className={cn("bg-card border-border/50 cursor-pointer transition-all", filterStatus === status && "ring-2 ring-primary")} onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{clients.filter(c => c.status === status).length}</p>
              <Badge className={cn('text-xs border-0 mt-1', statusColors[status])}>{statusLabels[status]}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4 flex gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="bg-secondary/50" />
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(client => {
          const clientProducts = getClientProducts(client.id);
          const clientTasks = getClientTasks(client.id);
          const progress = (client.paid_installments / client.total_installments) * 100;
          
          return (
            <Card key={client.id} className="bg-card border-border/50 hover:border-primary/30 cursor-pointer transition-all" onClick={() => setSelectedClient(client)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-xs text-muted-foreground">{client.email || 'Sin email'}</p>
                    </div>
                  </div>
                  <Badge className={cn('text-xs border-0', statusColors[client.status])}>{statusLabels[client.status]}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span>{client.offer_type}</span>
                  <span>•</span>
                  <span>{client.country || 'Sin país'}</span>
                  <span>•</span>
                  <span>{client.platform}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Pagos: {client.paid_installments}/{client.total_installments}</span>
                  <span className="font-medium">${client.installment_amount.toLocaleString()}/cuota</span>
                </div>
                <Progress value={progress} className="h-1.5 mb-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                  <span>{clientProducts.length} productos</span>
                  <span>{clientTasks.length} tareas</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editClient(client)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteClient(client.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
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
            <p className="text-xl font-bold">${activeClients.length > 0 ? Math.round(totalContractValue / activeClients.length).toLocaleString() : 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
