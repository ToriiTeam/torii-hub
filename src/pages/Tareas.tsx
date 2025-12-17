import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { initialTasks, userNames } from '@/data/initialData';
import { Task, TaskPriority, TaskStatus } from '@/types/torii';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Flag, 
  Edit2, 
  Trash2,
  LayoutGrid,
  List,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

const priorityColors: Record<TaskPriority, string> = {
  alta: 'bg-destructive/20 text-destructive border-destructive/30',
  media: 'bg-warning/20 text-warning border-warning/30',
  baja: 'bg-success/20 text-success border-success/30',
};

const statusLabels: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada',
};

export default function Tareas() {
  const [tasks, setTasks] = useStore('tareas', initialTasks);
  const [view, setView] = useState<'list' | 'kanban'>('kanban');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterResponsible, setFilterResponsible] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'media' as TaskPriority,
    status: 'pendiente' as TaskStatus,
    responsibleId: '1',
    dueDate: '',
    tags: '',
  });

  const filteredTasks = tasks.filter(task => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (filterResponsible !== 'all' && task.responsibleId !== filterResponsible) return false;
    return true;
  });

  const tasksByStatus = {
    pendiente: filteredTasks.filter(t => t.status === 'pendiente'),
    en_progreso: filteredTasks.filter(t => t.status === 'en_progreso'),
    completada: filteredTasks.filter(t => t.status === 'completada'),
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'media',
      status: 'pendiente',
      responsibleId: '1',
      dueDate: '',
      tags: '',
    });
    setEditingTask(null);
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    if (editingTask) {
      setTasks(prev => prev.map(t => 
        t.id === editingTask.id 
          ? { ...t, ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) }
          : t
      ));
      toast.success('Tarea actualizada');
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        createdAt: new Date().toISOString().split('T')[0],
      };
      setTasks(prev => [...prev, newTask]);
      toast.success('Tarea creada');
    }
    
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      responsibleId: task.responsibleId,
      dueDate: task.dueDate,
      tags: task.tags.join(', '),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Tarea eliminada');
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: t.status === 'completada' ? 'pendiente' : 'completada' }
        : t
    ));
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className={cn(
      "bg-card border-border/50 hover:border-primary/30 transition-all cursor-pointer group",
      task.status === 'completada' && 'opacity-60'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox 
            checked={task.status === 'completada'}
            onCheckedChange={() => handleToggleComplete(task.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn('text-xs', priorityColors[task.priority])}>
                {task.priority}
              </Badge>
              {task.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs bg-secondary/50 border-border/50">
                  {tag}
                </Badge>
              ))}
            </div>
            <h3 className={cn(
              "font-medium text-sm mb-1",
              task.status === 'completada' && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {userNames[task.responsibleId]?.split(' ')[0]}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {task.dueDate}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEdit(task); }}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const KanbanColumn = ({ status, tasks: columnTasks }: { status: TaskStatus; tasks: Task[] }) => (
    <div className="flex-1 min-w-[300px] max-w-[400px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-3 w-3 rounded-full",
            status === 'pendiente' && 'bg-muted-foreground',
            status === 'en_progreso' && 'bg-info',
            status === 'completada' && 'bg-success'
          )} />
          <h3 className="font-medium">{statusLabels[status]}</h3>
          <Badge variant="outline" className="text-xs">{columnTasks.length}</Badge>
        </div>
      </div>
      <div className="space-y-3">
        {columnTasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
        {columnTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border/50 rounded-lg">
            No hay tareas
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Productividad</h1>
          <p className="text-muted-foreground">Gestiona las tareas del equipo</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Título *</Label>
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título de la tarea"
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción detallada"
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prioridad</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as TaskPriority }))}>
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as TaskStatus }))}>
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_progreso">En Progreso</SelectItem>
                      <SelectItem value="completada">Completada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Responsable</Label>
                  <Select value={formData.responsibleId} onValueChange={(v) => setFormData(prev => ({ ...prev, responsibleId: v }))}>
                    <SelectTrigger className="bg-secondary/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(userNames).map(([id, name]) => (
                        <SelectItem key={id} value={id}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha límite</Label>
                  <Input 
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
              </div>
              <div>
                <Label>Etiquetas (separadas por coma)</Label>
                <Input 
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="ventas, urgente, cliente"
                  className="bg-secondary/50 border-border/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                  {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tareas..."
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] bg-secondary/50 border-border/50">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px] bg-secondary/50 border-border/50">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 ml-auto">
              <Button 
                variant={view === 'kanban' ? 'default' : 'ghost'} 
                size="icon" 
                onClick={() => setView('kanban')}
                className={view === 'kanban' ? 'bg-primary' : ''}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button 
                variant={view === 'list' ? 'default' : 'ghost'} 
                size="icon" 
                onClick={() => setView('list')}
                className={view === 'list' ? 'bg-primary' : ''}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{tasksByStatus.pendiente.length}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-info">{tasksByStatus.en_progreso.length}</p>
            <p className="text-xs text-muted-foreground">En Progreso</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{tasksByStatus.completada.length}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Task View */}
      {view === 'kanban' ? (
        <div className="flex gap-6 overflow-x-auto pb-4">
          <KanbanColumn status="pendiente" tasks={tasksByStatus.pendiente} />
          <KanbanColumn status="en_progreso" tasks={tasksByStatus.en_progreso} />
          <KanbanColumn status="completada" tasks={tasksByStatus.completada} />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron tareas
            </div>
          )}
        </div>
      )}
    </div>
  );
}
