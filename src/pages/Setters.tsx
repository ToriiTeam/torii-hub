import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/hooks/useStore';
import { initialSetters } from '@/data/initialData';
import { Setter } from '@/types/torii';
import { toast } from 'sonner';
import { Plus, Phone, Users, Calendar, TrendingUp, Edit2, Trash2, Star, Target, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

type SetterStage = 'nuevo' | 'entrenamiento' | 'activo' | 'senior' | 'lider';

interface ExtendedSetter extends Setter {
  stage: SetterStage;
  commitment: number; // 1-5
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

const initialExtendedSetters: ExtendedSetter[] = initialSetters.map((s, i) => ({
  ...s,
  stage: ['activo', 'senior', 'lider'][i] as SetterStage,
  commitment: [4, 5, 5][i]
}));

export default function Setters() {
  const [setters, setSetters] = useStore<ExtendedSetter[]>('setters_extended', initialExtendedSetters);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetter, setEditingSetter] = useState<ExtendedSetter | null>(null);

  const [form, setForm] = useState({
    name: '',
    calls: '0',
    leads: '0',
    appointments: '0',
    confirmed: '0',
    goal: '10',
    stage: 'nuevo' as SetterStage,
    commitment: '3',
    notes: ''
  });

  const totalCalls = setters.reduce((sum, s) => sum + s.metrics.calls, 0);
  const totalLeads = setters.reduce((sum, s) => sum + s.metrics.leads, 0);
  const totalAppointments = setters.reduce((sum, s) => sum + s.metrics.appointments, 0);
  const avgCommitment = setters.length ? (setters.reduce((sum, s) => sum + s.commitment, 0) / setters.length).toFixed(1) : '0';

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (editingSetter) {
      setSetters(prev => prev.map(s => s.id === editingSetter.id ? {
        ...s,
        name: form.name,
        metrics: {
          calls: parseInt(form.calls) || 0,
          leads: parseInt(form.leads) || 0,
          appointments: parseInt(form.appointments) || 0,
          confirmed: parseInt(form.confirmed) || 0
        },
        goal: parseInt(form.goal) || 10,
        stage: form.stage,
        commitment: parseInt(form.commitment) || 3,
        notes: form.notes || undefined
      } : s));
      toast.success('Setter actualizado');
    } else {
      const newSetter: ExtendedSetter = {
        id: Date.now().toString(),
        name: form.name,
        metrics: {
          calls: parseInt(form.calls) || 0,
          leads: parseInt(form.leads) || 0,
          appointments: parseInt(form.appointments) || 0,
          confirmed: parseInt(form.confirmed) || 0
        },
        goal: parseInt(form.goal) || 10,
        stage: form.stage,
        commitment: parseInt(form.commitment) || 3,
        notes: form.notes || undefined
      };
      setSetters(prev => [...prev, newSetter]);
      toast.success('Setter agregado');
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', calls: '0', leads: '0', appointments: '0', confirmed: '0', goal: '10', stage: 'nuevo', commitment: '3', notes: '' });
    setEditingSetter(null);
    setIsDialogOpen(false);
  };

  const editSetter = (setter: ExtendedSetter) => {
    setEditingSetter(setter);
    setForm({
      name: setter.name,
      calls: setter.metrics.calls.toString(),
      leads: setter.metrics.leads.toString(),
      appointments: setter.metrics.appointments.toString(),
      confirmed: setter.metrics.confirmed.toString(),
      goal: setter.goal.toString(),
      stage: setter.stage,
      commitment: setter.commitment.toString(),
      notes: setter.notes || ''
    });
    setIsDialogOpen(true);
  };

  const deleteSetter = (id: string) => {
    setSetters(prev => prev.filter(s => s.id !== id));
    toast.success('Setter eliminado');
  };

  const renderCommitmentStars = (value: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={cn("h-3 w-3", i <= value ? "fill-warning text-warning" : "text-muted-foreground/30")} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Setters</h1>
          <p className="text-muted-foreground">Métricas y rendimiento del equipo</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Agregar Setter</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle>{editingSetter ? 'Editar' : 'Agregar'} Setter</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Etapa</Label>
                  <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v as SetterStage })}>
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
                  <Input type="number" min="1" max="5" value={form.commitment} onChange={e => setForm({ ...form, commitment: e.target.value })} className="bg-secondary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Llamadas</Label>
                  <Input type="number" value={form.calls} onChange={e => setForm({ ...form, calls: e.target.value })} className="bg-secondary/50" />
                </div>
                <div>
                  <Label>Leads</Label>
                  <Input type="number" value={form.leads} onChange={e => setForm({ ...form, leads: e.target.value })} className="bg-secondary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Citas</Label>
                  <Input type="number" value={form.appointments} onChange={e => setForm({ ...form, appointments: e.target.value })} className="bg-secondary/50" />
                </div>
                <div>
                  <Label>Confirmadas</Label>
                  <Input type="number" value={form.confirmed} onChange={e => setForm({ ...form, confirmed: e.target.value })} className="bg-secondary/50" />
                </div>
              </div>
              <div>
                <Label>Meta de Citas</Label>
                <Input type="number" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <Label>Notas</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones..." className="bg-secondary/50" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSubmit} className="bg-primary">{editingSetter ? 'Guardar' : 'Agregar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Phone className="h-8 w-8 mx-auto mb-2 text-info" />
            <p className="text-2xl font-bold">{totalCalls}</p>
            <p className="text-xs text-muted-foreground">Llamadas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{totalLeads}</p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{totalAppointments}</p>
            <p className="text-xs text-muted-foreground">Citas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalCalls > 0 ? ((totalLeads / totalCalls) * 100).toFixed(0) : 0}%</p>
            <p className="text-xs text-muted-foreground">Conversión</p>
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

      <Card className="bg-card border-border/50">
        <CardHeader><CardTitle className="text-base">Comparativa de Setters</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={setters.map(s => ({ name: s.name.split(' ')[0], calls: s.metrics.calls, leads: s.metrics.leads, citas: s.metrics.appointments }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="calls" fill="hsl(var(--info))" name="Llamadas" />
                <Bar dataKey="leads" fill="hsl(var(--success))" name="Leads" />
                <Bar dataKey="citas" fill="hsl(var(--warning))" name="Citas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {setters.map((setter, i) => (
          <Card key={setter.id} className="bg-card border-border/50">
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
                    <span>{setter.metrics.calls} llamadas</span>
                    <span>{setter.metrics.leads} leads</span>
                    <span>{setter.metrics.confirmed} confirmados</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">Compromiso:</span>
                      {renderCommitmentStars(setter.commitment)}
                    </div>
                  </div>
                  {setter.notes && <p className="text-xs text-muted-foreground mt-1 italic">{setter.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Meta: {setter.goal} citas</p>
                  <Progress value={(setter.metrics.confirmed / setter.goal) * 100} className="h-2 w-32" />
                  <p className="text-xs text-muted-foreground mt-1">{setter.metrics.confirmed}/{setter.goal}</p>
                </div>
                <div className="flex gap-1">
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
        ))}
      </div>
    </div>
  );
}
