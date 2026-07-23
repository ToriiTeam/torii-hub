// Not routed. This was the previous /setters page content — a setter CRM
// (people/performance/payments) — before it got replaced with an
// "en construcción" placeholder in Setters.tsx pending the real automated
// setting flow (GHL form → agenda → webhook → Supabase). Kept here in case
// this CRM view gets revived alongside or instead of that flow.
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Users, TrendingUp, Edit2, Trash2, Award, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { format, isValid, parseISO } from 'date-fns';

const formatSafeDate = (dateString: string | null | undefined, formatStr: string) => {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '-';
    return format(date, formatStr);
  } catch {
    return '-';
  }
};

type SetterStatus = 'activo' | 'inactivo' | 'introduciendose' | 'pendiente_reunion' | 'calentamiento';
type SetterPerformance = 'alto' | 'medio' | 'bajo' | 'alto_restriccion' | 'medio_restriccion' | 'bajo_restriccion';

interface Setter {
  id: string;
  name: string;
  avatar?: string;
  platform?: string;
  country?: string;
  setter_status: SetterStatus;
  performance: SetterPerformance;
  start_date?: string;
  availability_hours?: string;
  dedicated_hours: number;
  commitment: number;
  goal: number;
  notes?: string;
}

interface SetterPayment {
  id: string;
  setter_id: string;
  amount: number;
  payment_date: string;
}

const statusLabels: Record<SetterStatus, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  introduciendose: 'Introduciéndose',
  pendiente_reunion: 'Pendiente Reunión',
  calentamiento: 'Calentamiento'
};

const statusColors: Record<SetterStatus, string> = {
  activo: 'bg-success/20 text-success',
  inactivo: 'bg-muted text-muted-foreground',
  introduciendose: 'bg-info/20 text-info',
  pendiente_reunion: 'bg-warning/20 text-warning',
  calentamiento: 'bg-primary/20 text-primary'
};

const performanceLabels: Record<SetterPerformance, string> = {
  alto: 'Rendimiento Alto',
  medio: 'Rendimiento Medio',
  bajo: 'Rendimiento Bajo',
  alto_restriccion: 'Alto c/Restricción',
  medio_restriccion: 'Medio c/Restricción',
  bajo_restriccion: 'Bajo c/Restricción'
};

const performanceColors: Record<SetterPerformance, string> = {
  alto: 'bg-success/20 text-success',
  medio: 'bg-warning/20 text-warning',
  bajo: 'bg-destructive/20 text-destructive',
  alto_restriccion: 'bg-success/20 text-success border border-success',
  medio_restriccion: 'bg-warning/20 text-warning border border-warning',
  bajo_restriccion: 'bg-destructive/20 text-destructive border border-destructive'
};

