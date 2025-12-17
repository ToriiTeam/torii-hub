import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Phone, Users, Calendar, TrendingUp, Edit2, Trash2, Star, Award, CalendarCheck, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type SetterStage = 'nuevo' | 'entrenamiento' | 'activo' | 'senior' | 'lider';

interface Setter {
  id: string;
  name: string;
  avatar?: string;
  stage: SetterStage;
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
  notes?: string;
}

const stageLabels: Record<SetterStage, string> = {
  nuevo: 'Nuevo',
  entrenamiento: 'En Entrenamiento',
  activo: 'Activo',
  senior: 'Senior',
  lider: 'Líder'
};

const stageColors: Record<SetterStage, string> = {
  nuevo: 'bg-muted text-muted-foreground',
  entrenamiento: 'bg-info/20 text-info',
  activo: 'bg-success/20 text-success',
  senior: 'bg-warning/20 text-warning',
  lider: 'bg-primary/20 text-primary'
};

export default function Setters() {
  const [setters, setSetters] = useState<Setter[]>([]);
  const [meetings, setMeetings] = useState<SetterMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSetterDialogOpen, setIsSetterDialogOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [editingSetter, setEditingSetter] = useState<Setter | null>(null);
  const [selectedSetterId, setSelectedSetterId] = useState<string | null>(null);

  const [setterForm, setSetterForm] = useState({
    name: '',
    stage: 'nuevo' as SetterStage,
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
    const [settersRes, meetingsRes] = await Promise.all([
      supabase.from('setters').select('*').order('name'),
      supabase.from('setter_meetings').select('*').order('scheduled_date', { ascending: false })
    ]);
    
    if (settersRes.data) setSetters(settersRes.data as Setter[]);
    if (meetingsRes.data) setMeetings(meetingsRes.data as SetterMeeting[]);
    setLoading(false);
  };

  const getSetterMetrics = (setterId: string) => {
    const setterMeetings = meetings.filter(m => m.setter_id === setterId);
    const scheduled = setterMeetings.length;
    const attended = setterMeetings.filter(m => m.attended).length;
    return { scheduled, attended, rate: scheduled > 0 ? Math.round((attended / scheduled) * 100) : 0 };
  };

  const totalScheduled = meetings.length;
  const totalAttended = meetings.filter(m => m.attended).length;
  const avgCommitment = setters.length ? (setters.reduce((sum, s) => sum + s.commitment, 0) / setters.length).toFixed(1) : '0';

  const handleSetterSubmit = async () => {
    if (!setterForm.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    const data = {
      name: setterForm.name,
      stage: setterForm.stage,
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
    setSetterForm({ name: '', stage: 'nuevo', commitment: '3', goal: '10', notes: '' });
    setEditingSetter(null);
    setIsSetterDialogOpen(false);
  };

  const editSetter = (setter: Setter) => {
    setEditingSetter(setter);
    setSetterForm({
      name: setter.name,
      stage: setter.stage,
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
      attended: false
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

  const deleteMeeting = async (id: string) => {
    const { error } = await supabase.from('setter_meetings').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Reunión eliminada');
    fetchData();
  };

  const renderCommitmentStars = (value: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn("h-3 w-3", i <= value ? "fill-warning text-warning" : "text-muted-foreground/30")} />
      ))}
    </div>
  );

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
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader><DialogTitle>{editingSetter ? 'Editar' : 'Agregar'} Setter</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={setterForm.name} onChange={e => setSetterForm({ ...setterForm, name: e.target.value })} className="bg-secondary/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Etapa</Label>
                    <Select value={setterForm.stage} onValueChange={v => setSetterForm({ ...setterForm, stage: v as SetterStage })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Compromiso (1-5)</Label>
                    <Input type="number" min="1" max="5" value={setterForm.commitment} onChange={e => setSetterForm({ ...setterForm, commitment: e.target.value })} className="bg-secondary/50" />
                  </div>
                </div>
                <div>
                  <Label>Meta de Reuniones</Label>
                  <Input type="number" value={setterForm.goal} onChange={e => setSetterForm({ ...setterForm, goal: e.target.value })} className="bg-secondary/50" />
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
            <p className="text-xs text-muted-foreground">Reuniones Agendadas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{totalAttended}</p>
            <p className="text-xs text-muted-foreground">Asistieron</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalScheduled > 0 ? Math.round((totalAttended / totalScheduled) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">Tasa Asistencia</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{avgCommitment}</p>
            <p className="text-xs text-muted-foreground">Compromiso Prom.</p>
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
                    return { name: s.name.split(' ')[0], agendadas: metrics.scheduled, asistieron: metrics.attended };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="agendadas" fill="hsl(var(--warning))" name="Agendadas" />
                    <Bar dataKey="asistieron" fill="hsl(var(--success))" name="Asistieron" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Setter Cards */}
          <div className="grid gap-4">
            {setters.map((setter, i) => {
              const metrics = getSetterMetrics(setter.id);
              return (
                <Card key={setter.id} className={cn("bg-card border-border/50 cursor-pointer transition-all", selectedSetterId === setter.id && "ring-2 ring-primary")} onClick={() => setSelectedSetterId(selectedSetterId === setter.id ? null : setter.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold">
                        {setter.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{setter.name}</h3>
                          <Badge className="bg-info/20 text-info border-0 text-xs">#{i + 1}</Badge>
                          <Badge className={cn('text-xs border-0', stageColors[setter.stage])}>{stageLabels[setter.stage]}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{metrics.scheduled} agendadas</span>
                          <span>{metrics.attended} asistieron</span>
                          <span>{metrics.rate}% tasa</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Compromiso:</span>
                            {renderCommitmentStars(setter.commitment)}
                          </div>
                        </div>
                        {setter.notes && <p className="text-xs text-muted-foreground mt-1 italic">{setter.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Meta: {setter.goal}</p>
                        <Progress value={(metrics.attended / setter.goal) * 100} className="h-2 w-32" />
                        <p className="text-xs text-muted-foreground mt-1">{metrics.attended}/{setter.goal}</p>
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editSetter(setter)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSetter(setter.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {setters.length === 0 && (
              <Card className="bg-card border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No hay setters. Agrega uno para comenzar.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          {selectedSetterId && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">Filtrado por: {setters.find(s => s.id === selectedSetterId)?.name}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSetterId(null)}>Limpiar filtro</Button>
            </div>
          )}
          <Card className="bg-card border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">✓</TableHead>
                    <TableHead>Setter</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Contacto</TableHead>
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
                        <TableCell className="font-medium">{setter?.name || '-'}</TableCell>
                        <TableCell>{meeting.lead_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {meeting.lead_email && <div>{meeting.lead_email}</div>}
                          {meeting.lead_phone && <div>{meeting.lead_phone}</div>}
                        </TableCell>
                        <TableCell>{format(new Date(meeting.scheduled_date), "dd MMM yyyy HH:mm", { locale: es })}</TableCell>
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
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
