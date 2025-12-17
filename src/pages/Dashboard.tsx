import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckSquare, 
  DollarSign, 
  PhoneCall, 
  Handshake, 
  Users, 
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '@/hooks/useStore';
import { 
  initialTasks, 
  initialIncomes, 
  initialVariableCosts, 
  initialFixedCosts,
  initialSetters,
  initialClosers,
  initialClients,
  initialDocuments,
  initialAnnouncements,
  userNames
} from '@/data/initialData';
import { Link } from 'react-router-dom';

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
  const [tasks] = useStore('tareas', initialTasks);
  const [incomes] = useStore('ingresos', initialIncomes);
  const [variableCosts] = useStore('gastos_variables', initialVariableCosts);
  const [fixedCosts] = useStore('gastos_fijos', initialFixedCosts);
  const [setters] = useStore('setters', initialSetters);
  const [closers] = useStore('closers', initialClosers);
  const [clients] = useStore('clientes', initialClients);
  const [documents] = useStore('documentos', initialDocuments);
  const [announcements] = useStore('anuncios', initialAnnouncements);

  const pendingTasks = tasks.filter(t => t.status !== 'completada').length;
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = variableCosts.reduce((sum, c) => sum + c.amount, 0) + 
                        fixedCosts.reduce((sum, c) => sum + c.amount, 0);
  const balance = totalIncome - totalExpenses;
  
  const totalSetterCalls = setters.reduce((sum, s) => sum + s.metrics.calls, 0);
  const totalSetterLeads = setters.reduce((sum, s) => sum + s.metrics.leads, 0);
  const totalCloserMeetings = closers.reduce((sum, c) => sum + c.metrics.meetings, 0);
  const totalCloserValue = closers.reduce((sum, c) => sum + c.metrics.totalValue, 0);
  
  const activeClients = clients.filter(c => c.status === 'activo').length;

  const recentActivities = [
    { id: 1, action: 'Tarea completada', detail: 'Actualizar SOPs de ventas', time: 'Hace 2h', type: 'task' },
    { id: 2, action: 'Nuevo ingreso', detail: 'Contrato MediaPlus - $4,200', time: 'Hace 5h', type: 'income' },
    { id: 3, action: 'Cliente agregado', detail: 'DataDrive - Lead', time: 'Hace 1d', type: 'client' },
    { id: 4, action: 'Cita confirmada', detail: 'Laura Sánchez - 3 citas', time: 'Hace 1d', type: 'setter' },
    { id: 5, action: 'Cierre registrado', detail: 'Patricia Gómez - $8,500', time: 'Hace 2d', type: 'closer' },
  ];

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
                <span className="text-xs text-muted-foreground">{totalSetterLeads} leads</span>
              </div>
              <p className="text-2xl font-bold mt-3">{totalSetterCalls}</p>
              <p className="text-xs text-muted-foreground">Llamadas setters</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/closers">
          <Card className="bg-card hover:bg-torii-card-hover transition-colors cursor-pointer border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Handshake className="h-8 w-8 text-warning" />
                <span className="text-xs text-muted-foreground">{totalCloserMeetings} reuniones</span>
              </div>
              <p className="text-2xl font-bold mt-3">${totalCloserValue.toLocaleString()}</p>
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
              <p className="text-2xl font-bold mt-3">{activeClients}</p>
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
              <p className="text-2xl font-bold mt-3">{documents.length}</p>
              <p className="text-xs text-muted-foreground">Documentos</p>
            </CardContent>
          </Card>
        </Link>
      </div>

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
        {/* Recent Activity */}
        <Card className="lg:col-span-2 bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    activity.type === 'task' ? 'bg-primary/20 text-primary' :
                    activity.type === 'income' ? 'bg-success/20 text-success' :
                    activity.type === 'client' ? 'bg-info/20 text-info' :
                    activity.type === 'setter' ? 'bg-info/20 text-info' :
                    'bg-warning/20 text-warning'
                  }`}>
                    {activity.type === 'task' && <CheckSquare className="h-5 w-5" />}
                    {activity.type === 'income' && <DollarSign className="h-5 w-5" />}
                    {activity.type === 'client' && <Users className="h-5 w-5" />}
                    {activity.type === 'setter' && <PhoneCall className="h-5 w-5" />}
                    {activity.type === 'closer' && <Handshake className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium">Anuncios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {announcements.slice(0, 3).map((announcement) => (
                <div key={announcement.id} className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    {announcement.important && (
                      <Badge className="bg-primary/20 text-primary border-0 text-xs">Importante</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{announcement.date}</span>
                  </div>
                  <p className="text-sm font-medium mb-1">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{announcement.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">— {userNames[announcement.authorId]}</p>
                </div>
              ))}
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
