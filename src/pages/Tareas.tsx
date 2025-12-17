import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useStore } from '@/hooks/useStore';
import { initialTimeAuditTasks, initialStrategicTasks } from '@/data/initialData';
import { TimeAuditTask, StrategicTask, TaskCategory, EnergyLevel, DelegationDecision } from '@/types/torii';
import { TeamUser } from '@/pages/Usuarios';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, Zap, Target, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryColors: Record<TaskCategory, string> = {
  '1-Admin': 'bg-muted text-muted-foreground',
  '2-Técnico': 'bg-info/20 text-info',
  '3-Manager': 'bg-warning/20 text-warning',
  '4-Ejecutivo': 'bg-primary/20 text-primary'
};

const energyColors: Record<EnergyLevel, string> = {
  'Me Da Energía': 'text-success',
  'Neutral': 'text-muted-foreground',
  'Me Quita Energía': 'text-destructive'
};

const xdsColors: Record<DelegationDecision, string> = {
  'X': 'bg-destructive/20 text-destructive',
  'S+D': 'bg-warning/20 text-warning',
  'D': 'bg-success/20 text-success'
};

const initialUsers: TeamUser[] = [
  { id: '1', name: 'Admin Torii', email: 'admin@torii.com', role: 'admin', assignedTasks: ['1', '3'], createdAt: '2024-01-01' },
  { id: '2', name: 'Carlos Mendez', email: 'carlos@torii.com', role: 'socio', assignedTasks: ['2', '4'], createdAt: '2024-02-15' },
  { id: '3', name: 'Ana García', email: 'ana@torii.com', role: 'socio', assignedTasks: ['5'], createdAt: '2024-03-10' },
];

