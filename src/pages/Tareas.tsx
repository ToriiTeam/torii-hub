import { useState, useEffect } from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, User, Users, Target, CheckCircle2, Circle, Clock, ArrowLeft, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface TeamUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
  avatar: string | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  tags: string[] | null;
  created_at: string;
}

interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
}

interface UserPerformance {
  id: string;
  user_id: string;
  date: string;
  target: number;
  actual: number;
  morning_routine: boolean;
  desk_order: boolean;
  cold_shower: boolean;
  exercise: boolean;
  meditation: boolean;
  accountability: boolean;
  daily_planning: boolean;
  focus_hours_logged: boolean;
  success_tracker: boolean;
  time_tracking: boolean;
  weekly_planning: boolean;
  mentoring: boolean;
  weekly_tasks_complete: boolean;
  program_content: boolean;
  wake_time: string | null;
  sleep_time: string | null;
  focus_hours: string | null;
  notes: string | null;
  custom_1: boolean;
  custom_2: boolean;
  custom_3: boolean;
  custom_4: boolean;
  custom_5: boolean;
  custom_6: boolean;
  custom_7: boolean;
  custom_8: boolean;
  custom_9: boolean;
  custom_10: boolean;
}

interface TaskConfig {
  id: string;
  field_key: string;
  custom_label: string;
  category: string;
  display_order: number;
}

