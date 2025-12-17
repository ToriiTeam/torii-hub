import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/hooks/useStore';
import { initialStrategicTasks } from '@/data/initialData';
import { StrategicTask } from '@/types/torii';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, User, ListTodo, CheckCircle2, Clock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TeamUser {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'socio' | 'miembro';
  avatar?: string;
  assignedTasks: string[]; // Task IDs
  createdAt: string;
}

const initialUsers: TeamUser[] = [
  { id: '1', name: 'Admin Torii', email: 'admin@torii.com', role: 'admin', assignedTasks: ['1', '3'], createdAt: '2024-01-01' },
  { id: '2', name: 'Carlos Mendez', email: 'carlos@torii.com', role: 'socio', assignedTasks: ['2', '4'], createdAt: '2024-02-15' },
  { id: '3', name: 'Ana García', email: 'ana@torii.com', role: 'socio', assignedTasks: ['5'], createdAt: '2024-03-10' },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  socio: 'Socio',
  miembro: 'Miembro'
};

const roleColors: Record<string, string> = {
  admin: 'bg-primary/20 text-primary',
  socio: 'bg-info/20 text-info',
  miembro: 'bg-muted text-muted-foreground'
};

export default function Usuarios() {
  const [users, setUsers] = useStore<TeamUser[]>('usuarios', initialUsers);
  const [strategicTasks, setStrategicTasks] = useStore('tareas_estrategicas', initialStrategicTasks);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', role: 'miembro' as TeamUser['role'] });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...form } : u));
      toast.success('Usuario actualizado');
    } else {
      const newUser: TeamUser = {
        id: Date.now().toString(),
        name: form.name,
        email: form.email || undefined,
        role: form.role,
        assignedTasks: [],
        createdAt: new Date().toISOString().split('T')[0]
      };
      setUsers(prev => [...prev, newUser]);
      toast.success('Usuario creado');
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', email: '', role: 'miembro' });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const editUser = (user: TeamUser) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email || '', role: user.role });
    setIsDialogOpen(true);
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.success('Usuario eliminado');
  };

  const openTaskAssignment = (user: TeamUser) => {
    setSelectedUser(user);
    setIsTaskDialogOpen(true);
  };

  const toggleTaskAssignment = (taskId: string) => {
    if (!selectedUser) return;
    
    setUsers(prev => prev.map(u => {
      if (u.id !== selectedUser.id) return u;
      const hasTask = u.assignedTasks.includes(taskId);
      return {
        ...u,
        assignedTasks: hasTask 
          ? u.assignedTasks.filter(id => id !== taskId)
          : [...u.assignedTasks, taskId]
      };
    }));
    
    // Update local selectedUser state
    setSelectedUser(prev => {
      if (!prev) return prev;
      const hasTask = prev.assignedTasks.includes(taskId);
      return {
        ...prev,
        assignedTasks: hasTask 
          ? prev.assignedTasks.filter(id => id !== taskId)
          : [...prev.assignedTasks, taskId]
      };
    });
  };

  const getUserTasks = (user: TeamUser) => {
    return strategicTasks.filter(t => user.assignedTasks.includes(t.id));
  };

  const filteredUsers = users.filter(u => 
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalTasks = strategicTasks.length;
  const completedTasks = strategicTasks.filter(t => t.completed).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestión de usuarios y asignación de tareas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Crear Usuario</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editingUser ? 'Editar' : 'Crear'} Usuario</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nombre *</Label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="Nombre completo"
                  className="bg-secondary/50" 
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={form.email} 
                  onChange={e => setForm({ ...form, email: e.target.value })} 
                  placeholder="email@ejemplo.com"
                  className="bg-secondary/50" 
                />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as TeamUser['role'] })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="socio">Socio</SelectItem>
                    <SelectItem value="miembro">Miembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSubmit} className="bg-primary">{editingUser ? 'Guardar' : 'Crear'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <User className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground">Usuarios</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <ListTodo className="h-8 w-8 mx-auto mb-2 text-info" />
            <p className="text-2xl font-bold">{totalTasks}</p>
            <p className="text-xs text-muted-foreground">Tareas Totales</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{completedTasks}</p>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{totalTasks - completedTasks}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Buscar usuario..." 
          className="bg-secondary/50 max-w-sm" 
        />
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map(user => {
          const userTasks = getUserTasks(user);
          const completedUserTasks = userTasks.filter(t => t.completed).length;
          
          return (
            <Card key={user.id} className="bg-card border-border/50 hover:border-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-lg">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{user.name}</h3>
                      <Badge className={cn('text-xs border-0', roleColors[user.role])}>{roleLabels[user.role]}</Badge>
                    </div>
                    {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                    
                    {/* Assigned Tasks Preview */}
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Tareas asignadas: {userTasks.length} ({completedUserTasks} completadas)
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {userTasks.slice(0, 3).map(task => (
                          <Badge 
                            key={task.id} 
                            variant="outline" 
                            className={cn("text-xs", task.completed && "line-through opacity-60")}
                          >
                            {task.title.length > 25 ? task.title.slice(0, 25) + '...' : task.title}
                          </Badge>
                        ))}
                        {userTasks.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{userTasks.length - 3} más</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTaskAssignment(user)} title="Asignar tareas">
                      <ListTodo className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editUser(user)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteUser(user.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Task Assignment Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Asignar Tareas a {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 mt-4">
            {strategicTasks.map(task => {
              const isAssigned = selectedUser?.assignedTasks.includes(task.id);
              return (
                <div 
                  key={task.id} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    isAssigned ? "border-primary/50 bg-primary/5" : "border-border/50 hover:bg-secondary/30"
                  )}
                  onClick={() => toggleTaskAssignment(task.id)}
                >
                  <Checkbox checked={isAssigned} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", task.completed && "line-through opacity-60")}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                    )}
                  </div>
                  {task.completed && (
                    <Badge className="bg-success/20 text-success border-0 text-xs">Completada</Badge>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button onClick={() => setIsTaskDialogOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
