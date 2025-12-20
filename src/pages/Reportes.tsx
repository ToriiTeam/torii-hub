import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useStore } from '@/hooks/useStore';
import { initialTasks, initialSetters, initialClosers, initialFixedCosts, initialVariableCosts, initialIncomes, initialPayments } from '@/data/initialData';
import { 
  FileText, Download, Send,
  BarChart3, DollarSign, Users, CheckSquare, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ReportType = 'daily_metrics' | 'weekly_summary' | 'monthly_report' | 'financial' | 'custom';

const reportTypes: { value: ReportType; label: string; description: string; icon: typeof FileText }[] = [
  { value: 'daily_metrics', label: 'Métricas Diarias', description: 'Resumen de actividad del día', icon: BarChart3 },
  { value: 'weekly_summary', label: 'Resumen Semanal', description: 'Performance de la semana', icon: FileText },
  { value: 'monthly_report', label: 'Reporte Mensual', description: 'Análisis completo del mes', icon: FileText },
  { value: 'financial', label: 'Estado Financiero', description: 'Ingresos, gastos y balance', icon: DollarSign },
  { value: 'custom', label: 'Personalizado', description: 'Configura qué incluir', icon: FileText },
];

const WEBHOOK_URL = 'https://n8n-n8n.vycvt5.easypanel.host/webhook/ef66538d-bf27-4ec2-863f-3ee73c732e5d';

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
  const [isSending, setIsSending] = useState(false);

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
          goalProgress: s.goal > 0 ? Math.round((s.metrics.appointments / s.goal) * 100) : 0
        }))
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
          goalProgress: c.goal > 0 ? Math.round((c.metrics.totalValue / c.goal) * 100) : 0
        }))
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

  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `reporte-${selectedType}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    
    const selectedReportType = reportTypes.find(r => r.value === selectedType);
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          type: selectedType,
          typeName: selectedReportType?.label || selectedType,
          timestamp: new Date().toISOString(),
          period: { start: today, end: today },
          data: reportData,
          platform: 'Torii'
        }),
      });

      toast.success('Reporte enviado correctamente');
    } catch (error) {
      console.error('Error sending report:', error);
      toast.error('Error al enviar el reporte');
    } finally {
      setIsSending(false);
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">Genera reportes de tu negocio</p>
      </div>

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

        {/* Options */}
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

      {/* Preview & Actions */}
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
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleDownloadJSON} className="gap-2">
              <Download className="h-4 w-4" />
              Descargar JSON
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending} className="gap-2">
              <Send className="h-4 w-4" />
              {isSending ? 'Enviando...' : 'Enviar Email'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