export default function SettersLegacy() {
  const [setters, setSetters] = useState<Setter[]>([]);
  const [payments, setPayments] = useState<SetterPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSetterDialogOpen, setIsSetterDialogOpen] = useState(false);
  const [editingSetter, setEditingSetter] = useState<Setter | null>(null);

  const [setterForm, setSetterForm] = useState({
    name: '',
    platform: '',
    country: '',
    setter_status: 'activo' as SetterStatus,
    performance: 'medio' as SetterPerformance,
    start_date: '',
    availability_hours: '',
    dedicated_hours: '0',
    commitment: '3',
    goal: '10',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [settersRes, paymentsRes] = await Promise.all([
      supabase.from('setters').select('*').order('name'),
      supabase.from('setter_payments').select('*').order('payment_date', { ascending: false })
    ]);

    if (settersRes.data) {
      setSetters(settersRes.data.map(s => ({
        ...s,
        setter_status: s.setter_status || 'activo',
        performance: s.performance || 'medio',
        dedicated_hours: s.dedicated_hours || 0
      })) as Setter[]);
    }
    if (paymentsRes.data) setPayments(paymentsRes.data as SetterPayment[]);
    setLoading(false);
  };

  const getSetterMetrics = (setterId: string) => {
    const setterPayments = payments.filter(p => p.setter_id === setterId);
    const totalPaid = setterPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingPayments = 0;

    return { totalPaid, pendingPayments };
  };

  const handleSetterSubmit = async () => {
    if (!setterForm.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    const data = {
      name: setterForm.name,
      platform: setterForm.platform || null,
      country: setterForm.country || null,
      setter_status: setterForm.setter_status,
      performance: setterForm.performance,
      start_date: setterForm.start_date || null,
      availability_hours: setterForm.availability_hours || null,
      dedicated_hours: parseFloat(setterForm.dedicated_hours) || 0,
      commitment: parseInt(setterForm.commitment) || 3,
      goal: parseInt(setterForm.goal) || 10,
      notes: setterForm.notes || null
    };

    if (editingSetter) {
      const { error } = await supabase.from('setters').update(data).eq('id', editingSetter.id);
      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Setter actualizado');
    } else {
      const { error } = await supabase.from('setters').insert(data);
      if (error) { toast.error('Error al crear'); return; }
      toast.success('Setter agregado');
    }

    resetSetterForm();
    fetchData();
  };

  const resetSetterForm = () => {
    setSetterForm({
      name: '',
      platform: '',
      country: '',
      setter_status: 'activo',
      performance: 'medio',
      start_date: '',
      availability_hours: '',
      dedicated_hours: '0',
      commitment: '3',
      goal: '10',
      notes: ''
    });
    setEditingSetter(null);
    setIsSetterDialogOpen(false);
  };

  const editSetter = (setter: Setter) => {
    setEditingSetter(setter);
    setSetterForm({
      name: setter.name,
      platform: setter.platform || '',
      country: setter.country || '',
      setter_status: setter.setter_status || 'activo',
      performance: setter.performance || 'medio',
      start_date: setter.start_date || '',
      availability_hours: setter.availability_hours || '',
      dedicated_hours: setter.dedicated_hours?.toString() || '0',
      commitment: setter.commitment.toString(),
      goal: setter.goal.toString(),
      notes: setter.notes || ''
    });
    setIsSetterDialogOpen(true);
  };

  const deleteSetter = async (id: string) => {
    const { error } = await supabase.from('setters').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Setter eliminado');
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Setters</h1>
          <p className="text-muted-foreground">Gestión del equipo de setters</p>
        </div>
        <Dialog open={isSetterDialogOpen} onOpenChange={(open) => { setIsSetterDialogOpen(open); if (!open) resetSetterForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Agregar Setter</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingSetter ? 'Editar' : 'Agregar'} Setter</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nombre *</Label>
                <Input value={setterForm.name} onChange={e => setSetterForm({ ...setterForm, name: e.target.value })} className="bg-secondary/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plataforma</Label>
                  <Input value={setterForm.platform} onChange={e => setSetterForm({ ...setterForm, platform: e.target.value })} placeholder="Instagram, Facebook..." className="bg-secondary/50" />
                </div>
                <div>
                  <Label>País</Label>
                  <Input value={setterForm.country} onChange={e => setSetterForm({ ...setterForm, country: e.target.value })} placeholder="Argentina, México..." className="bg-secondary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Select value={setterForm.setter_status} onValueChange={v => setSetterForm({ ...setterForm, setter_status: v as SetterStatus })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rendimiento</Label>
                  <Select value={setterForm.performance} onValueChange={v => setSetterForm({ ...setterForm, performance: v as SetterPerformance })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(performanceLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de Inicio</Label>
                  <Input type="date" value={setterForm.start_date} onChange={e => setSetterForm({ ...setterForm, start_date: e.target.value })} className="bg-secondary/50" />
                </div>
                <div>
                  <Label>Meta de Reuniones</Label>
                  <Input type="number" value={setterForm.goal} onChange={e => setSetterForm({ ...setterForm, goal: e.target.value })} className="bg-secondary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Disponibilidad Horaria</Label>
                  <Input value={setterForm.availability_hours} onChange={e => setSetterForm({ ...setterForm, availability_hours: e.target.value })} placeholder="9:00 - 18:00" className="bg-secondary/50" />
                </div>
                <div>
                  <Label>Horas Dedicadas</Label>
                  <Input type="number" step="0.5" value={setterForm.dedicated_hours} onChange={e => setSetterForm({ ...setterForm, dedicated_hours: e.target.value })} className="bg-secondary/50" />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Input value={setterForm.notes} onChange={e => setSetterForm({ ...setterForm, notes: e.target.value })} placeholder="Observaciones..." className="bg-secondary/50" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetSetterForm}>Cancelar</Button>
                <Button onClick={handleSetterSubmit} className="bg-primary">{editingSetter ? 'Guardar' : 'Agregar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-info" />
            <p className="text-2xl font-bold">{setters.length}</p>
            <p className="text-xs text-muted-foreground">Setters</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{setters.filter(s => s.setter_status === 'activo').length}</p>
            <p className="text-xs text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{setters.filter(s => s.performance === 'alto').length}</p>
            <p className="text-xs text-muted-foreground">Alto Rendimiento</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">${payments.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Pagado</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-card border-border/50">
        <CardHeader><CardTitle className="text-base">Rendimiento por Setter</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={setters.map(s => {
                const metrics = getSetterMetrics(s.id);
                return { name: s.name.split(' ')[0], pagos: metrics.totalPaid };
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="pagos" fill="hsl(var(--success))" name="Pagos Realizados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Setters Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setter</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rendimiento</TableHead>
                <TableHead>F. Inicio</TableHead>
                <TableHead>Pagos Pend.</TableHead>
                <TableHead>Pagos Real.</TableHead>
                <TableHead>Disp. Horaria</TableHead>
                <TableHead>Hs. Dedicadas</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setters.map((setter) => {
                const metrics = getSetterMetrics(setter.id);
                return (
                  <TableRow key={setter.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                          {setter.name.charAt(0)}
                        </div>
                        {setter.name}
                      </div>
                    </TableCell>
                    <TableCell>{setter.platform || '-'}</TableCell>
                    <TableCell>{setter.country || '-'}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs border-0', statusColors[setter.setter_status] || 'bg-muted text-muted-foreground')}>
                        {statusLabels[setter.setter_status] || 'Sin estado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', performanceColors[setter.performance] || 'bg-muted text-muted-foreground')}>
                        {performanceLabels[setter.performance] || 'Sin rendimiento'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatSafeDate(setter.start_date, "dd/MM/yy")}</TableCell>
                    <TableCell className="text-warning">${metrics.pendingPayments.toLocaleString()}</TableCell>
                    <TableCell className="text-success">${metrics.totalPaid.toLocaleString()}</TableCell>
                    <TableCell>{setter.availability_hours || '-'}</TableCell>
                    <TableCell>{setter.dedicated_hours}h</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editSetter(setter)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSetter(setter.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {setters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No hay setters. Agrega uno para comenzar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
