import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  CreditCard,
  Wallet,
  AlertCircle,
  Trash2,
  Check,
  Download,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const COLORS = ['#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

interface FixedCost {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  payment_date: number;
}

interface VariableCost {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  description: string;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string | null;
  description: string | null;
}

interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  client_id: string | null;
  type: string;
}

interface Client {
  id: string;
  name: string;
  status: string;
  payment_type: string;
  total_installments: number;
  paid_installments: number;
  installment_amount: number;
  total_amount: number | null;
  next_due_date: string | null;
  platform: string;
  platform_fee: number;
}

interface ClientInstallment {
  id: string;
  client_id: string;
  installment_number: number;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_date: string | null;
}

interface MonthlyAccounting {
  id: string;
  year: number;
  month: number;
  total_income: number;
  total_fixed_costs: number;
  total_variable_costs: number;
  net_profit: number;
  notes: string | null;
}

interface Setter {
  id: string;
  name: string;
}

interface SetterPayment {
  id: string;
  setter_id: string;
  amount: number;
  payment_date: string;
  period_start: string | null;
  period_end: string | null;
  meetings_count: number;
  notes: string | null;
}

export default function Finanzas() {
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientInstallments, setClientInstallments] = useState<ClientInstallment[]>([]);
  const [monthlyAccounting, setMonthlyAccounting] = useState<MonthlyAccounting[]>([]);
  const [setters, setSetters] = useState<Setter[]>([]);
  const [setterPayments, setSetterPayments] = useState<SetterPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('resumen');
  const [dialogType, setDialogType] = useState<'fixed' | 'variable' | 'income' | 'setter_payment' | 'expense' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Form states
  const [fixedForm, setFixedForm] = useState({ name: '', amount: '', frequency: 'mensual', category: '', payment_date: '1' });
  const [variableForm, setVariableForm] = useState({ name: '', amount: '', date: '', category: '', description: '' });
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '', date: '', category: '', description: '' });
  const [incomeForm, setIncomeForm] = useState({ source: '', amount: '', date: '', type: 'unico', client_id: '' });
  const [setterPaymentForm, setSetterPaymentForm] = useState({ setter_id: '', amount: '', payment_date: '', period_start: '', period_end: '', meetings_count: '', notes: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fixedRes, variableRes, expensesRes, incomeRes, clientsRes, accountingRes, installmentsRes, settersRes, setterPaymentsRes] = await Promise.all([
        supabase.from('fixed_costs').select('*').order('name'),
        supabase.from('variable_costs').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('incomes').select('*').order('date', { ascending: false }),
        supabase.from('clients').select('*').order('name'),
        supabase.from('monthly_accounting').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
        supabase.from('client_installments').select('*').order('installment_number'),
        supabase.from('setters').select('id, name').order('name'),
        supabase.from('setter_payments').select('*').order('payment_date', { ascending: false })
      ]);

      if (fixedRes.data) setFixedCosts(fixedRes.data);
      if (variableRes.data) setVariableCosts(variableRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (incomeRes.data) setIncomes(incomeRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (accountingRes.data) setMonthlyAccounting(accountingRes.data);
      if (installmentsRes.data) setClientInstallments(installmentsRes.data);
      if (settersRes.data) setSetters(settersRes.data);
      if (setterPaymentsRes.data) setSetterPayments(setterPaymentsRes.data);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalFixedCosts = fixedCosts.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalVariableCosts = variableCosts.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalSetterPayments = setterPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  
  // Total gastado = todos los egresos (expenses + costos variables + costos fijos + pagos setters)
  const totalGastado = totalExpensesAmount + totalVariableCosts + totalFixedCosts + totalSetterPayments;
  const balance = totalIncome - totalGastado;

  // Client payments calculations - using actual installment amounts
  const totalClientRevenue = clientInstallments
    .filter(inst => inst.paid)
    .reduce((sum, inst) => sum + Number(inst.amount), 0);
  
  // Pendiente de clientes: misma lógica que en Clientes.tsx
  // Si el cliente tiene cuotas registradas, suma las no pagadas
  // Si no tiene cuotas, usa total_amount como fallback (considerando pagos parciales)
  const activeClients = clients.filter(c => c.status === 'activo');
  const totalPendingClientRevenue = activeClients.reduce((sum, client) => {
    const clientInsts = clientInstallments.filter(i => i.client_id === client.id);
    if (clientInsts.length > 0) {
      // Sumar cuotas no pagadas
      return sum + clientInsts.filter(i => !i.paid).reduce((s, i) => s + Number(i.amount), 0);
    } else {
      // Fallback: estimar pendiente si no hay cuotas registradas
      const remaining = client.total_installments - client.paid_installments;
      const avgPerInstallment = client.total_installments > 0 ? (client.total_amount || 0) / client.total_installments : 0;
      return sum + (avgPerInstallment * remaining);
    }
  }, 0);

  // Expense distribution for pie chart
  const expenseCategories = [...fixedCosts, ...variableCosts].reduce((acc, cost) => {
    const catName = cost.category || 'Sin categoría';
    const existing = acc.find(c => c.name === catName);
    if (existing) {
      existing.value += Number(cost.amount);
    } else {
      acc.push({ name: catName, value: Number(cost.amount) });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Monthly data for chart
  const getMonthlyData = () => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStr = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM', { locale: es });
      
      const monthIncomes = incomes.filter(inc => inc.date?.startsWith(monthStr));
      const monthVariables = variableCosts.filter(vc => vc.date?.startsWith(monthStr));
      
      months.push({
        month: monthLabel,
        ingresos: monthIncomes.reduce((sum, i) => sum + Number(i.amount), 0),
        gastos: monthVariables.reduce((sum, c) => sum + Number(c.amount), 0) + (totalFixedCosts / 12)
      });
    }
    return months;
  };

  // CRUD operations
  const handleAddFixed = async () => {
    if (!fixedForm.name || !fixedForm.amount) {
      toast.error('Complete los campos requeridos');
      return;
    }
    try {
      const { error } = await supabase.from('fixed_costs').insert([{
        name: fixedForm.name,
        amount: parseFloat(fixedForm.amount),
        frequency: fixedForm.frequency,
        category: fixedForm.category || 'General',
        payment_date: parseInt(fixedForm.payment_date) || 1,
      }]);
      if (error) throw error;
      toast.success('Costo fijo agregado');
      setFixedForm({ name: '', amount: '', frequency: 'mensual', category: '', payment_date: '1' });
      setDialogType(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddVariable = async () => {
    if (!variableForm.name || !variableForm.amount) {
      toast.error('Complete los campos requeridos');
      return;
    }
    try {
      const { error } = await supabase.from('variable_costs').insert([{
        name: variableForm.name,
        amount: parseFloat(variableForm.amount),
        date: variableForm.date || format(new Date(), 'yyyy-MM-dd'),
        category: variableForm.category || 'General',
        description: variableForm.description,
      }]);
      if (error) throw error;
      toast.success('Gasto variable agregado');
      setVariableForm({ name: '', amount: '', date: '', category: '', description: '' });
      setDialogType(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddIncome = async () => {
    if (!incomeForm.source || !incomeForm.amount) {
      toast.error('Complete los campos requeridos');
      return;
    }
    try {
      setUploadingReceipt(true);
      
      // Insert income first
      const { data: incomeData, error } = await supabase.from('incomes').insert([{
        source: incomeForm.source,
        amount: parseFloat(incomeForm.amount),
        date: incomeForm.date || format(new Date(), 'yyyy-MM-dd'),
        type: incomeForm.type,
        client_id: incomeForm.client_id || null,
      }]).select().single();
      
      if (error) throw error;

      // If there's a receipt file, upload it and create document record
      if (receiptFile && incomeData) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `comprobante-${incomeData.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);
        
        if (uploadError) {
          console.error('Error uploading receipt:', uploadError);
          toast.error('Ingreso registrado pero hubo error al subir comprobante');
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
          
          // Create document record
          await supabase.from('documents').insert([{
            name: `Comprobante - ${incomeForm.source}`,
            description: `Comprobante de ingreso: $${incomeForm.amount} - ${incomeForm.date || format(new Date(), 'yyyy-MM-dd')}`,
            category: 'comprobantes',
            file_url: urlData.publicUrl,
            file_type: receiptFile.type,
            client_id: incomeForm.client_id || null,
            tags: ['ingreso', 'comprobante']
          }]);
          
          toast.success('Ingreso y comprobante registrados');
        }
      } else {
        toast.success('Ingreso registrado');
      }
      
      setIncomeForm({ source: '', amount: '', date: '', type: 'unico', client_id: '' });
      setReceiptFile(null);
      setDialogType(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const deleteItem = async (table: 'fixed_costs' | 'variable_costs' | 'incomes' | 'setter_payments' | 'expenses', id: string) => {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast.success('Eliminado correctamente');
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Add expense handler
  const handleAddExpense = async () => {
    if (!expenseForm.name || !expenseForm.amount) {
      toast.error('Complete los campos requeridos');
      return;
    }
    try {
      const { error } = await supabase.from('expenses').insert([{
        name: expenseForm.name,
        amount: parseFloat(expenseForm.amount),
        date: expenseForm.date || format(new Date(), 'yyyy-MM-dd'),
        category: expenseForm.category || null,
        description: expenseForm.description || null,
      }]);
      if (error) throw error;
      toast.success('Egreso agregado');
      setExpenseForm({ name: '', amount: '', date: '', category: '', description: '' });
      setDialogType(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Setter payment handler
  const handleAddSetterPayment = async () => {
    if (!setterPaymentForm.setter_id || !setterPaymentForm.amount) {
      toast.error('Setter y monto son requeridos');
      return;
    }
    try {
      const { error } = await supabase.from('setter_payments').insert([{
        setter_id: setterPaymentForm.setter_id,
        amount: parseFloat(setterPaymentForm.amount),
        payment_date: setterPaymentForm.payment_date || format(new Date(), 'yyyy-MM-dd'),
        period_start: setterPaymentForm.period_start || null,
        period_end: setterPaymentForm.period_end || null,
        meetings_count: parseInt(setterPaymentForm.meetings_count) || 0,
        notes: setterPaymentForm.notes || null,
      }]);
      if (error) throw error;
      
      toast.success('Pago de setter registrado');
      setSetterPaymentForm({ setter_id: '', amount: '', payment_date: '', period_start: '', period_end: '', meetings_count: '', notes: '' });
      setDialogType(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Helper function to get client installments for calculations
  const getClientInstallmentsData = (clientId: string) => {
    return clientInstallments.filter(i => i.client_id === clientId);
  };
  

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Resumen sheet
    const resumenData = [
      ['RESUMEN FINANCIERO', '', ''],
      ['', '', ''],
      ['Total Ingresos', `$${totalIncome.toLocaleString()}`, ''],
      ['Total Gastos Fijos', `$${totalFixedCosts.toLocaleString()}`, ''],
      ['Total Gastos Variables', `$${totalVariableCosts.toLocaleString()}`, ''],
      ['Total Egresos', `$${totalExpensesAmount.toLocaleString()}`, ''],
      ['Balance', `$${balance.toLocaleString()}`, balance >= 0 ? 'Positivo' : 'Negativo'],
      ['', '', ''],
      ['Ingresos de Clientes', `$${totalClientRevenue.toLocaleString()}`, ''],
      ['Pendiente de Clientes', `$${totalPendingClientRevenue.toLocaleString()}`, ''],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Costos Fijos sheet
    const fixedData = [
      ['Nombre', 'Categoría', 'Frecuencia', 'Día de Pago', 'Monto'],
      ...fixedCosts.map(c => [c.name, c.category, c.frequency, c.payment_date, c.amount])
    ];
    const wsFixed = XLSX.utils.aoa_to_sheet(fixedData);
    XLSX.utils.book_append_sheet(wb, wsFixed, 'Costos Fijos');

    // Costos Variables sheet
    const variableData = [
      ['Nombre', 'Categoría', 'Fecha', 'Descripción', 'Monto'],
      ...variableCosts.map(c => [c.name, c.category, c.date, c.description, c.amount])
    ];
    const wsVariable = XLSX.utils.aoa_to_sheet(variableData);
    XLSX.utils.book_append_sheet(wb, wsVariable, 'Costos Variables');

    // Ingresos sheet
    const incomeData = [
      ['Fuente', 'Tipo', 'Fecha', 'Monto'],
      ...incomes.map(i => [i.source, i.type, i.date, i.amount])
    ];
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Ingresos');

    // Clientes sheet - using real installment data
    const clientData = [
      ['Cliente', 'Estado', 'Tipo Pago', 'Cuotas Totales', 'Cuotas Pagadas', 'Plataforma', 'Fee %', 'Total Pagado', 'Pendiente'],
      ...clients.map(c => {
        const insts = getClientInstallmentsData(c.id);
        const paid = insts.filter(i => i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
        const pending = insts.filter(i => !i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
        const paidCount = insts.filter(i => i.paid).length;
        return [
          c.name, 
          c.status, 
          c.payment_type, 
          insts.length, 
          paidCount, 
          c.platform,
          c.platform_fee,
          paid,
          pending
        ];
      })
    ];
    const wsClients = XLSX.utils.aoa_to_sheet(clientData);
    XLSX.utils.book_append_sheet(wb, wsClients, 'Clientes');

    // Contabilidad Mensual sheet
    const monthlyData = [
      ['Año', 'Mes', 'Ingresos', 'Costos Fijos', 'Costos Variables', 'Beneficio Neto', 'Notas'],
      ...monthlyAccounting.map(m => [m.year, m.month, m.total_income, m.total_fixed_costs, m.total_variable_costs, m.net_profit, m.notes || ''])
    ];
    const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Contabilidad Mensual');

    // Save
    XLSX.writeFile(wb, `finanzas-torii-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Reporte Excel exportado');
  };

  // Save monthly accounting
  const saveMonthlyAccounting = async () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    const monthStr = format(selectedMonth, 'yyyy-MM');

    const monthIncomes = incomes.filter(inc => inc.date?.startsWith(monthStr));
    const monthVariables = variableCosts.filter(vc => vc.date?.startsWith(monthStr));
    
    const totalMonthIncome = monthIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalMonthVariable = monthVariables.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalMonthFixed = totalFixedCosts;
    const netProfit = totalMonthIncome - totalMonthFixed - totalMonthVariable;

    try {
      const { error } = await supabase.from('monthly_accounting').upsert([{
        year,
        month,
        total_income: totalMonthIncome,
        total_fixed_costs: totalMonthFixed,
        total_variable_costs: totalMonthVariable,
        net_profit: netProfit
      }], { onConflict: 'year,month' });
      if (error) throw error;
      toast.success('Contabilidad mensual guardada');
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Get monthly accounting data for selected month
  const getSelectedMonthData = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    return monthlyAccounting.find(m => m.year === year && m.month === month);
  };

  const monthlyChartData = getMonthlyData();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-muted-foreground">Control financiero de la agencia</p>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="border-border/50">
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-success" />
              <Badge className="bg-success/20 text-success border-0">Ingresos</Badge>
            </div>
            <p className="text-2xl font-bold">${totalIncome.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total registrado</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="h-8 w-8 text-destructive" />
              <Badge className="bg-destructive/20 text-destructive border-0">Gastos</Badge>
            </div>
            <p className="text-2xl font-bold">${totalGastado.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total gastado</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="h-8 w-8" style={{ color: balance >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }} />
            </div>
            <p className={cn("text-2xl font-bold", balance >= 0 ? 'text-success' : 'text-destructive')}>
              ${Math.abs(balance).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Balance {balance >= 0 ? 'positivo' : 'negativo'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-info" />
              <Badge className="bg-info/20 text-info border-0">Clientes</Badge>
            </div>
            <p className="text-2xl font-bold">${totalClientRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pagado por clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="h-8 w-8 text-warning" />
            </div>
            <p className="text-2xl font-bold">${totalPendingClientRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pendiente de clientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/50 border border-border/50 flex-wrap">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="contabilidad">Contabilidad Mensual</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="setters">Pagos Setters</TabsTrigger>
          <TabsTrigger value="fijos">Costos Fijos</TabsTrigger>
          <TabsTrigger value="variables">Costos Variables</TabsTrigger>
        </TabsList>

        {/* Resumen Tab */}
        <TabsContent value="resumen" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Distribución de Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {expenseCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expenseCategories} innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                          {expenseCategories.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No hay gastos registrados
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Ingresos vs Gastos (12 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                      <Legend />
                      <Line type="monotone" dataKey="ingresos" stroke="hsl(var(--success))" strokeWidth={2} name="Ingresos" />
                      <Line type="monotone" dataKey="gastos" stroke="hsl(var(--destructive))" strokeWidth={2} name="Gastos" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clientes Tab */}
        <TabsContent value="clientes" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Pagado: <span className="font-bold text-success">${totalClientRevenue.toLocaleString()}</span>
              {' • '}
              Pendiente: <span className="font-bold text-warning">${totalPendingClientRevenue.toLocaleString()}</span>
            </p>
          </div>
          <Card className="bg-card border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tipo Pago</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Cuota</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map(client => {
                    const clientInsts = clientInstallments.filter(i => i.client_id === client.id);
                    const paid = clientInsts.filter(i => i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
                    const pending = clientInsts.filter(i => !i.paid).reduce((sum, i) => sum + Number(i.amount), 0);
                    const totalInsts = clientInsts.length;
                    const paidInsts = clientInsts.filter(i => i.paid).length;
                    const progress = totalInsts > 0 ? (paidInsts / totalInsts) * 100 : 0;
                    
                    return (
                      <TableRow key={client.id} className="border-border/50">
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs',
                            client.status === 'activo' ? 'bg-success/20 text-success border-success/30' :
                            client.status === 'pausado' ? 'bg-warning/20 text-warning border-warning/30' :
                            'bg-muted text-muted-foreground'
                          )}>
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{client.payment_type}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{paidInsts}/{totalInsts}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {clientInsts.length > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {clientInsts.map(i => `$${Number(i.amount).toLocaleString()}`).join(', ')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin cuotas</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{client.platform} ({client.platform_fee}%)</span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-success">${paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-warning">${pending.toLocaleString()}</TableCell>
                        <TableCell>
                          {/* Payment is now managed via Clientes page installments */}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {clients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No hay clientes registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contabilidad Mensual Tab */}
        <TabsContent value="contabilidad" className="space-y-4">
          {/* Month Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium min-w-[150px] text-center">
                {format(selectedMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={saveMonthlyAccounting} className="bg-primary">
              <Calendar className="h-4 w-4 mr-2" />
              Guardar Mes
            </Button>
          </div>

          {/* Monthly Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(() => {
              const monthStr = format(selectedMonth, 'yyyy-MM');
              const monthIncomes = incomes.filter(inc => inc.date?.startsWith(monthStr));
              const monthVariables = variableCosts.filter(vc => vc.date?.startsWith(monthStr));
              const totalMonthIncome = monthIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
              const totalMonthVariable = monthVariables.reduce((sum, c) => sum + Number(c.amount), 0);
              const totalMonthFixed = totalFixedCosts;
              const netProfit = totalMonthIncome - totalMonthFixed - totalMonthVariable;

              return (
                <>
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Ingresos del Mes</p>
                      <p className="text-2xl font-bold text-success">${totalMonthIncome.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Costos Fijos</p>
                      <p className="text-2xl font-bold text-destructive">${totalMonthFixed.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Costos Variables</p>
                      <p className="text-2xl font-bold text-destructive">${totalMonthVariable.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Beneficio Neto</p>
                      <p className={cn("text-2xl font-bold", netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                        ${netProfit.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </div>

          {/* Historical Monthly Data */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Historial Contable</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">C. Fijos</TableHead>
                    <TableHead className="text-right">C. Variables</TableHead>
                    <TableHead className="text-right">Beneficio Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyAccounting.map(m => (
                    <TableRow key={m.id} className="border-border/50">
                      <TableCell className="font-medium">
                        {format(new Date(m.year, m.month - 1), 'MMMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right text-success">${Number(m.total_income).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">${Number(m.total_fixed_costs).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">${Number(m.total_variable_costs).toLocaleString()}</TableCell>
                      <TableCell className={cn("text-right font-bold", Number(m.net_profit) >= 0 ? 'text-success' : 'text-destructive')}>
                        ${Number(m.net_profit).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {monthlyAccounting.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay registros de contabilidad mensual
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Monthly Chart */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Evolución Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyAccounting.slice().reverse().slice(-12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey={(d) => format(new Date(d.year, d.month - 1), 'MMM', { locale: es })} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12} 
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Bar dataKey="total_income" fill="hsl(var(--success))" name="Ingresos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net_profit" fill="hsl(var(--primary))" name="Beneficio" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costos Fijos Tab */}
        <TabsContent value="fijos" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Total mensual: <span className="font-bold text-foreground">${totalFixedCosts.toLocaleString()}</span></p>
            <Dialog open={dialogType === 'fixed'} onOpenChange={(open) => setDialogType(open ? 'fixed' : null)}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Agregar Costo Fijo</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Nuevo Costo Fijo</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Nombre *</Label><Input value={fixedForm.name} onChange={e => setFixedForm({ ...fixedForm, name: e.target.value })} className="bg-secondary/50" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Monto *</Label><Input type="number" value={fixedForm.amount} onChange={e => setFixedForm({ ...fixedForm, amount: e.target.value })} className="bg-secondary/50" /></div>
                    <div><Label>Frecuencia</Label>
                      <Select value={fixedForm.frequency} onValueChange={v => setFixedForm({ ...fixedForm, frequency: v })}>
                        <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensual">Mensual</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Categoría</Label><Input value={fixedForm.category} onChange={e => setFixedForm({ ...fixedForm, category: e.target.value })} className="bg-secondary/50" /></div>
                    <div><Label>Día de pago</Label><Input type="number" min="1" max="31" value={fixedForm.payment_date} onChange={e => setFixedForm({ ...fixedForm, payment_date: e.target.value })} className="bg-secondary/50" /></div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
                    <Button onClick={handleAddFixed} className="bg-primary">Agregar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="bg-card border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Frecuencia</TableHead>
                    <TableHead>Día de Pago</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedCosts.map(cost => (
                    <TableRow key={cost.id} className="border-border/50">
                      <TableCell className="font-medium">{cost.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{cost.category}</Badge></TableCell>
                      <TableCell className="capitalize">{cost.frequency}</TableCell>
                      <TableCell>Día {cost.payment_date}</TableCell>
                      <TableCell className="text-right font-medium">${Number(cost.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem('fixed_costs', cost.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {fixedCosts.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay costos fijos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costos Variables Tab */}
        <TabsContent value="variables" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">${totalVariableCosts.toLocaleString()}</span></p>
            <Dialog open={dialogType === 'variable'} onOpenChange={(open) => setDialogType(open ? 'variable' : null)}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Agregar Gasto</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Nuevo Gasto Variable</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Nombre *</Label><Input value={variableForm.name} onChange={e => setVariableForm({ ...variableForm, name: e.target.value })} className="bg-secondary/50" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Monto *</Label><Input type="number" value={variableForm.amount} onChange={e => setVariableForm({ ...variableForm, amount: e.target.value })} className="bg-secondary/50" /></div>
                    <div><Label>Fecha</Label><Input type="date" value={variableForm.date} onChange={e => setVariableForm({ ...variableForm, date: e.target.value })} className="bg-secondary/50" /></div>
                  </div>
                  <div><Label>Categoría</Label><Input value={variableForm.category} onChange={e => setVariableForm({ ...variableForm, category: e.target.value })} className="bg-secondary/50" /></div>
                  <div><Label>Descripción</Label><Input value={variableForm.description} onChange={e => setVariableForm({ ...variableForm, description: e.target.value })} className="bg-secondary/50" /></div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
                    <Button onClick={handleAddVariable} className="bg-primary">Agregar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="bg-card border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variableCosts.map(cost => (
                    <TableRow key={cost.id} className="border-border/50">
                      <TableCell className="font-medium">{cost.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{cost.category}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{cost.date}</TableCell>
                      <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">{cost.description}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">-${Number(cost.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem('variable_costs', cost.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {variableCosts.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay gastos variables</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movimientos Tab - Ingresos y Egresos */}
        <TabsContent value="movimientos" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Ingresos */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-success flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> Ingresos
                  </h3>
                  <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-success">${totalIncome.toLocaleString()}</span></p>
                </div>
                <Dialog open={dialogType === 'income'} onOpenChange={(open) => setDialogType(open ? 'income' : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-success hover:bg-success/90"><Plus className="h-4 w-4 mr-2" />Agregar</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle>Nuevo Ingreso</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div><Label>Fuente *</Label><Input value={incomeForm.source} onChange={e => setIncomeForm({ ...incomeForm, source: e.target.value })} className="bg-secondary/50" placeholder="Ej: Contrato Cliente X" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Monto *</Label><Input type="number" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} className="bg-secondary/50" /></div>
                        <div><Label>Fecha</Label><Input type="date" value={incomeForm.date} onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })} className="bg-secondary/50" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Tipo</Label>
                          <Select value={incomeForm.type} onValueChange={v => setIncomeForm({ ...incomeForm, type: v })}>
                            <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unico">Pago Único</SelectItem>
                              <SelectItem value="recurrente">Recurrente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Cliente (opcional)</Label>
                          <Select value={incomeForm.client_id || 'none'} onValueChange={v => setIncomeForm({ ...incomeForm, client_id: v === 'none' ? '' : v })}>
                            <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin cliente</SelectItem>
                              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Comprobante (opcional)</Label>
                        <Input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="bg-secondary/50 cursor-pointer"
                        />
                        {receiptFile && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Archivo: {receiptFile.name}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => { setDialogType(null); setReceiptFile(null); }}>Cancelar</Button>
                        <Button onClick={handleAddIncome} className="bg-success" disabled={uploadingReceipt}>
                          {uploadingReceipt ? 'Guardando...' : 'Agregar'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Card className="bg-card border-border/50">
                <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead>Fuente</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomes.map(income => (
                        <TableRow key={income.id} className="border-border/50">
                          <TableCell className="font-medium">
                            <span>{income.source}</span>
                            {income.type === 'recurrente' && (
                              <Badge variant="outline" className="ml-2 text-xs bg-info/20 text-info border-info/30">Rec</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{income.date}</TableCell>
                          <TableCell className="text-right font-medium text-success">+${Number(income.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItem('incomes', income.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {incomes.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay ingresos</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Columna Egresos */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" /> Egresos
                  </h3>
                  <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-destructive">${totalExpensesAmount.toLocaleString()}</span></p>
                </div>
                <Dialog open={dialogType === 'expense'} onOpenChange={(open) => setDialogType(open ? 'expense' : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-destructive hover:bg-destructive/90"><Plus className="h-4 w-4 mr-2" />Agregar</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle>Nuevo Egreso</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div><Label>Nombre *</Label><Input value={expenseForm.name} onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })} className="bg-secondary/50" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Monto *</Label><Input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="bg-secondary/50" /></div>
                        <div><Label>Fecha</Label><Input type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="bg-secondary/50" /></div>
                      </div>
                      <div><Label>Categoría</Label><Input value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="bg-secondary/50" /></div>
                      <div><Label>Descripción</Label><Input value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="bg-secondary/50" /></div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
                        <Button onClick={handleAddExpense} className="bg-destructive">Agregar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Card className="bg-card border-border/50">
                <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead>Concepto</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map(expense => (
                        <TableRow key={expense.id} className="border-border/50">
                          <TableCell className="font-medium">
                            <span>{expense.name}</span>
                            {expense.category && <Badge variant="outline" className="ml-2 text-xs">{expense.category}</Badge>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{expense.date}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">-${Number(expense.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItem('expenses', expense.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {expenses.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay egresos</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Pagos Setters Tab */}
        <TabsContent value="setters" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Total pagado a setters: <span className="font-bold text-foreground">${totalSetterPayments.toLocaleString()}</span>
              </p>
            </div>
            <Dialog open={dialogType === 'setter_payment'} onOpenChange={(open) => setDialogType(open ? 'setter_payment' : null)}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Registrar Pago</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Nuevo Pago a Setter</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Setter *</Label>
                    <Select value={setterPaymentForm.setter_id} onValueChange={v => setSetterPaymentForm({ ...setterPaymentForm, setter_id: v })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar setter" /></SelectTrigger>
                      <SelectContent>
                        {setters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Monto *</Label><Input type="number" value={setterPaymentForm.amount} onChange={e => setSetterPaymentForm({ ...setterPaymentForm, amount: e.target.value })} className="bg-secondary/50" /></div>
                    <div><Label>Fecha de Pago</Label><Input type="date" value={setterPaymentForm.payment_date} onChange={e => setSetterPaymentForm({ ...setterPaymentForm, payment_date: e.target.value })} className="bg-secondary/50" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Período Desde</Label><Input type="date" value={setterPaymentForm.period_start} onChange={e => setSetterPaymentForm({ ...setterPaymentForm, period_start: e.target.value })} className="bg-secondary/50" /></div>
                    <div><Label>Período Hasta</Label><Input type="date" value={setterPaymentForm.period_end} onChange={e => setSetterPaymentForm({ ...setterPaymentForm, period_end: e.target.value })} className="bg-secondary/50" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Cant. Reuniones</Label><Input type="number" value={setterPaymentForm.meetings_count} onChange={e => setSetterPaymentForm({ ...setterPaymentForm, meetings_count: e.target.value })} className="bg-secondary/50" placeholder="0" /></div>
                  </div>
                  <div><Label>Notas</Label><Input value={setterPaymentForm.notes} onChange={e => setSetterPaymentForm({ ...setterPaymentForm, notes: e.target.value })} className="bg-secondary/50" placeholder="Observaciones..." /></div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
                    <Button onClick={handleAddSetterPayment} className="bg-primary">Registrar Pago</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="bg-card border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Setter</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Reuniones</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setterPayments.map(payment => {
                    const setter = setters.find(s => s.id === payment.setter_id);
                    return (
                      <TableRow key={payment.id} className="border-border/50">
                        <TableCell className="font-medium">{setter?.name || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.payment_date}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {payment.period_start && payment.period_end 
                            ? `${payment.period_start} - ${payment.period_end}` 
                            : '-'}
                        </TableCell>
                        <TableCell>{payment.meetings_count || 0}</TableCell>
                        <TableCell className="text-muted-foreground text-sm truncate max-w-[150px]">{payment.notes || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">-${Number(payment.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem('setter_payments', payment.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {setterPayments.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay pagos registrados</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
