import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  DollarSign, 
  PhoneCall, 
  Handshake, 
  Users, 
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  important: boolean;
  created_at: string;
  author_id: string;
}

interface TeamUser {
  id: string;
  name: string;
}

const revenueData = [
  { month: 'Jul', ingresos: 18000, gastos: 12000 },
  { month: 'Ago', ingresos: 22000, gastos: 14000 },
  { month: 'Sep', ingresos: 25000, gastos: 15000 },
  { month: 'Oct', ingresos: 28000, gastos: 16000 },
  { month: 'Nov', ingresos: 32000, gastos: 18000 },
  { month: 'Dic', ingresos: 35000, gastos: 19000 },
];

const performanceData = [
  { name: 'Semana 1', setters: 25, closers: 8 },
  { name: 'Semana 2', setters: 32, closers: 12 },
  { name: 'Semana 3', setters: 28, closers: 10 },
  { name: 'Semana 4', setters: 35, closers: 15 },
];

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [clientCount, setClientCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [setterCalls, setSetterCalls] = useState(0);
  const [closerValue, setCloserValue] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load tasks
      const { data: tasksData } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (tasksData) setTasks(tasksData);

      // Load announcements
      const { data: announcementsData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3);
      if (announcementsData) setAnnouncements(announcementsData);

      // Load team users
      const { data: usersData } = await supabase.from('team_users').select('id, name');
      if (usersData) setTeamUsers(usersData);

      // Load clients count
      const { count: activeClients } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'activo');
      setClientCount(activeClients || 0);

      // Load documents count
      const { count: docs } = await supabase.from('documents').select('*', { count: 'exact', head: true });
      setDocumentCount(docs || 0);

      // Load incomes sum
      const { data: incomesData } = await supabase.from('incomes').select('amount');
      if (incomesData) setTotalIncome(incomesData.reduce((sum, i) => sum + Number(i.amount), 0));

      // Load expenses sum
      const { data: fixedData } = await supabase.from('fixed_costs').select('amount');
      const { data: variableData } = await supabase.from('variable_costs').select('amount');
      const fixedSum = fixedData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const variableSum = variableData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      setTotalExpenses(fixedSum + variableSum);

      // Load setter meetings count
      const { count: meetings } = await supabase.from('setter_meetings').select('*', { count: 'exact', head: true });
      setSetterCalls(meetings || 0);

      // Load closer calls value
      const { data: closerCallsData } = await supabase.from('closer_calls').select('price').eq('paid', true);
      if (closerCallsData) setCloserValue(closerCallsData.reduce((sum, c) => sum + Number(c.price || 0), 0));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Task stats
  const pendingTasks = tasks.filter(t => t.status === 'pendiente').length;
  const inProgressTasks = tasks.filter(t => t.status === 'en_progreso').length;
  const completedTasks = tasks.filter(t => t.status === 'completada').length;
  
  // Recent tasks grouped by time
  const recentTasks = tasks.slice(0, 10);
  const todayTasks = recentTasks.filter(t => isToday(parseISO(t.created_at)));
  const yesterdayTasks = recentTasks.filter(t => isYesterday(parseISO(t.created_at)));
  const weekTasks = recentTasks.filter(t => isThisWeek(parseISO(t.created_at)) && !isToday(parseISO(t.created_at)) && !isYesterday(parseISO(t.created_at)));

  const balance = totalIncome - totalExpenses;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completada': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'en_progreso': return <Clock className="h-4 w-4 text-warning" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completada': return <Badge className="bg-success/20 text-success border-0 text-xs">Completada</Badge>;
      case 'en_progreso': return <Badge className="bg-warning/20 text-warning border-0 text-xs">En Progreso</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Pendiente</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'alta': return <Badge className="bg-destructive/20 text-destructive border-0 text-xs">Alta</Badge>;
      case 'media': return <Badge className="bg-warning/20 text-warning border-0 text-xs">Media</Badge>;
      default: return <Badge className="bg-info/20 text-info border-0 text-xs">Baja</Badge>;
    }
  };

  const getUserName = (userId: string) => {
    return teamUsers.find(u => u.id === userId)?.name || 'Usuario';
  };

  const formatTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "HH:mm", { locale: es });
  };

  const formatDateTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "dd MMM, HH:mm", { locale: es });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Vista general de Torii</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Link to="/tareas">
          <Card className="bg-card hover:bg-torii-card-hover transition-colors cursor-pointer border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckSquare className="h-8 w-8 text-primary" />
                <Badge variant="outline" className="text-xs">Pendientes</Badge>
              </div>
              <p className="text-2xl font-bold mt-3">{pendingTasks}</p>
              <p className="text-xs text-muted-foreground">Tareas por hacer</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/finanzas">
          <Card className="bg-card hover:bg-torii-card-hover transition-colors cursor-pointer border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <DollarSign className="h-8 w-8 text-success" />
                {balance >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </div>
              <p className="text-2xl font-bold mt-3">${balance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Balance del mes</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/setters">
          <Card className="bg-card hover:bg-torii-card-hover transition-colors cursor-pointer border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <PhoneCall className="h-8 w-8 text-info" />
              </div>
              <p className="text-2xl font-bold mt-3">{setterCalls}</p>
              <p className="text-xs text-muted-foreground">Reuniones agendadas</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/closers">
          <Card className="bg-card hover:bg-torii-card-hover transition-colors cursor-pointer border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Handshake className="h-8 w-8 text-warning" />
              </div>
              <p className="text-2xl font-bold mt-3">${closerValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Valor cerrado</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/clientes">
          <Card className="bg-card hover:bg-torii-card-hover transition-colors cursor-pointer border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users className="h-8 w-8 text-primary" />
                <Badge className="text-xs bg-success/20 text-success border-0">Activos</Badge>
              </div>
              <p className="text-2xl font-bold mt-3">{clientCount}</p>
              <p className="text-xs text-muted-foreground">Clientes activos</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/documentos">
          <Card className="bg-card hover:bg-torii-card-hover transition-colors cursor-pointer border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-3">{documentCount}</p>
              <p className="text-xs text-muted-foreground">Documentos</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Task Report Section */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Informe de Tareas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Task Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pendientes</span>
              </div>
              <p className="text-2xl font-bold">{pendingTasks}</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm text-muted-foreground">En Progreso</span>
              </div>
              <p className="text-2xl font-bold text-warning">{inProgressTasks}</p>
            </div>
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Completadas</span>
              </div>
              <p className="text-2xl font-bold text-success">{completedTasks}</p>
            </div>
          </div>

          {/* Recent Tasks List */}
          <div className="space-y-4">
            {todayTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">Hoy</p>
                <div className="space-y-2">
                  {todayTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      {getStatusIcon(task.status)}
                      <span className="flex-1 text-sm font-medium">{task.title}</span>
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                      <span className="text-xs text-muted-foreground">{formatTime(task.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {yesterdayTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">Ayer</p>
                <div className="space-y-2">
                  {yesterdayTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      {getStatusIcon(task.status)}
                      <span className="flex-1 text-sm font-medium">{task.title}</span>
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {weekTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">Esta Semana</p>
                <div className="space-y-2">
                  {weekTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      {getStatusIcon(task.status)}
                      <span className="flex-1 text-sm font-medium">{task.title}</span>
                      {getStatusBadge(task.status)}
                      {getPriorityBadge(task.priority)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentTasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay tareas registradas</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium">Ingresos vs Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ingresos" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="gastos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium">Performance Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="setters" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="closers" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcements */}
        <Card className="lg:col-span-3 bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium">Anuncios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.important && (
                      <Badge className="bg-primary/20 text-primary border-0 text-xs">Importante</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDateTime(announcement.created_at)}</span>
                  </div>
                  <p className="text-sm font-medium mb-1">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{announcement.content}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  No hay anuncios
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/tareas" className="group">
          <Card className="bg-card border-border/50 hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Nueva Tarea</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/finanzas" className="group">
          <Card className="bg-card border-border/50 hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Registrar Ingreso</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/clientes" className="group">
          <Card className="bg-card border-border/50 hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Agregar Cliente</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/documentos" className="group">
          <Card className="bg-card border-border/50 hover:border-primary/50 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">Subir Documento</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
