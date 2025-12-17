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
import { initialClosers } from '@/data/initialData';
import { Closer } from '@/types/torii';
import { toast } from 'sonner';
import { Plus, Handshake, DollarSign, FileText, TrendingUp, Edit2, Trash2, Star, Target, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

type CloserStage = 'nuevo' | 'entrenamiento' | 'activo' | 'senior' | 'lider';

interface ExtendedCloser extends Closer {
  stage: CloserStage;
  commitment: number; // 1-5
  notes?: string;
}

const stageLabels: Record<CloserStage, string> = {
  nuevo: 'Nuevo',
  entrenamiento: 'En Entrenamiento',
  activo: 'Activo',
  senior: 'Senior',
  lider: 'Líder'
};

const stageColors: Record<CloserStage, string> = {
  nuevo: 'bg-muted text-muted-foreground',
  entrenamiento: 'bg-info/20 text-info',
  activo: 'bg-success/20 text-success',
  senior: 'bg-warning/20 text-warning',
  lider: 'bg-primary/20 text-primary'
};

const initialExtendedClosers: ExtendedCloser[] = initialClosers.map((c, i) => ({
  ...c,
  stage: ['senior', 'lider'][i] as CloserStage,
  commitment: [4, 5][i]
}));

export default function Closers() {
  const [closers, setClosers] = useStore<ExtendedCloser[]>('closers_extended', initialExtendedClosers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCloser, setEditingCloser] = useState<ExtendedCloser | null>(null);

  const [form, setForm] = useState({
    name: '',
    meetings: '0',
    proposals: '0',
    closed: '0',
    totalValue: '0',
    goal: '50000',
    stage: 'nuevo' as CloserStage,
    commitment: '3',
    notes: ''
  });

  const totalMeetings = closers.reduce((sum, c) => sum + c.metrics.meetings, 0);
  const totalProposals = closers.reduce((sum, c) => sum + c.metrics.proposals, 0);
  const totalClosed = closers.reduce((sum, c) => sum + c.metrics.closed, 0);
  const totalValue = closers.reduce((sum, c) => sum + c.metrics.totalValue, 0);
  const avgCommitment = closers.length ? (closers.reduce((sum, c) => sum + c.commitment, 0) / closers.length).toFixed(1) : '0';

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (editingCloser) {
      setClosers(prev => prev.map(c => c.id === editingCloser.id ? {
        ...c,
        name: form.name,
        metrics: {
          meetings: parseInt(form.meetings) || 0,
          proposals: parseInt(form.proposals) || 0,
          closed: parseInt(form.closed) || 0,
          totalValue: parseFloat(form.totalValue) || 0
        },
        goal: parseFloat(form.goal) || 50000,
        stage: form.stage,
        commitment: parseInt(form.commitment) || 3,
        notes: form.notes || undefined
      } : c));
      toast.success('Closer actualizado');
    } else {
      const newCloser: ExtendedCloser = {
        id: Date.now().toString(),
        name: form.name,
        metrics: {
          meetings: parseInt(form.meetings) || 0,
          proposals: parseInt(form.proposals) || 0,
          closed: parseInt(form.closed) || 0,
          totalValue: parseFloat(form.totalValue) || 0
        },
        goal: parseFloat(form.goal) || 50000,
        stage: form.stage,
        commitment: parseInt(form.commitment) || 3,
        notes: form.notes || undefined
      };
      setClosers(prev => [...prev, newCloser]);
      toast.success('Closer agregado');
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', meetings: '0', proposals: '0', closed: '0', totalValue: '0', goal: '50000', stage: 'nuevo', commitment: '3', notes: '' });
    setEditingCloser(null);
    setIsDialogOpen(false);
  };

  const editCloser = (closer: ExtendedCloser) => {
    setEditingCloser(closer);
    setForm({
      name: closer.name,
      meetings: closer.metrics.meetings.toString(),
      proposals: closer.metrics.proposals.toString(),
      closed: closer.metrics.closed.toString(),
      totalValue: closer.metrics.totalValue.toString(),
      goal: closer.goal.toString(),
      stage: closer.stage,
      commitment: closer.commitment.toString(),
      notes: closer.notes || ''
    });
    setIsDialogOpen(true);
  };

  const deleteCloser = (id: string) => {
    setClosers(prev => prev.filter(c => c.id !== id));
    toast.success('Closer eliminado');
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
          <h1 className="text-2xl font-bold">Closers</h1>
          <p className="text-muted-foreground">Métricas de ventas y cierres</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Agregar Closer</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle>{editingCloser ? 'Editar' : 'Agregar'} Closer</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Etapa</Label>
                  <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v as CloserStage })}>
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
                  <Label>Reuniones</Label>
                  <Input type="number" value={form.meetings} onChange={e => setForm({ ...form, meetings: e.target.value })} className="bg-secondary/50" />
                </div>
                <div>
                  <Label>Propuestas</Label>
                  <Input type="number" value={form.proposals} onChange={e => setForm({ ...form, proposals: e.target.value })} className="bg-secondary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cierres</Label>
                  <Input type="number" value={form.closed} onChange={e => setForm({ ...form, closed: e.target.value })} className="bg-secondary/50" />
                </div>
                <div>
                  <Label>Valor Total ($)</Label>
                  <Input type="number" value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} className="bg-secondary/50" />
                </div>
              </div>
              <div>
                <Label>Meta ($)</Label>
                <Input type="number" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} className="bg-secondary/50" />
              </div>
              <div>
                <Label>Notas</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones..." className="bg-secondary/50" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSubmit} className="bg-primary">{editingCloser ? 'Guardar' : 'Agregar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Handshake className="h-8 w-8 mx-auto mb-2 text-info" />
            <p className="text-2xl font-bold">{totalMeetings}</p>
            <p className="text-xs text-muted-foreground">Reuniones</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{totalProposals}</p>
            <p className="text-xs text-muted-foreground">Propuestas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{totalClosed}</p>
            <p className="text-xs text-muted-foreground">Cierres</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Valor Total</p>
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
        <CardHeader><CardTitle className="text-base">Performance por Closer</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={closers.map(c => ({ name: c.name.split(' ')[0], reuniones: c.metrics.meetings, cierres: c.metrics.closed, valor: c.metrics.totalValue / 1000 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="reuniones" fill="hsl(var(--info))" name="Reuniones" />
                <Bar dataKey="cierres" fill="hsl(var(--success))" name="Cierres" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {closers.map((closer, i) => (
          <Card key={closer.id} className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center text-lg font-bold">
                  {closer.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{closer.name}</h3>
                    <Badge className="bg-warning/20 text-warning border-0 text-xs">#{i + 1}</Badge>
                    <Badge className={cn('text-xs border-0', stageColors[closer.stage])}>{stageLabels[closer.stage]}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{closer.metrics.meetings} reuniones</span>
                    <span>{closer.metrics.closed} cierres</span>
                    <span>${closer.metrics.totalValue.toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">Compromiso:</span>
                      {renderCommitmentStars(closer.commitment)}
                    </div>
                  </div>
                  {closer.notes && <p className="text-xs text-muted-foreground mt-1 italic">{closer.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Meta: ${closer.goal.toLocaleString()}</p>
                  <Progress value={(closer.metrics.totalValue / closer.goal) * 100} className="h-2 w-32" />
                  <p className="text-xs text-muted-foreground mt-1">{((closer.metrics.totalValue / closer.goal) * 100).toFixed(0)}%</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editCloser(closer)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCloser(closer.id)}>
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
