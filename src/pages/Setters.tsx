import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Users, Calendar, TrendingUp, Edit2, Trash2, Award, CalendarCheck, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const formatSafeDate = (dateString: string | null | undefined, formatStr: string, options?: { locale?: typeof es }) => {
  if (!dateString) return '-';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '-';
    return format(date, formatStr, options);
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

interface SetterMeeting {
  id: string;
  setter_id: string;
  lead_name: string;
  lead_email?: string;
  lead_phone?: string;
  scheduled_date: string;
  attended: boolean;
  qualified: boolean;
  closed: boolean;
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

export default function Setters() {
  const [setters, setSetters] = useState<Setter[]>([]);
  const [meetings, setMeetings] = useState<SetterMeeting[]>([]);
  const [payments, setPayments] = useState<SetterPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSetterDialogOpen, setIsSetterDialogOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [editingSetter, setEditingSetter] = useState<Setter | null>(null);
  const [selectedSetterId, setSelectedSetterId] = useState<string | null>(null);

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

  const [meetingForm, setMeetingForm] = useState({
    setter_id: '',
    lead_name: '',
    lead_email: '',
    lead_phone: '',
    scheduled_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [settersRes, meetingsRes, paymentsRes] = await Promise.all([
      supabase.from('setters').select('*').order('name'),
      supabase.from('setter_meetings').select('*').order('scheduled_date', { ascending: false }),
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
    if (meetingsRes.data) {
      setMeetings(meetingsRes.data.map(m => ({
        ...m,
        qualified: m.qualified || false,
        closed: m.closed || false
      })) as SetterMeeting[]);
    }
    if (paymentsRes.data) setPayments(paymentsRes.data as SetterPayment[]);
    setLoading(false);
  };

  const getSetterMetrics = (setterId: string) => {
    const setterMeetings = meetings.filter(m => m.setter_id === setterId);
    const scheduled = setterMeetings.length;
    const attended = setterMeetings.filter(m => m.attended).length;
    const qualified = setterMeetings.filter(m => m.qualified).length;
    const closed = setterMeetings.filter(m => m.closed).length;
    
    const setterPayments = payments.filter(p => p.setter_id === setterId);
    const totalPaid = setterPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingPayments = 0; // This would need calculation based on meetings not yet paid
    
    return { scheduled, attended, qualified, closed, totalPaid, pendingPayments, rate: scheduled > 0 ? Math.round((attended / scheduled) * 100) : 0 };
  };

  const totalScheduled = meetings.length;
  const totalAttended = meetings.filter(m => m.attended).length;
  const totalQualified = meetings.filter(m => m.qualified).length;
  const totalClosed = meetings.filter(m => m.closed).length;

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

  const handleMeetingSubmit = async () => {
    if (!meetingForm.setter_id || !meetingForm.lead_name.trim() || !meetingForm.scheduled_date) {
      toast.error('Setter, nombre del lead y fecha son requeridos');
      return;
    }

    const { error } = await supabase.from('setter_meetings').insert({
      setter_id: meetingForm.setter_id,
      lead_name: meetingForm.lead_name,
      lead_email: meetingForm.lead_email || null,
      lead_phone: meetingForm.lead_phone || null,
      scheduled_date: meetingForm.scheduled_date,
      notes: meetingForm.notes || null,
      attended: false,
      qualified: false,
      closed: false
    });

    if (error) { toast.error('Error al crear reunión'); return; }
    toast.success('Reunión agendada');
    resetMeetingForm();
    fetchData();
  };

  const resetMeetingForm = () => {
    setMeetingForm({ setter_id: selectedSetterId || '', lead_name: '', lead_email: '', lead_phone: '', scheduled_date: '', notes: '' });
    setIsMeetingDialogOpen(false);
  };

  const toggleAttendance = async (meetingId: string, attended: boolean) => {
    const { error } = await supabase.from('setter_meetings').update({ attended }).eq('id', meetingId);
    if (error) { toast.error('Error al actualizar'); return; }
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, attended } : m));
  };

  const toggleQualified = async (meetingId: string, qualified: boolean) => {
    const { error } = await supabase.from('setter_meetings').update({ qualified }).eq('id', meetingId);
    if (error) { toast.error('Error al actualizar'); return; }
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, qualified } : m));
  };

  const toggleClosed = async (meetingId: string, closed: boolean) => {
    const { error } = await supabase.from('setter_meetings').update({ closed }).eq('id', meetingId);
    if (error) { toast.error('Error al actualizar'); return; }
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, closed } : m));
  };

  const deleteMeeting = async (id: string) => {
    const { error } = await supabase.from('setter_meetings').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Reunión eliminada');
    fetchData();
  };

  const filteredMeetings = selectedSetterId 
    ? meetings.filter(m => m.setter_id === selectedSetterId)
    : meetings;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Setters</h1>
          <p className="text-muted-foreground">Métricas y reuniones del equipo</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isMeetingDialogOpen} onOpenChange={(open) => { setIsMeetingDialogOpen(open); if (!open) resetMeetingForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setMeetingForm(prev => ({ ...prev, setter_id: selectedSetterId || '' }))}>
                <CalendarCheck className="h-4 w-4 mr-2" />Agendar Reunión
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader><DialogTitle>Agendar Reunión</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Setter *</Label>
                  <Select value={meetingForm.setter_id} onValueChange={v => setMeetingForm({ ...meetingForm, setter_id: v })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar setter" /></SelectTrigger>
                    <SelectContent>
                      {setters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre del Lead *</Label>
                  <Input value={meetingForm.lead_name} onChange={e => setMeetingForm({ ...meetingForm, lead_name: e.target.value })} className="bg-secondary/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={meetingForm.lead_email} onChange={e => setMeetingForm({ ...meetingForm, lead_email: e.target.value })} className="bg-secondary/50" />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={meetingForm.lead_phone} onChange={e => setMeetingForm({ ...meetingForm, lead_phone: e.target.value })} className="bg-secondary/50" />
                  </div>
                </div>
                <div>
                  <Label>Fecha y Hora *</Label>
                  <Input type="datetime-local" value={meetingForm.scheduled_date} onChange={e => setMeetingForm({ ...meetingForm, scheduled_date: e.target.value })} className="bg-secondary/50" />
                </div>
                <div>
                  <Label>Notas</Label>
                  <Input value={meetingForm.notes} onChange={e => setMeetingForm({ ...meetingForm, notes: e.target.value })} placeholder="Observaciones..." className="bg-secondary/50" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={resetMeetingForm}>Cancelar</Button>
                  <Button onClick={handleMeetingSubmit} className="bg-primary">Agendar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-info" />
            <p className="text-2xl font-bold">{setters.length}</p>
            <p className="text-xs text-muted-foreground">Setters</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{totalScheduled}</p>
            <p className="text-xs text-muted-foreground">Total Agendas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{totalQualified}</p>
            <p className="text-xs text-muted-foreground">Calificadas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalClosed}</p>
            <p className="text-xs text-muted-foreground">Cerradas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{totalScheduled > 0 ? Math.round((totalAttended / totalScheduled) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">Show Up Rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="setters" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="setters">Setters</TabsTrigger>
          <TabsTrigger value="meetings">Reuniones</TabsTrigger>
        </TabsList>

        <TabsContent value="setters" className="space-y-4">
          {/* Chart */}
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-base">Comparativa de Setters</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={setters.map(s => {
                    const metrics = getSetterMetrics(s.id);
                    return { name: s.name.split(' ')[0], agendadas: metrics.scheduled, calificadas: metrics.qualified, cerradas: metrics.closed };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="agendadas" fill="hsl(var(--warning))" name="Agendadas" />
                    <Bar dataKey="calificadas" fill="hsl(var(--info))" name="Calificadas" />
                    <Bar dataKey="cerradas" fill="hsl(var(--success))" name="Cerradas" />
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
                    <TableHead>Agendas</TableHead>
                    <TableHead>Calificadas</TableHead>
                    <TableHead>Cerradas</TableHead>
                    <TableHead>Disp. Horaria</TableHead>
                    <TableHead>Hs. Dedicadas</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setters.map((setter) => {
                    const metrics = getSetterMetrics(setter.id);
                    return (
                      <TableRow key={setter.id} className={cn(selectedSetterId === setter.id && "bg-primary/10")}>
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
                        <TableCell>{metrics.scheduled}</TableCell>
                        <TableCell>{metrics.qualified}</TableCell>
                        <TableCell>{metrics.closed}</TableCell>
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
                      <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                        No hay setters. Agrega uno para comenzar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          {selectedSetterId && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">Filtrado por: {setters.find(s => s.id === selectedSetterId)?.name}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSetterId(null)}>Limpiar filtro</Button>
            </div>
          )}
          <Card className="bg-card border-border/50">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Asist.</TableHead>
                    <TableHead className="w-12">Calif.</TableHead>
                    <TableHead className="w-12">Cerr.</TableHead>
                    <TableHead>Setter</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeetings.map(meeting => {
                    const setter = setters.find(s => s.id === meeting.setter_id);
                    return (
                      <TableRow key={meeting.id}>
                        <TableCell>
                          <Checkbox checked={meeting.attended} onCheckedChange={(checked) => toggleAttendance(meeting.id, !!checked)} />
                        </TableCell>
                        <TableCell>
                          <Checkbox checked={meeting.qualified} onCheckedChange={(checked) => toggleQualified(meeting.id, !!checked)} />
                        </TableCell>
                        <TableCell>
                          <Checkbox checked={meeting.closed} onCheckedChange={(checked) => toggleClosed(meeting.id, !!checked)} />
                        </TableCell>
                        <TableCell className="font-medium">{setter?.name || '-'}</TableCell>
                        <TableCell>{meeting.lead_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{meeting.lead_email || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{meeting.lead_phone || '-'}</TableCell>
                        <TableCell>{formatSafeDate(meeting.scheduled_date, "dd MMM yyyy HH:mm", { locale: es })}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{meeting.notes || '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMeeting(meeting.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredMeetings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No hay reuniones registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
