import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/hooks/useStore';
import { useN8N } from '@/hooks/useN8N';
import { initialTasks, initialSetters, initialClosers, initialFixedCosts, initialVariableCosts, initialIncomes, initialPayments } from '@/data/initialData';
import { ReportType, ReportConfig } from '@/types/integrations';
import { toast } from 'sonner';
import { 
  Send, FileText, Download, History, Settings, Check, X, 
  RefreshCw, Loader2, Zap, AlertCircle, ChevronRight, 
  BarChart3, DollarSign, Users, CheckSquare, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

const reportTypes: { value: ReportType; label: string; description: string; icon: typeof FileText }[] = [
  { value: 'daily_metrics', label: 'Métricas Diarias', description: 'Resumen de actividad del día', icon: BarChart3 },
  { value: 'weekly_summary', label: 'Resumen Semanal', description: 'Performance de la semana', icon: FileText },
  { value: 'monthly_report', label: 'Reporte Mensual', description: 'Análisis completo del mes', icon: FileText },
  { value: 'financial', label: 'Estado Financiero', description: 'Ingresos, gastos y balance', icon: DollarSign },
  { value: 'custom', label: 'Personalizado', description: 'Configura qué incluir', icon: Settings },
];

export default function Reportes() {
  const [tasks] = useStore('tareas', initialTasks);
  const [setters] = useStore('setters', initialSetters);
  const [closers] = useStore('closers', initialClosers);
  const [fixedCosts] = useStore('costos_fijos', initialFixedCosts);
  const [variableCosts] = useStore('costos_variables', initialVariableCosts);
  const [incomes] = useStore('ingresos', initialIncomes);
  const [payments] = useStore('pagos', initialPayments);

  const [selectedType, setSelectedType] = useState<ReportType>('daily_metrics');
  const [includeSetters, setIncludeSetters] = useState(true);
  const [includeClosers, setIncludeClosers] = useState(true);
  const [includeFinances, setIncludeFinances] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const {
    connectionStatus,
    webhookUrl,
    reportHistory,
    isTesting,
    isSending,
    lastTestResult,
    saveWebhookUrl,
    testConnection,
    sendReport,
    resendReport,
    clearHistory,
    reportTypeLabels,
  } = useN8N();

  // Generate report data based on current state
  const reportData = useMemo(() => {
    const data: Record<string, any> = {};

    if (includeSetters) {
      data.setters = {
        total: setters.length,
        totalCalls: setters.reduce((sum, s) => sum + s.metrics.calls, 0),
        totalLeads: setters.reduce((sum, s) => sum + s.metrics.leads, 0),
        totalAppointments: setters.reduce((sum, s) => sum + s.metrics.appointments, 0),
        conversionRate: setters.length > 0 
          ? Math.round((setters.reduce((sum, s) => sum + s.metrics.appointments, 0) / 
              setters.reduce((sum, s) => sum + s.metrics.calls, 0)) * 100 * 10) / 10
          : 0,
        details: setters.map(s => ({
          name: s.name,
          calls: s.metrics.calls,
          leads: s.metrics.leads,
          appointments: s.metrics.appointments,
          goalProgress: Math.round((s.metrics.appointments / s.goal) * 100),
        })),
      };
    }

    if (includeClosers) {
      data.closers = {
        total: closers.length,
        totalMeetings: closers.reduce((sum, c) => sum + c.metrics.meetings, 0),
        totalProposals: closers.reduce((sum, c) => sum + c.metrics.proposals, 0),
        totalClosed: closers.reduce((sum, c) => sum + c.metrics.closed, 0),
        totalValue: closers.reduce((sum, c) => sum + c.metrics.totalValue, 0),
        closeRate: closers.length > 0
          ? Math.round((closers.reduce((sum, c) => sum + c.metrics.closed, 0) / 
              closers.reduce((sum, c) => sum + c.metrics.meetings, 0)) * 100 * 10) / 10
          : 0,
        details: closers.map(c => ({
          name: c.name,
          meetings: c.metrics.meetings,
          proposals: c.metrics.proposals,
          closed: c.metrics.closed,
          value: c.metrics.totalValue,
          goalProgress: Math.round((c.metrics.totalValue / c.goal) * 100),
        })),
      };
    }

    if (includeFinances) {
      const totalFixedCosts = fixedCosts.reduce((sum, c) => sum + c.amount, 0);
      const totalVariableCosts = variableCosts.reduce((sum, c) => sum + c.amount, 0);
      const totalIncomes = incomes.reduce((sum, i) => sum + i.amount, 0);
      const pendingPayments = payments.filter(p => p.status === 'pendiente');

      data.finances = {
        totalIncomes,
        totalFixedCosts,
        totalVariableCosts,
        totalExpenses: totalFixedCosts + totalVariableCosts,
        balance: totalIncomes - (totalFixedCosts + totalVariableCosts),
        pendingToCollect: pendingPayments.filter(p => p.type === 'cobrar').reduce((sum, p) => sum + p.amount, 0),
        pendingToPay: pendingPayments.filter(p => p.type === 'pagar').reduce((sum, p) => sum + p.amount, 0),
      };
    }

    if (includeTasks) {
      data.tasks = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pendiente').length,
        inProgress: tasks.filter(t => t.status === 'en_progreso').length,
        completed: tasks.filter(t => t.status === 'completada').length,
        overdue: tasks.filter(t => t.status !== 'completada' && new Date(t.dueDate) < new Date()).length,
        highPriority: tasks.filter(t => t.priority === 'alta' && t.status !== 'completada').length,
      };
    }

    return data;
  }, [setters, closers, fixedCosts, variableCosts, incomes, payments, tasks, 
      includeSetters, includeClosers, includeFinances, includeTasks]);

  const handleSendReport = async () => {
    const config: ReportConfig = {
      type: selectedType,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      includeSetters,
      includeClosers,
      includeFinances,
      includeTasks,
    };

    await sendReport(config, reportData);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">Genera y envía reportes automáticos vía N8N</p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate" className="gap-2"><FileText className="h-4 w-4" />Generar Reporte</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />Historial</TabsTrigger>
          <TabsTrigger value="config" className="gap-2"><Settings className="h-4 w-4" />Configuración</TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Type Selection */}
            <Card className="bg-card border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Tipo de Reporte</CardTitle>
                <CardDescription>Selecciona el tipo de reporte que deseas generar</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportTypes.map(type => (
                  <div
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      selectedType === type.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        selectedType === type.value ? "bg-primary/20" : "bg-secondary/50"
                      )}>
                        <type.icon className={cn(
                          "h-5 w-5",
                          selectedType === type.value ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Options for custom report */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Contenido del Reporte</CardTitle>
                <CardDescription>Configura qué datos incluir</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="setters" checked={includeSetters} onCheckedChange={(c) => setIncludeSetters(!!c)} />
                  <Label htmlFor="setters" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Métricas de Setters
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="closers" checked={includeClosers} onCheckedChange={(c) => setIncludeClosers(!!c)} />
                  <Label htmlFor="closers" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Métricas de Closers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="finances" checked={includeFinances} onCheckedChange={(c) => setIncludeFinances(!!c)} />
                  <Label htmlFor="finances" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Estado Financiero
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="tasks" checked={includeTasks} onCheckedChange={(c) => setIncludeTasks(!!c)} />
                  <Label htmlFor="tasks" className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    Resumen de Tareas
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview & Send */}
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Vista Previa del Reporte</CardTitle>
                <CardDescription>Revisa los datos antes de enviar</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Mostrar'} Datos
              </Button>
            </CardHeader>
            {showPreview && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {reportData.setters && (
                    <div className="p-4 rounded-lg bg-secondary/30">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-primary" />
                        Setters
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>Llamadas: <span className="font-medium">{reportData.setters.totalCalls}</span></p>
                        <p>Leads: <span className="font-medium">{reportData.setters.totalLeads}</span></p>
                        <p>Citas: <span className="font-medium">{reportData.setters.totalAppointments}</span></p>
                        <p>Conversión: <span className="font-medium">{reportData.setters.conversionRate}%</span></p>
                      </div>
                    </div>
                  )}
                  {reportData.closers && (
                    <div className="p-4 rounded-lg bg-secondary/30">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-primary" />
                        Closers
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>Reuniones: <span className="font-medium">{reportData.closers.totalMeetings}</span></p>
                        <p>Propuestas: <span className="font-medium">{reportData.closers.totalProposals}</span></p>
                        <p>Cierres: <span className="font-medium">{reportData.closers.totalClosed}</span></p>
                        <p>Valor: <span className="font-medium">{formatCurrency(reportData.closers.totalValue)}</span></p>
                      </div>
                    </div>
                  )}
                  {reportData.finances && (
                    <div className="p-4 rounded-lg bg-secondary/30">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Finanzas
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>Ingresos: <span className="font-medium text-success">{formatCurrency(reportData.finances.totalIncomes)}</span></p>
                        <p>Gastos: <span className="font-medium text-destructive">{formatCurrency(reportData.finances.totalExpenses)}</span></p>
                        <p>Balance: <span className={cn("font-medium", reportData.finances.balance >= 0 ? "text-success" : "text-destructive")}>
                          {formatCurrency(reportData.finances.balance)}
                        </span></p>
                      </div>
                    </div>
                  )}
                  {reportData.tasks && (
                    <div className="p-4 rounded-lg bg-secondary/30">
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        Tareas
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>Pendientes: <span className="font-medium">{reportData.tasks.pending}</span></p>
                        <p>En Progreso: <span className="font-medium">{reportData.tasks.inProgress}</span></p>
                        <p>Completadas: <span className="font-medium">{reportData.tasks.completed}</span></p>
                        <p>Vencidas: <span className="font-medium text-destructive">{reportData.tasks.overdue}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
            <CardContent className="border-t border-border/50 pt-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  {connectionStatus.connected ? (
                    <Badge className="bg-success/20 text-success border-0 gap-1">
                      <Check className="h-3 w-3" />
                      N8N Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-warning">
                      <AlertCircle className="h-3 w-3" />
                      Configura el webhook primero
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Descargar JSON
                  </Button>
                  <Button 
                    onClick={handleSendReport} 
                    disabled={!connectionStatus.connected || isSending}
                    className="gap-2"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar por Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Historial de Reportes</CardTitle>
                <CardDescription>Últimos reportes enviados</CardDescription>
              </div>
              {reportHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground">
                  Limpiar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {reportHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No hay reportes enviados aún</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reportHistory.map(report => (
                    <div key={report.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        report.status === 'enviado' ? "bg-success/20" : 
                        report.status === 'fallido' ? "bg-destructive/20" : "bg-warning/20"
                      )}>
                        {report.status === 'enviado' ? <Check className="h-4 w-4 text-success" /> :
                         report.status === 'fallido' ? <X className="h-4 w-4 text-destructive" /> :
                         <Loader2 className="h-4 w-4 text-warning animate-spin" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{reportTypeLabels[report.type]}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.date).toLocaleString('es-ES')}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        report.status === 'enviado' ? "text-success" : 
                        report.status === 'fallido' ? "text-destructive" : "text-warning"
                      )}>
                        {report.status === 'enviado' ? 'Enviado' : 
                         report.status === 'fallido' ? 'Fallido' : 'Pendiente'}
                      </Badge>
                      {report.status === 'fallido' && (
                        <Button variant="ghost" size="sm" onClick={() => resendReport(report.id)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Configuración de N8N
              </CardTitle>
              <CardDescription>
                Conecta tu instancia de N8N para enviar reportes automáticos por email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="webhook">URL del Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhook"
                    type="url"
                    placeholder="https://tu-instancia.n8n.cloud/webhook/..."
                    value={webhookUrl}
                    onChange={(e) => saveWebhookUrl(e.target.value)}
                    className="bg-secondary/50"
                  />
                  <Button onClick={testConnection} disabled={isTesting || !webhookUrl} variant="outline">
                    {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Probar'}
                  </Button>
                </div>
                {lastTestResult !== null && (
                  <p className={cn("text-sm", lastTestResult ? "text-success" : "text-destructive")}>
                    {lastTestResult ? '✓ Conexión exitosa' : '✗ Error de conexión'}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
                <h4 className="font-medium">Cómo configurar N8N</h4>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Crea un nuevo workflow en N8N</li>
                  <li>Agrega un nodo "Webhook" como trigger</li>
                  <li>Copia la URL del webhook y pégala arriba</li>
                  <li>Configura los nodos para procesar y enviar el email</li>
                  <li>Activa el workflow</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg border border-info/30 bg-info/5">
                <h4 className="font-medium flex items-center gap-2 text-info">
                  <AlertCircle className="h-4 w-4" />
                  Automatizaciones sugeridas
                </h4>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3" />Reporte diario automático a las 8:00 AM</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3" />Alerta de tareas vencidas</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3" />Resumen semanal los lunes</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3" />Sincronización con Google Sheets</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