export default function Tareas() {
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskAssignees, setTaskAssignees] = useState<TaskAssignee[]>([]);
  const [performances, setPerformances] = useState<UserPerformance[]>([]);
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  
  // Dialogs
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Forms
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'miembro' });
  const [taskForm, setTaskForm] = useState({ 
    title: '', description: '', priority: 'media', status: 'pendiente', due_date: '', assignees: [] as string[]
  });

  // Week dates for performance
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadData();
    loadTaskConfig();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, tasksRes, assigneesRes, perfRes] = await Promise.all([
        supabase.from('team_users').select('*').order('name'),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('task_assignees').select('*'),
        supabase.from('user_performance').select('*')
      ]);

      if (usersRes.data) setTeamUsers(usersRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (assigneesRes.data) setTaskAssignees(assigneesRes.data);
      if (perfRes.data) setPerformances(perfRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_task_config')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const daily = data.filter(d => d.category === 'daily').map(d => ({ key: d.field_key, label: d.custom_label }));
        const workflow = data.filter(d => d.category === 'workflow').map(d => ({ key: d.field_key, label: d.custom_label }));
        const weekly = data.filter(d => d.category === 'weekly').map(d => ({ key: d.field_key, label: d.custom_label }));
        
        if (daily.length > 0) setDailyFields(daily);
        if (workflow.length > 0) setWorkflowFields(workflow);
        if (weekly.length > 0) setWeeklyFields(weekly);
      }
    } catch (error) {
      console.error('Error loading task config:', error);
    }
  };

  // User CRUD
  const handleUserSubmit = async () => {
    if (!userForm.name) { toast.error('Nombre requerido'); return; }
    
    try {
      if (editingUser) {
        const { error } = await supabase.from('team_users').update(userForm).eq('id', editingUser.id);
        if (error) throw error;
        toast.success('Usuario actualizado');
      } else {
        const { error } = await supabase.from('team_users').insert(userForm);
        if (error) throw error;
        toast.success('Usuario creado');
      }
      resetUserForm();
      setIsUserDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase.from('team_users').delete().eq('id', id);
      if (error) throw error;
      toast.success('Usuario eliminado');
      if (selectedUser?.id === id) setSelectedUser(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetUserForm = () => {
    setUserForm({ name: '', email: '', role: 'miembro' });
    setEditingUser(null);
  };

  const editUser = (user: TeamUser) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email || '', role: user.role });
    setIsUserDialogOpen(true);
  };

  // Task CRUD
  const handleTaskSubmit = async () => {
    if (!taskForm.title) { toast.error('Título requerido'); return; }
    
    try {
      if (editingTask) {
        const { error } = await supabase.from('tasks').update({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority as 'alta' | 'media' | 'baja',
          status: taskForm.status as 'pendiente' | 'en_progreso' | 'completada',
          due_date: taskForm.due_date || null
        }).eq('id', editingTask.id);
        if (error) throw error;

        // Update assignees
        await supabase.from('task_assignees').delete().eq('task_id', editingTask.id);
        if (taskForm.assignees.length > 0) {
          await supabase.from('task_assignees').insert(
            taskForm.assignees.map(userId => ({ task_id: editingTask.id, user_id: userId }))
          );
        }
        toast.success('Tarea actualizada');
      } else {
        const { data: newTask, error } = await supabase.from('tasks').insert([{
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority as 'alta' | 'media' | 'baja',
          status: taskForm.status as 'pendiente' | 'en_progreso' | 'completada',
          due_date: taskForm.due_date || null
        }]).select().single();
        if (error) throw error;

        // Add assignees
        if (taskForm.assignees.length > 0 && newTask) {
          await supabase.from('task_assignees').insert(
            taskForm.assignees.map(userId => ({ task_id: newTask.id, user_id: userId }))
          );
        }
        toast.success('Tarea creada');
      }
      resetTaskForm();
      setIsTaskDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      toast.success('Tarea eliminada');
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completada' ? 'pendiente' : task.status === 'pendiente' ? 'en_progreso' : 'completada';
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      if (error) throw error;
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetTaskForm = () => {
    setTaskForm({ title: '', description: '', priority: 'media', status: 'pendiente', due_date: '', assignees: selectedUser ? [selectedUser.id] : [] });
    setEditingTask(null);
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    const assigneeIds = taskAssignees.filter(a => a.task_id === task.id).map(a => a.user_id);
    setTaskForm({ 
      title: task.title, 
      description: task.description || '', 
      priority: task.priority, 
      status: task.status, 
      due_date: task.due_date || '',
      assignees: assigneeIds
    });
    setIsTaskDialogOpen(true);
  };

  // Performance
  const getPerformance = (userId: string, date: string): UserPerformance | undefined => {
    return performances.find(p => p.user_id === userId && p.date === date);
  };

  const togglePerformanceField = async (userId: string, date: string, field: keyof UserPerformance) => {
    const existing = getPerformance(userId, date);
    try {
      if (existing) {
        const { error } = await supabase.from('user_performance')
          .update({ [field]: !existing[field] })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_performance')
          .insert({ user_id: userId, date, [field]: true });
        if (error) throw error;
      }
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updatePerformanceValue = async (userId: string, date: string, field: string, value: string | number) => {
    const existing = getPerformance(userId, date);
    try {
      if (existing) {
        const { error } = await supabase.from('user_performance')
          .update({ [field]: value })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_performance')
          .insert({ user_id: userId, date, [field]: value });
        if (error) throw error;
      }
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Helpers
  const getTaskAssignees = (taskId: string): TeamUser[] => {
    const assigneeIds = taskAssignees.filter(a => a.task_id === taskId).map(a => a.user_id);
    return teamUsers.filter(u => assigneeIds.includes(u.id));
  };

  const getUserTasks = (userId: string): Task[] => {
    const taskIds = taskAssignees.filter(a => a.user_id === userId).map(a => a.task_id);
    return tasks.filter(t => taskIds.includes(t.id));
  };

  const filteredTasks = selectedUser 
    ? getUserTasks(selectedUser.id).filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completada': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'en_progreso': return <Clock className="h-4 w-4 text-warning" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Performance fields for the tracker (like Google Sheet) - EDITABLE
  const [editingFieldLabel, setEditingFieldLabel] = useState<string | null>(null);
  const [editFieldValue, setEditFieldValue] = useState('');
  
  const [dailyFields, setDailyFields] = useState([
    { key: 'morning_routine', label: 'Rutina de mañana' },
    { key: 'desk_order', label: 'Orden del escritorio' },
    { key: 'cold_shower', label: 'Ducha fría' },
    { key: 'exercise', label: 'Entrenamiento' },
    { key: 'meditation', label: 'Meditación' },
    { key: 'accountability', label: 'Accountability' },
  ]);

  const [workflowFields, setWorkflowFields] = useState([
    { key: 'daily_planning', label: 'Planificación diaria' },
    { key: 'focus_hours_logged', label: '10h enfoque registradas' },
    { key: 'success_tracker', label: 'Success tracker' },
    { key: 'time_tracking', label: 'Medir tiempo con toggle' },
  ]);

  const [weeklyFields, setWeeklyFields] = useState([
    { key: 'weekly_planning', label: 'Planificación semanal' },
    { key: 'mentoring', label: 'Mentoría 1-a-1' },
    { key: 'weekly_tasks_complete', label: 'Tareas semana 100%' },
    { key: 'program_content', label: 'Contenido del programa' },
  ]);

  const updateFieldLabel = async (fieldKey: string, newLabel: string, category: 'daily' | 'workflow' | 'weekly') => {
    // Update local state
    if (category === 'daily') {
      setDailyFields(prev => prev.map(f => f.key === fieldKey ? { ...f, label: newLabel } : f));
    } else if (category === 'workflow') {
      setWorkflowFields(prev => prev.map(f => f.key === fieldKey ? { ...f, label: newLabel } : f));
    } else {
      setWeeklyFields(prev => prev.map(f => f.key === fieldKey ? { ...f, label: newLabel } : f));
    }
    setEditingFieldLabel(null);

    // Save to database
    try {
      const { error } = await supabase
        .from('performance_task_config')
        .update({ custom_label: newLabel })
        .eq('field_key', fieldKey);
      
      if (error) throw error;
      toast.success('Nombre actualizado');
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    }
  };

  // Calculate formulas like in Excel
  // Rendimiento (diario) = VERDADEROS / (VERDADEROS + FALSOS) en un día para una sección
  // Semanal = VERDADEROS / (VERDADEROS + FALSOS) en una fila para toda la semana
  // Total = VERDADEROS / (VERDADEROS + FALSOS) en un día para todas las secciones
  // Total Semanal = VERDADEROS / (VERDADEROS + FALSOS) de toda la semana para todas las secciones

  const allCheckboxFields = [...dailyFields, ...workflowFields, ...weeklyFields];

  // Rendimiento por día (solo checkboxes de una sección específica)
  const calculateDailyRendimiento = (userId: string, dateStr: string, fields: { key: string }[]): number => {
    const perf = getPerformance(userId, dateStr);
    if (!perf || fields.length === 0) return 0;
    let trueCount = 0;
    fields.forEach(field => {
      const value = perf[field.key as keyof UserPerformance];
      if (value === true) trueCount++;
    });
    return Math.round((trueCount / fields.length) * 100);
  };

  // Semanal = porcentaje de una tarea completada a lo largo de la semana (sobre 7 días)
  const calculateWeeklyRowCompletion = (userId: string, fieldKey: string): number => {
    let trueCount = 0;
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const perf = getPerformance(userId, dateStr);
      if (perf) {
        const value = perf[fieldKey as keyof UserPerformance];
        if (value === true) trueCount++;
      }
    });
    return Math.round((trueCount / 7) * 100);
  };

  // Total (diario) = todas las tareas de un día
  const calculateDailyTotal = (userId: string, dateStr: string): number => {
    const perf = getPerformance(userId, dateStr);
    if (!perf || allCheckboxFields.length === 0) return 0;
    let trueCount = 0;
    allCheckboxFields.forEach(field => {
      const value = perf[field.key as keyof UserPerformance];
      if (value === true) trueCount++;
    });
    return Math.round((trueCount / allCheckboxFields.length) * 100);
  };

  // Total Semanal = todas las tareas de toda la semana (sobre 7 días × total de campos)
  const calculateWeeklyTotal = (userId: string): number => {
    let trueCount = 0;
    const totalPossible = allCheckboxFields.length * 7; // Total de checkboxes posibles en la semana
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const perf = getPerformance(userId, dateStr);
      if (perf) {
        allCheckboxFields.forEach(field => {
          const value = perf[field.key as keyof UserPerformance];
          if (value === true) trueCount++;
        });
      }
    });
    return Math.round((trueCount / totalPossible) * 100);
  };

  // Agregar nueva actividad
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false);
  const [newActivityForm, setNewActivityForm] = useState({ label: '', category: 'daily' });

  const getNextAvailableCustomField = (): string | null => {
    const usedKeys = [...dailyFields, ...workflowFields, ...weeklyFields].map(f => f.key);
    for (let i = 1; i <= 10; i++) {
      const key = `custom_${i}`;
      if (!usedKeys.includes(key)) return key;
    }
    return null;
  };

  const addNewActivity = async () => {
    if (!newActivityForm.label.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    const nextKey = getNextAvailableCustomField();
    if (!nextKey) {
      toast.error('Has alcanzado el límite de actividades personalizadas (10)');
      return;
    }

    try {
      const currentFields = newActivityForm.category === 'daily' ? dailyFields 
        : newActivityForm.category === 'workflow' ? workflowFields : weeklyFields;
      
      const { error } = await supabase.from('performance_task_config').insert({
        field_key: nextKey,
        custom_label: newActivityForm.label.trim(),
        category: newActivityForm.category,
        display_order: currentFields.length
      });

      if (error) throw error;

      // Update local state
      const newField = { key: nextKey, label: newActivityForm.label.trim() };
      if (newActivityForm.category === 'daily') {
        setDailyFields(prev => [...prev, newField]);
      } else if (newActivityForm.category === 'workflow') {
        setWorkflowFields(prev => [...prev, newField]);
      } else {
        setWeeklyFields(prev => [...prev, newField]);
      }

      toast.success('Actividad agregada');
      setIsAddActivityDialogOpen(false);
      setNewActivityForm({ label: '', category: 'daily' });
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const deleteActivity = async (fieldKey: string, category: 'daily' | 'workflow' | 'weekly') => {
    try {
      // Delete from config table if it exists there
      await supabase
        .from('performance_task_config')
        .delete()
        .eq('field_key', fieldKey);

      // Update local state
      if (category === 'daily') {
        setDailyFields(prev => prev.filter(f => f.key !== fieldKey));
      } else if (category === 'workflow') {
        setWorkflowFields(prev => prev.filter(f => f.key !== fieldKey));
      } else {
        setWeeklyFields(prev => prev.filter(f => f.key !== fieldKey));
      }

      toast.success('Actividad eliminada');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {selectedUser && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {selectedUser ? selectedUser.name : 'Productividad'}
            </h1>
            <p className="text-muted-foreground">
              {selectedUser ? 'Tareas y rendimiento del usuario' : 'Gestión de equipo y tareas'}
            </p>
          </div>
        </div>
        
        {!selectedUser && (
          <Dialog open={isUserDialogOpen} onOpenChange={(open) => { setIsUserDialogOpen(open); if (!open) resetUserForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Crear Usuario</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>{editingUser ? 'Editar' : 'Crear'} Usuario</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label>Nombre *</Label><Input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Email</Label><Input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="bg-secondary/50" /></div>
                <div><Label>Rol</Label>
                  <Select value={userForm.role} onValueChange={v => setUserForm({ ...userForm, role: v })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="socio">Socio</SelectItem>
                      <SelectItem value="miembro">Miembro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setIsUserDialogOpen(false); resetUserForm(); }}>Cancelar</Button>
                  <Button onClick={handleUserSubmit} className="bg-primary">{editingUser ? 'Guardar' : 'Crear'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* User Selection Panel (when no user selected) */}
      {!selectedUser ? (
        <div className="space-y-6">
          {/* User Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teamUsers.map(user => {
              const userTasks = getUserTasks(user.id);
              const completedTasks = userTasks.filter(t => t.status === 'completada').length;
              const weeklyCompletion = calculateWeeklyTotal(user.id);
              
              return (
                <Card 
                  key={user.id} 
                  className="bg-card border-border/50 hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedUser(user)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <Badge variant="outline" className="text-xs">{user.role}</Badge>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); editUser(user); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteUser(user.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tareas</span>
                        <span>{completedTasks}/{userTasks.length}</span>
                      </div>
                      <Progress value={userTasks.length > 0 ? (completedTasks / userTasks.length) * 100 : 0} className="h-1.5" />
                      
                      <div className="flex justify-between text-sm pt-2">
                        <span className="text-muted-foreground">Rendimiento semanal</span>
                        <span className={cn(weeklyCompletion >= 70 ? 'text-success' : weeklyCompletion >= 40 ? 'text-warning' : 'text-destructive')}>
                          {weeklyCompletion}%
                        </span>
                      </div>
                      <Progress value={weeklyCompletion} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {teamUsers.length === 0 && (
              <Card className="col-span-full bg-card border-border/50 border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay usuarios creados</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsUserDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Crear Usuario
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* All Tasks Section */}
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">Todas las Tareas del Equipo</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    placeholder="Buscar..." 
                    className="w-48 bg-secondary/50 h-8"
                  />
                </div>
                <Dialog open={isTaskDialogOpen} onOpenChange={(open) => { setIsTaskDialogOpen(open); if (!open) resetTaskForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary"><Plus className="h-4 w-4 mr-1" />Nueva Tarea</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle>{editingTask ? 'Editar' : 'Nueva'} Tarea</DialogTitle></DialogHeader>
                    <TaskFormContent 
                      taskForm={taskForm} 
                      setTaskForm={setTaskForm} 
                      teamUsers={teamUsers} 
                      onSubmit={handleTaskSubmit} 
                      onCancel={() => { setIsTaskDialogOpen(false); resetTaskForm(); }}
                      isEditing={!!editingTask}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {filteredTasks.map(task => {
                  const assignees = getTaskAssignees(task.id);
                  return (
                    <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors">
                      <button onClick={() => toggleTaskStatus(task)}>
                        {getStatusIcon(task.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-medium', task.status === 'completada' && 'line-through text-muted-foreground')}>{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                      </div>
                      {assignees.length > 0 && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {assignees.map(a => a.name).join(', ')}
                          </span>
                        </div>
                      )}
                      <Badge variant="outline" className={cn('text-xs',
                        task.priority === 'alta' ? 'border-destructive/50 text-destructive' :
                        task.priority === 'media' ? 'border-warning/50 text-warning' : 'border-info/50 text-info'
                      )}>
                        {task.priority}
                      </Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editTask(task)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTask(task.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">No hay tareas</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* User Detail View */
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="tasks">Tareas</TabsTrigger>
              <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            </TabsList>

            {/* User Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Tareas</p>
                    <p className="text-xl font-bold">{filteredTasks.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Completadas</p>
                    <p className="text-xl font-bold text-success">{filteredTasks.filter(t => t.status === 'completada').length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Pendientes</p>
                    <p className="text-xl font-bold text-warning">{filteredTasks.filter(t => t.status !== 'completada').length}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Task List with Add Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tarea..." className="w-64 bg-secondary/50" />
                </div>
                <Dialog open={isTaskDialogOpen} onOpenChange={(open) => { setIsTaskDialogOpen(open); if (!open) resetTaskForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Nueva Tarea</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle>{editingTask ? 'Editar' : 'Nueva'} Tarea</DialogTitle></DialogHeader>
                    <TaskFormContent 
                      taskForm={taskForm} 
                      setTaskForm={setTaskForm} 
                      teamUsers={teamUsers} 
                      onSubmit={handleTaskSubmit} 
                      onCancel={() => { setIsTaskDialogOpen(false); resetTaskForm(); }}
                      isEditing={!!editingTask}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="bg-card border-border/50">
                <CardContent className="p-0">
                  {filteredTasks.map((task, idx) => {
                    const assignees = getTaskAssignees(task.id);
                    return (
                      <div key={task.id} className={cn('flex items-center gap-4 p-4 hover:bg-secondary/20', idx !== filteredTasks.length - 1 && 'border-b border-border/30')}>
                        <button onClick={() => toggleTaskStatus(task)}>
                          {getStatusIcon(task.status)}
                        </button>
                        <div className="flex-1">
                          <p className={cn('font-medium', task.status === 'completada' && 'line-through text-muted-foreground')}>{task.title}</p>
                          {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                        </div>
                        {assignees.length > 1 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="h-3 w-3" />+{assignees.length - 1}
                          </Badge>
                        )}
                        {task.due_date && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Target className="h-3 w-3" />{task.due_date}
                          </Badge>
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editTask(task)}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTask(task.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredTasks.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">No hay tareas asignadas</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab (Google Sheet style) */}
            <TabsContent value="performance" className="space-y-4 mt-4">
              {/* Week Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                  Semana Anterior
                </Button>
                <span className="text-sm font-medium">
                  {format(weekStart, "dd MMM", { locale: es })} - {format(addDays(weekStart, 6), "dd MMM yyyy", { locale: es })}
                </span>
                <div className="flex gap-2">
                  <Dialog open={isAddActivityDialogOpen} onOpenChange={setIsAddActivityDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Actividad
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader><DialogTitle>Nueva Actividad</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nombre de la actividad</Label>
                          <Input
                            value={newActivityForm.label}
                            onChange={e => setNewActivityForm(prev => ({ ...prev, label: e.target.value }))}
                            placeholder="Ej: Leer 30 minutos"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Categoría</Label>
                          <Select
                            value={newActivityForm.category}
                            onValueChange={v => setNewActivityForm(prev => ({ ...prev, category: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Hábitos Diarios</SelectItem>
                              <SelectItem value="workflow">Workflow</SelectItem>
                              <SelectItem value="weekly">Tareas Semanales</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setIsAddActivityDialogOpen(false)}>Cancelar</Button>
                          <Button onClick={addNewActivity}>Agregar</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                    Semana Siguiente
                  </Button>
                </div>
              </div>

              {/* Performance Grid (like Google Sheet) */}
              <Card className="bg-card border-border/50 overflow-x-auto">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-3 bg-secondary/30 min-w-[200px]">Actividad</th>
                        {weekDays.map(day => (
                          <th key={day.toISOString()} className={cn(
                            "p-3 text-center min-w-[80px]",
                            isToday(day) && "bg-primary/10"
                          )}>
                            <div className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: es })}</div>
                            <div className={cn("font-bold", isToday(day) && "text-primary")}>{format(day, 'd')}</div>
                          </th>
                        ))}
                        <th className="p-3 text-center min-w-[80px] bg-secondary/50">
                          <div className="text-xs text-muted-foreground">Semanal</div>
                          <div className="font-bold">%</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-secondary/20">
                        <td colSpan={9} className="p-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">Hábitos Diarios</td>
                      </tr>
                      {dailyFields.map(field => (
                        <tr key={field.key} className="border-b border-border/20 hover:bg-secondary/10 group">
                          <td className="p-3 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {editingFieldLabel === field.key ? (
                                <Input
                                  autoFocus
                                  value={editFieldValue}
                                  onChange={e => setEditFieldValue(e.target.value)}
                                  onBlur={() => updateFieldLabel(field.key, editFieldValue, 'daily')}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') updateFieldLabel(field.key, editFieldValue, 'daily');
                                    if (e.key === 'Escape') setEditingFieldLabel(null);
                                  }}
                                  className="h-7 text-sm bg-secondary/50 w-full"
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:text-foreground flex-1"
                                  onDoubleClick={() => { setEditingFieldLabel(field.key); setEditFieldValue(field.label); }}
                                >
                                  {field.label}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteActivity(field.key, 'daily')}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const perf = getPerformance(selectedUser.id, dateStr);
                            const value = perf ? perf[field.key as keyof UserPerformance] : false;
                            return (
                              <td key={day.toISOString()} className="p-3 text-center">
                                <Checkbox 
                                  checked={!!value}
                                  onCheckedChange={() => togglePerformanceField(selectedUser.id, dateStr, field.key as keyof UserPerformance)}
                                  className="mx-auto"
                                />
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-medium bg-secondary/30">
                            {calculateWeeklyRowCompletion(selectedUser.id, field.key)}%
                          </td>
                        </tr>
                      ))}

                      {/* WORKFLOW */}
                      <tr className="bg-secondary/20">
                        <td colSpan={9} className="p-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">Workflow</td>
                      </tr>
                      {workflowFields.map(field => (
                        <tr key={field.key} className="border-b border-border/20 hover:bg-secondary/10 group">
                          <td className="p-3 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {editingFieldLabel === field.key ? (
                                <Input
                                  autoFocus
                                  value={editFieldValue}
                                  onChange={e => setEditFieldValue(e.target.value)}
                                  onBlur={() => updateFieldLabel(field.key, editFieldValue, 'workflow')}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') updateFieldLabel(field.key, editFieldValue, 'workflow');
                                    if (e.key === 'Escape') setEditingFieldLabel(null);
                                  }}
                                  className="h-7 text-sm bg-secondary/50 w-full"
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:text-foreground flex-1"
                                  onDoubleClick={() => { setEditingFieldLabel(field.key); setEditFieldValue(field.label); }}
                                >
                                  {field.label}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteActivity(field.key, 'workflow')}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const perf = getPerformance(selectedUser.id, dateStr);
                            const value = perf ? perf[field.key as keyof UserPerformance] : false;
                            return (
                              <td key={day.toISOString()} className="p-3 text-center">
                                <Checkbox 
                                  checked={!!value}
                                  onCheckedChange={() => togglePerformanceField(selectedUser.id, dateStr, field.key as keyof UserPerformance)}
                                  className="mx-auto"
                                />
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-medium bg-secondary/30">
                            {calculateWeeklyRowCompletion(selectedUser.id, field.key)}%
                          </td>
                        </tr>
                      ))}

                      {/* SEMANAL (Weekly tasks) */}
                      <tr className="bg-secondary/20">
                        <td colSpan={9} className="p-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">Tareas Semanales</td>
                      </tr>
                      {weeklyFields.map(field => (
                        <tr key={field.key} className="border-b border-border/20 hover:bg-secondary/10 group">
                          <td className="p-3 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {editingFieldLabel === field.key ? (
                                <Input
                                  autoFocus
                                  value={editFieldValue}
                                  onChange={e => setEditFieldValue(e.target.value)}
                                  onBlur={() => updateFieldLabel(field.key, editFieldValue, 'weekly')}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') updateFieldLabel(field.key, editFieldValue, 'weekly');
                                    if (e.key === 'Escape') setEditingFieldLabel(null);
                                  }}
                                  className="h-7 text-sm bg-secondary/50 w-full"
                                />
                              ) : (
                                <span 
                                  className="cursor-pointer hover:text-foreground flex-1"
                                  onDoubleClick={() => { setEditingFieldLabel(field.key); setEditFieldValue(field.label); }}
                                >
                                  {field.label}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => deleteActivity(field.key, 'weekly')}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const perf = getPerformance(selectedUser.id, dateStr);
                            const value = perf ? perf[field.key as keyof UserPerformance] : false;
                            return (
                              <td key={day.toISOString()} className="p-3 text-center">
                                <Checkbox 
                                  checked={!!value}
                                  onCheckedChange={() => togglePerformanceField(selectedUser.id, dateStr, field.key as keyof UserPerformance)}
                                  className="mx-auto"
                                />
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-medium bg-secondary/30">
                            {calculateWeeklyRowCompletion(selectedUser.id, field.key)}%
                          </td>
                        </tr>
                      ))}

                      {/* RENDIMIENTO */}
                      <tr className="bg-secondary/20">
                        <td colSpan={9} className="p-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">Rendimiento</td>
                      </tr>
                      <tr className="border-b border-border/20 hover:bg-secondary/10">
                        <td className="p-3 text-muted-foreground">Hora de despertar</td>
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const perf = getPerformance(selectedUser.id, dateStr);
                          return (
                            <td key={day.toISOString()} className="p-3 text-center">
                              <Input 
                                type="time"
                                value={perf?.wake_time || ''}
                                onChange={e => updatePerformanceValue(selectedUser.id, dateStr, 'wake_time', e.target.value)}
                                className="w-20 h-7 text-xs bg-secondary/50 mx-auto"
                              />
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-b border-border/20 hover:bg-secondary/10">
                        <td className="p-3 text-muted-foreground">Hora de dormir</td>
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const perf = getPerformance(selectedUser.id, dateStr);
                          return (
                            <td key={day.toISOString()} className="p-3 text-center">
                              <Input 
                                type="time"
                                value={perf?.sleep_time || ''}
                                onChange={e => updatePerformanceValue(selectedUser.id, dateStr, 'sleep_time', e.target.value)}
                                className="w-20 h-7 text-xs bg-secondary/50 mx-auto"
                              />
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-b border-border/20 hover:bg-secondary/10">
                        <td className="p-3 text-muted-foreground">Horas de enfoque</td>
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const perf = getPerformance(selectedUser.id, dateStr);
                          return (
                            <td key={day.toISOString()} className="p-3 text-center">
                              <Input 
                                type="text"
                                placeholder="0:00"
                                value={perf?.focus_hours || ''}
                                onChange={e => updatePerformanceValue(selectedUser.id, dateStr, 'focus_hours', e.target.value)}
                                className="w-16 h-7 text-xs bg-secondary/50 mx-auto text-center"
                              />
                            </td>
                          );
                        })}
                      </tr>

                      {/* TOTAL */}
                      <tr className="bg-secondary/20">
                        <td colSpan={9} className="p-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">Total</td>
                      </tr>
                      <tr className="border-b border-border/20 hover:bg-secondary/10">
                        <td className="p-3 text-muted-foreground">Target (Diario)</td>
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const perf = getPerformance(selectedUser.id, dateStr);
                          return (
                            <td key={day.toISOString()} className="p-3 text-center">
                              <Input 
                                type="number"
                                value={perf?.target || 10}
                                onChange={e => updatePerformanceValue(selectedUser.id, dateStr, 'target', parseInt(e.target.value) || 0)}
                                className="w-14 h-7 text-xs bg-secondary/50 mx-auto text-center"
                              />
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="border-b border-border/20 hover:bg-secondary/10">
                        <td className="p-3 text-muted-foreground">Actual (Diario)</td>
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const perf = getPerformance(selectedUser.id, dateStr);
                          return (
                            <td key={day.toISOString()} className="p-3 text-center">
                              <Input 
                                type="number"
                                value={perf?.actual || 0}
                                onChange={e => updatePerformanceValue(selectedUser.id, dateStr, 'actual', parseInt(e.target.value) || 0)}
                                className="w-14 h-7 text-xs bg-secondary/50 mx-auto text-center"
                              />
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="hover:bg-secondary/10">
                        <td className="p-3 text-muted-foreground font-medium">Diferencia</td>
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const perf = getPerformance(selectedUser.id, dateStr);
                          const diff = (perf?.actual || 0) - (perf?.target || 10);
                          return (
                            <td key={day.toISOString()} className={cn(
                              "p-3 text-center font-bold",
                              diff >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {diff >= 0 ? '+' : ''}{diff}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Weekly Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Completitud Semanal</p>
                    <p className="text-2xl font-bold">{calculateWeeklyTotal(selectedUser.id)}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Target Semanal</p>
                    <p className="text-2xl font-bold">
                      {weekDays.reduce((sum, day) => {
                        const perf = getPerformance(selectedUser.id, format(day, 'yyyy-MM-dd'));
                        return sum + (perf?.target || 10);
                      }, 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Actual Semanal</p>
                    <p className="text-2xl font-bold">
                      {weekDays.reduce((sum, day) => {
                        const perf = getPerformance(selectedUser.id, format(day, 'yyyy-MM-dd'));
                        return sum + (perf?.actual || 0);
                      }, 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
                    {(() => {
                      const targetSum = weekDays.reduce((sum, day) => {
                        const perf = getPerformance(selectedUser.id, format(day, 'yyyy-MM-dd'));
                        return sum + (perf?.target || 10);
                      }, 0);
                      const actualSum = weekDays.reduce((sum, day) => {
                        const perf = getPerformance(selectedUser.id, format(day, 'yyyy-MM-dd'));
                        return sum + (perf?.actual || 0);
                      }, 0);
                      const diff = actualSum - targetSum;
                      return (
                        <p className={cn("text-2xl font-bold", diff >= 0 ? "text-success" : "text-destructive")}>
                          {diff >= 0 ? '+' : ''}{diff}
                        </p>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// Task Form Component
function TaskFormContent({ 
  taskForm, 
  setTaskForm, 
  teamUsers, 
  onSubmit, 
  onCancel,
  isEditing 
}: { 
  taskForm: any; 
  setTaskForm: (form: any) => void; 
  teamUsers: TeamUser[];
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label>Título *</Label>
        <Input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className="bg-secondary/50" />
      </div>
      <div>
        <Label>Descripción</Label>
        <Textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className="bg-secondary/50" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prioridad</Label>
          <Select value={taskForm.priority} onValueChange={v => setTaskForm({ ...taskForm, priority: v })}>
            <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Estado</Label>
          <Select value={taskForm.status} onValueChange={v => setTaskForm({ ...taskForm, status: v })}>
            <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_progreso">En Progreso</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Fecha límite</Label>
        <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} className="bg-secondary/50" />
      </div>
      <div>
        <Label>Responsables</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {teamUsers.map(user => (
            <div key={user.id} className="flex items-center gap-2">
              <Checkbox 
                id={`user-${user.id}`}
                checked={taskForm.assignees.includes(user.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setTaskForm({ ...taskForm, assignees: [...taskForm.assignees, user.id] });
                  } else {
                    setTaskForm({ ...taskForm, assignees: taskForm.assignees.filter((id: string) => id !== user.id) });
                  }
                }}
              />
              <label htmlFor={`user-${user.id}`} className="text-sm">{user.name}</label>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={onSubmit} className="bg-primary">{isEditing ? 'Guardar' : 'Crear'}</Button>
      </div>
    </div>
  );
}