export default function Tareas() {
  const [timeAuditTasks, setTimeAuditTasks] = useStore('tareas_audit', initialTimeAuditTasks);
  const [strategicTasks, setStrategicTasks] = useStore('tareas_estrategicas', initialStrategicTasks);
  const [users] = useStore<TeamUser[]>('usuarios', initialUsers);
  const [activeTab, setActiveTab] = useState('strategic');
  const [search, setSearch] = useState('');
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [isStrategicDialogOpen, setIsStrategicDialogOpen] = useState(false);
  const [editingAuditTask, setEditingAuditTask] = useState<TimeAuditTask | null>(null);
  const [editingStrategicTask, setEditingStrategicTask] = useState<StrategicTask | null>(null);

  const [auditForm, setAuditForm] = useState<Partial<TimeAuditTask>>({
    taskName: '', hoursPerWeek: '0:00', category: '1-Admin', energy: 'Neutral',
    knowledge: 3, impact: 3, delegationCost: 3, xds: 'X', newOwner: '', processesToCreate: ''
  });

  const [strategicForm, setStrategicForm] = useState<Partial<StrategicTask>>({
    title: '', description: '', deadline: '', completed: false
  });

  // Time Audit Stats (simplified without hours)
  const categoryStats = {
    '1-Admin': timeAuditTasks.filter(t => t.category === '1-Admin').length,
    '2-Técnico': timeAuditTasks.filter(t => t.category === '2-Técnico').length,
    '3-Manager': timeAuditTasks.filter(t => t.category === '3-Manager').length,
    '4-Ejecutivo': timeAuditTasks.filter(t => t.category === '4-Ejecutivo').length,
  };
  const energyStats = {
    'Me Da Energía': timeAuditTasks.filter(t => t.energy === 'Me Da Energía').length,
    'Neutral': timeAuditTasks.filter(t => t.energy === 'Neutral').length,
    'Me Quita Energía': timeAuditTasks.filter(t => t.energy === 'Me Quita Energía').length,
  };

  // Strategic Tasks Stats
  const completedStrategic = strategicTasks.filter(t => t.completed).length;

  const calculateScore = (form: Partial<TimeAuditTask>): number => {
    return parseFloat(((form.knowledge || 0) + (form.impact || 0) + (form.delegationCost || 0)).toFixed(2));
  };

  // Get user name by finding who has this task assigned
  const getResponsibleName = (taskId: string): string | null => {
    const user = users.find(u => u.assignedTasks.includes(taskId));
    return user ? user.name : null;
  };

  // Audit Task CRUD
  const handleAuditSubmit = () => {
    if (!auditForm.taskName) { toast.error('Nombre de tarea requerido'); return; }
    const score = calculateScore(auditForm);
    
    if (editingAuditTask) {
      setTimeAuditTasks(prev => prev.map(t => t.id === editingAuditTask.id ? { ...t, ...auditForm, score } as TimeAuditTask : t));
      toast.success('Tarea actualizada');
    } else {
      const newTask: TimeAuditTask = {
        id: Date.now().toString(),
        taskName: auditForm.taskName!,
        hoursPerWeek: auditForm.hoursPerWeek!,
        category: auditForm.category!,
        energy: auditForm.energy!,
        knowledge: auditForm.knowledge!,
        impact: auditForm.impact!,
        delegationCost: auditForm.delegationCost!,
        score,
        xds: auditForm.xds!,
        newOwner: auditForm.newOwner,
        processesToCreate: auditForm.processesToCreate
      };
      setTimeAuditTasks(prev => [...prev, newTask]);
      toast.success('Tarea agregada');
    }
    resetAuditForm();
    setIsAuditDialogOpen(false);
  };

  const resetAuditForm = () => {
    setAuditForm({ taskName: '', hoursPerWeek: '0:00', category: '1-Admin', energy: 'Neutral', knowledge: 3, impact: 3, delegationCost: 3, xds: 'X', newOwner: '', processesToCreate: '' });
    setEditingAuditTask(null);
  };

  const editAuditTask = (task: TimeAuditTask) => {
    setEditingAuditTask(task);
    setAuditForm(task);
    setIsAuditDialogOpen(true);
  };

  const deleteAuditTask = (id: string) => {
    setTimeAuditTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Tarea eliminada');
  };

  // Strategic Task CRUD
  const handleStrategicSubmit = () => {
    if (!strategicForm.title) { toast.error('Título requerido'); return; }
    
    if (editingStrategicTask) {
      setStrategicTasks(prev => prev.map(t => t.id === editingStrategicTask.id ? { ...t, ...strategicForm } as StrategicTask : t));
      toast.success('Tarea actualizada');
    } else {
      const newTask: StrategicTask = {
        id: Date.now().toString(),
        title: strategicForm.title!,
        description: strategicForm.description,
        deadline: strategicForm.deadline,
        completed: false
      };
      setStrategicTasks(prev => [...prev, newTask]);
      toast.success('Tarea agregada');
    }
    resetStrategicForm();
    setIsStrategicDialogOpen(false);
  };

  const resetStrategicForm = () => {
    setStrategicForm({ title: '', description: '', deadline: '', completed: false });
    setEditingStrategicTask(null);
  };

  const editStrategicTask = (task: StrategicTask) => {
    setEditingStrategicTask(task);
    setStrategicForm(task);
    setIsStrategicDialogOpen(true);
  };

  const toggleStrategicComplete = (id: string) => {
    setStrategicTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteStrategicTask = (id: string) => {
    setStrategicTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Tarea eliminada');
  };

  const filteredAudit = timeAuditTasks.filter(t => !search || t.taskName.toLowerCase().includes(search.toLowerCase()));
  const filteredStrategic = strategicTasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Productividad</h1>
          <p className="text-muted-foreground">Auditoría de tiempo y tareas estratégicas</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="strategic">Tareas Estratégicas</TabsTrigger>
          <TabsTrigger value="audit">Auditoría de Tiempo</TabsTrigger>
        </TabsList>

        {/* STRATEGIC TASKS TAB */}
        <TabsContent value="strategic" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Tareas</p>
                <p className="text-xl font-bold">{strategicTasks.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Completadas</p>
                <p className="text-xl font-bold text-success">{completedStrategic}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
                <p className="text-xl font-bold text-warning">{strategicTasks.length - completedStrategic}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tarea..." className="bg-secondary/50" />
            </div>
            <Dialog open={isStrategicDialogOpen} onOpenChange={(open) => { setIsStrategicDialogOpen(open); if (!open) resetStrategicForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Nueva Tarea</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>{editingStrategicTask ? 'Editar' : 'Nueva'} Tarea Estratégica</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Tarea *</Label><Input value={strategicForm.title} onChange={e => setStrategicForm({ ...strategicForm, title: e.target.value })} className="bg-secondary/50" /></div>
                  <div><Label>Descripción</Label><Textarea value={strategicForm.description || ''} onChange={e => setStrategicForm({ ...strategicForm, description: e.target.value })} className="bg-secondary/50" /></div>
                  <div><Label>Deadline</Label><Input type="date" value={strategicForm.deadline || ''} onChange={e => setStrategicForm({ ...strategicForm, deadline: e.target.value })} className="bg-secondary/50" /></div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => { setIsStrategicDialogOpen(false); resetStrategicForm(); }}>Cancelar</Button>
                    <Button onClick={handleStrategicSubmit} className="bg-primary">{editingStrategicTask ? 'Guardar' : 'Agregar'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Strategic Tasks List */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-0">
              {filteredStrategic.map((task, idx) => {
                const responsible = getResponsibleName(task.id);
                return (
                  <div key={task.id} className={cn('flex items-center gap-4 p-4 hover:bg-secondary/20', idx !== filteredStrategic.length - 1 && 'border-b border-border/30')}>
                    <Checkbox checked={task.completed} onCheckedChange={() => toggleStrategicComplete(task.id)} />
                    <div className="flex-1">
                      <p className={cn('font-medium', task.completed && 'line-through text-muted-foreground')}>{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                    </div>
                    {responsible && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <User className="h-3 w-3" />{responsible}
                      </Badge>
                    )}
                    {task.deadline && (
                      <Badge variant="outline" className="text-xs">
                        <Target className="h-3 w-3 mr-1" />{task.deadline}
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editStrategicTask(task)}><Edit2 className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteStrategicTask(task.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                );
              })}
              {filteredStrategic.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No hay tareas estratégicas</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIME AUDIT TAB */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Tareas</p>
                <p className="text-xl font-bold">{timeAuditTasks.length}</p>
              </CardContent>
            </Card>
            {Object.entries(categoryStats).map(([cat, count]) => (
              <Card key={cat} className="bg-card border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{cat}</p>
                  <p className="text-xl font-bold">{count}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Energy Stats */}
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(energyStats).map(([energy, count]) => (
              <Card key={energy} className="bg-card border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Zap className={cn('h-5 w-5', energyColors[energy as EnergyLevel])} />
                  <div>
                    <p className="text-xs text-muted-foreground">{energy}</p>
                    <p className="font-bold">{count}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters and Add */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tarea..." className="bg-secondary/50" />
            </div>
            <Dialog open={isAuditDialogOpen} onOpenChange={(open) => { setIsAuditDialogOpen(open); if (!open) resetAuditForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Nueva Tarea</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-xl">
                <DialogHeader><DialogTitle>{editingAuditTask ? 'Editar' : 'Nueva'} Tarea de Auditoría</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Tarea específica *</Label>
                    <Input value={auditForm.taskName} onChange={e => setAuditForm({ ...auditForm, taskName: e.target.value })} className="bg-secondary/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Categoría</Label>
                      <Select value={auditForm.category} onValueChange={v => setAuditForm({ ...auditForm, category: v as TaskCategory })}>
                        <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-Admin">1-Admin</SelectItem>
                          <SelectItem value="2-Técnico">2-Técnico</SelectItem>
                          <SelectItem value="3-Manager">3-Manager</SelectItem>
                          <SelectItem value="4-Ejecutivo">4-Ejecutivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Energía (Disfrute)</Label>
                      <Select value={auditForm.energy} onValueChange={v => setAuditForm({ ...auditForm, energy: v as EnergyLevel })}>
                        <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Me Da Energía">Me Da Energía</SelectItem>
                          <SelectItem value="Neutral">Neutral</SelectItem>
                          <SelectItem value="Me Quita Energía">Me Quita Energía</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Conocimiento (1-5)</Label><Input type="number" min="1" max="5" value={auditForm.knowledge} onChange={e => setAuditForm({ ...auditForm, knowledge: parseInt(e.target.value) || 1 })} className="bg-secondary/50" /></div>
                    <div><Label>Impacto (1-5)</Label><Input type="number" min="1" max="5" value={auditForm.impact} onChange={e => setAuditForm({ ...auditForm, impact: parseInt(e.target.value) || 1 })} className="bg-secondary/50" /></div>
                    <div><Label>Costo Delegar (1-5)</Label><Input type="number" min="1" max="5" value={auditForm.delegationCost} onChange={e => setAuditForm({ ...auditForm, delegationCost: parseInt(e.target.value) || 1 })} className="bg-secondary/50" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>XDS</Label>
                      <Select value={auditForm.xds} onValueChange={v => setAuditForm({ ...auditForm, xds: v as DelegationDecision })}>
                        <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="X">X (Mantener)</SelectItem>
                          <SelectItem value="S+D">S+D (Sistematizar + Delegar)</SelectItem>
                          <SelectItem value="D">D (Delegar)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Nuevo dueño</Label><Input value={auditForm.newOwner || ''} onChange={e => setAuditForm({ ...auditForm, newOwner: e.target.value })} className="bg-secondary/50" /></div>
                    <div><Label>Procesos a crear</Label><Input value={auditForm.processesToCreate || ''} onChange={e => setAuditForm({ ...auditForm, processesToCreate: e.target.value })} className="bg-secondary/50" /></div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => { setIsAuditDialogOpen(false); resetAuditForm(); }}>Cancelar</Button>
                    <Button onClick={handleAuditSubmit} className="bg-primary">{editingAuditTask ? 'Guardar' : 'Agregar'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Time Audit Table */}
          <Card className="bg-card border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/30 border-b border-border/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Tarea específica</th>
                    <th className="text-left p-3 font-medium">Categoría</th>
                    <th className="text-left p-3 font-medium">Energía</th>
                    <th className="text-center p-3 font-medium">Conocim.</th>
                    <th className="text-center p-3 font-medium">Impacto</th>
                    <th className="text-center p-3 font-medium">Costo Del.</th>
                    <th className="text-center p-3 font-medium">Suma</th>
                    <th className="text-center p-3 font-medium">XDS</th>
                    <th className="text-left p-3 font-medium">Nuevo dueño</th>
                    <th className="text-right p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map(task => (
                    <tr key={task.id} className="border-b border-border/30 hover:bg-secondary/20">
                      <td className="p-3 font-medium">{task.taskName}</td>
                      <td className="p-3"><Badge className={cn('text-xs border-0', categoryColors[task.category])}>{task.category}</Badge></td>
                      <td className="p-3"><span className={cn('text-xs', energyColors[task.energy])}>{task.energy}</span></td>
                      <td className="p-3 text-center">{task.knowledge}</td>
                      <td className="p-3 text-center">{task.impact}</td>
                      <td className="p-3 text-center">{task.delegationCost}</td>
                      <td className="p-3 text-center font-medium">{task.score.toFixed(2)}</td>
                      <td className="p-3 text-center"><Badge className={cn('text-xs border-0', xdsColors[task.xds])}>{task.xds}</Badge></td>
                      <td className="p-3 text-xs text-muted-foreground">{task.newOwner || '-'}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editAuditTask(task)}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAuditTask(task.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
