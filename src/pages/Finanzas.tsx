import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStore } from '@/hooks/useStore';
import { initialFixedCosts, initialVariableCosts, initialIncomes, initialPayments } from '@/data/initialData';
import { FixedCost, VariableCost, Income, Payment } from '@/types/torii';
import { toast } from 'sonner';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  CreditCard,
  Wallet,
  AlertCircle,
  Edit2,
  Trash2,
  Check,
  Download
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#dc2626', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const cashflowData = [
  { month: 'Ene', flujo: 5000 },
  { month: 'Feb', flujo: 7500 },
  { month: 'Mar', flujo: 6200 },
  { month: 'Abr', flujo: 8100 },
  { month: 'May', flujo: 9500 },
  { month: 'Jun', flujo: 8800 },
  { month: 'Jul', flujo: 11000 },
  { month: 'Ago', flujo: 12500 },
  { month: 'Sep', flujo: 14000 },
  { month: 'Oct', flujo: 15500 },
  { month: 'Nov', flujo: 17000 },
  { month: 'Dic', flujo: 16000 },
];

export default function Finanzas() {
  const [fixedCosts, setFixedCosts] = useStore('gastos_fijos', initialFixedCosts);
  const [variableCosts, setVariableCosts] = useStore('gastos_variables', initialVariableCosts);
  const [incomes, setIncomes] = useStore('ingresos', initialIncomes);
  const [payments, setPayments] = useStore('pagos', initialPayments);
  
  const [activeTab, setActiveTab] = useState('resumen');
  const [dialogType, setDialogType] = useState<'fixed' | 'variable' | 'income' | 'payment' | null>(null);

  // Form states
  const [fixedForm, setFixedForm] = useState({ name: '', amount: '', frequency: 'mensual', category: '', paymentDate: '' });
  const [variableForm, setVariableForm] = useState({ name: '', amount: '', date: '', category: '', description: '' });
  const [incomeForm, setIncomeForm] = useState({ source: '', amount: '', date: '', type: 'unico' });
  const [paymentForm, setPaymentForm] = useState({ name: '', amount: '', dueDate: '', type: 'cobrar' });

  // Calculations
  const totalFixedCosts = fixedCosts.reduce((sum, c) => sum + c.amount, 0);
  const totalVariableCosts = variableCosts.reduce((sum, c) => sum + c.amount, 0);
  const totalExpenses = totalFixedCosts + totalVariableCosts;
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncome - totalExpenses;
  const pendingPayments = payments.filter(p => p.status === 'pendiente');
  const overduePayments = pendingPayments.filter(p => new Date(p.dueDate) < new Date());

  // Expense distribution for pie chart
  const expenseCategories = [...fixedCosts, ...variableCosts].reduce((acc, cost) => {
    const existing = acc.find(c => c.name === cost.category);
    if (existing) {
      existing.value += cost.amount;
    } else {
      acc.push({ name: cost.category, value: cost.amount });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const handleAddFixed = () => {
    if (!fixedForm.name || !fixedForm.amount) {
      toast.error('Complete los campos requeridos');
      return;
    }
    const newCost: FixedCost = {
      id: Date.now().toString(),
      name: fixedForm.name,
      amount: parseFloat(fixedForm.amount),
      frequency: fixedForm.frequency as 'mensual' | 'anual',
      category: fixedForm.category || 'General',
      paymentDate: parseInt(fixedForm.paymentDate) || 1,
    };
    setFixedCosts(prev => [...prev, newCost]);
    setFixedForm({ name: '', amount: '', frequency: 'mensual', category: '', paymentDate: '' });
    setDialogType(null);
    toast.success('Costo fijo agregado');
  };

  const handleAddVariable = () => {
    if (!variableForm.name || !variableForm.amount) {
      toast.error('Complete los campos requeridos');
      return;
    }
    const newCost: VariableCost = {
      id: Date.now().toString(),
      name: variableForm.name,
      amount: parseFloat(variableForm.amount),
      date: variableForm.date || new Date().toISOString().split('T')[0],
      category: variableForm.category || 'General',
      description: variableForm.description,
    };
    setVariableCosts(prev => [...prev, newCost]);
    setVariableForm({ name: '', amount: '', date: '', category: '', description: '' });
    setDialogType(null);
    toast.success('Gasto variable agregado');
  };

  const handleAddIncome = () => {
    if (!incomeForm.source || !incomeForm.amount) {
      toast.error('Complete los campos requeridos');
      return;
    }
    const newIncome: Income = {
      id: Date.now().toString(),
      source: incomeForm.source,
      amount: parseFloat(incomeForm.amount),
      date: incomeForm.date || new Date().toISOString().split('T')[0],
      type: incomeForm.type as 'unico' | 'recurrente',
    };
    setIncomes(prev => [...prev, newIncome]);
    setIncomeForm({ source: '', amount: '', date: '', type: 'unico' });
    setDialogType(null);
    toast.success('Ingreso registrado');
  };

  const handleAddPayment = () => {
    if (!paymentForm.name || !paymentForm.amount || !paymentForm.dueDate) {
      toast.error('Complete los campos requeridos');
      return;
    }
    const newPayment: Payment = {
      id: Date.now().toString(),
      name: paymentForm.name,
      amount: parseFloat(paymentForm.amount),
      dueDate: paymentForm.dueDate,
      status: 'pendiente',
      type: paymentForm.type as 'cobrar' | 'pagar',
    };
    setPayments(prev => [...prev, newPayment]);
    setPaymentForm({ name: '', amount: '', dueDate: '', type: 'cobrar' });
    setDialogType(null);
    toast.success('Pago agregado');
  };

  const markPaymentAsPaid = (id: string) => {
    setPayments(prev => prev.map(p => 
      p.id === id ? { ...p, status: 'pagado' as const, paidDate: new Date().toISOString().split('T')[0] } : p
    ));
    toast.success('Marcado como pagado');
  };

  const deleteItem = (type: string, id: string) => {
    if (type === 'fixed') setFixedCosts(prev => prev.filter(c => c.id !== id));
    if (type === 'variable') setVariableCosts(prev => prev.filter(c => c.id !== id));
    if (type === 'income') setIncomes(prev => prev.filter(i => i.id !== id));
    if (type === 'payment') setPayments(prev => prev.filter(p => p.id !== id));
    toast.success('Eliminado correctamente');
  };

  const exportData = () => {
    const data = { fixedCosts, variableCosts, incomes, payments, summary: { totalIncome, totalExpenses, balance } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-torii-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('Reporte exportado');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-muted-foreground">Control financiero de la agencia</p>
        </div>
        <Button onClick={exportData} variant="outline" className="border-border/50">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-success" />
              <Badge className="bg-success/20 text-success border-0">Ingresos</Badge>
            </div>
            <p className="text-2xl font-bold">${totalIncome.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total del mes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="h-8 w-8 text-destructive" />
              <Badge className="bg-destructive/20 text-destructive border-0">Gastos</Badge>
            </div>
            <p className="text-2xl font-bold">${totalExpenses.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total del mes</p>
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
        <Card className={cn("bg-card border-border/50", overduePayments.length > 0 && "border-destructive/50")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="h-8 w-8 text-warning" />
              {overduePayments.length > 0 && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
            <p className="text-2xl font-bold">{pendingPayments.length}</p>
            <p className="text-xs text-muted-foreground">Pagos pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="fijos">Costos Fijos</TabsTrigger>
          <TabsTrigger value="variables">Costos Variables</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
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
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseCategories}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {expenseCategories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Flujo de Caja (12 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashflowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Flujo']}
                      />
                      <Line type="monotone" dataKey="flujo" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent movements */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Movimientos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Concepto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...incomes.slice(-3).map(i => ({ ...i, type: 'ingreso' })), ...variableCosts.slice(-3).map(c => ({ ...c, type: 'gasto', source: c.name }))]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((item) => (
                    <TableRow key={item.id} className="border-border/50">
                      <TableCell className="font-medium">{item.type === 'ingreso' ? (item as Income).source : (item as VariableCost).name}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          'border-0 text-xs',
                          item.type === 'ingreso' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                        )}>
                          {item.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.date}</TableCell>
                      <TableCell className={cn('text-right font-medium', item.type === 'ingreso' ? 'text-success' : 'text-destructive')}>
                        {item.type === 'ingreso' ? '+' : '-'}${item.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costos Fijos Tab */}
        <TabsContent value="fijos" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Total mensual: <span className="font-bold text-foreground">${totalFixedCosts.toLocaleString()}</span></p>
            <Dialog open={dialogType === 'fixed'} onOpenChange={(open) => setDialogType(open ? 'fixed' : null)}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Costo Fijo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Nuevo Costo Fijo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={fixedForm.name} onChange={e => setFixedForm({ ...fixedForm, name: e.target.value })} className="bg-secondary/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monto *</Label>
                      <Input type="number" value={fixedForm.amount} onChange={e => setFixedForm({ ...fixedForm, amount: e.target.value })} className="bg-secondary/50" />
                    </div>
                    <div>
                      <Label>Frecuencia</Label>
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
                    <div>
                      <Label>Categoría</Label>
                      <Input value={fixedForm.category} onChange={e => setFixedForm({ ...fixedForm, category: e.target.value })} className="bg-secondary/50" />
                    </div>
                    <div>
                      <Label>Día de pago</Label>
                      <Input type="number" min="1" max="31" value={fixedForm.paymentDate} onChange={e => setFixedForm({ ...fixedForm, paymentDate: e.target.value })} className="bg-secondary/50" />
                    </div>
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
                      <TableCell>Día {cost.paymentDate}</TableCell>
                      <TableCell className="text-right font-medium">${cost.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem('fixed', cost.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Gasto
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Nuevo Gasto Variable</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={variableForm.name} onChange={e => setVariableForm({ ...variableForm, name: e.target.value })} className="bg-secondary/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monto *</Label>
                      <Input type="number" value={variableForm.amount} onChange={e => setVariableForm({ ...variableForm, amount: e.target.value })} className="bg-secondary/50" />
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" value={variableForm.date} onChange={e => setVariableForm({ ...variableForm, date: e.target.value })} className="bg-secondary/50" />
                    </div>
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Input value={variableForm.category} onChange={e => setVariableForm({ ...variableForm, category: e.target.value })} className="bg-secondary/50" />
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Input value={variableForm.description} onChange={e => setVariableForm({ ...variableForm, description: e.target.value })} className="bg-secondary/50" />
                  </div>
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
                      <TableCell className="text-right font-medium text-destructive">-${cost.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem('variable', cost.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ingresos Tab */}
        <TabsContent value="ingresos" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">${totalIncome.toLocaleString()}</span></p>
            <Dialog open={dialogType === 'income'} onOpenChange={(open) => setDialogType(open ? 'income' : null)}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Ingreso
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Nuevo Ingreso</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Fuente *</Label>
                    <Input value={incomeForm.source} onChange={e => setIncomeForm({ ...incomeForm, source: e.target.value })} className="bg-secondary/50" placeholder="Ej: Contrato Cliente X" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monto *</Label>
                      <Input type="number" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} className="bg-secondary/50" />
                    </div>
                    <div>
                      <Label>Fecha</Label>
                      <Input type="date" value={incomeForm.date} onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })} className="bg-secondary/50" />
                    </div>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={incomeForm.type} onValueChange={v => setIncomeForm({ ...incomeForm, type: v })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unico">Pago Único</SelectItem>
                        <SelectItem value="recurrente">Recurrente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
                    <Button onClick={handleAddIncome} className="bg-primary">Agregar</Button>
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
                    <TableHead>Fuente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomes.map(income => (
                    <TableRow key={income.id} className="border-border/50">
                      <TableCell className="font-medium">{income.source}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', income.type === 'recurrente' && 'bg-info/20 text-info border-info/30')}>
                          {income.type === 'recurrente' ? 'Recurrente' : 'Único'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{income.date}</TableCell>
                      <TableCell className="text-right font-medium text-success">+${income.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem('income', income.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pagos Tab */}
        <TabsContent value="pagos" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {overduePayments.length > 0 && <span className="text-destructive mr-2">⚠️ {overduePayments.length} vencidos</span>}
              {pendingPayments.length} pendientes
            </p>
            <Dialog open={dialogType === 'payment'} onOpenChange={(open) => setDialogType(open ? 'payment' : null)}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Pago
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Nuevo Pago</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Concepto *</Label>
                    <Input value={paymentForm.name} onChange={e => setPaymentForm({ ...paymentForm, name: e.target.value })} className="bg-secondary/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monto *</Label>
                      <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="bg-secondary/50" />
                    </div>
                    <div>
                      <Label>Fecha de vencimiento *</Label>
                      <Input type="date" value={paymentForm.dueDate} onChange={e => setPaymentForm({ ...paymentForm, dueDate: e.target.value })} className="bg-secondary/50" />
                    </div>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={paymentForm.type} onValueChange={v => setPaymentForm({ ...paymentForm, type: v })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cobrar">Por Cobrar</SelectItem>
                        <SelectItem value="pagar">Por Pagar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
                    <Button onClick={handleAddPayment} className="bg-primary">Agregar</Button>
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
                    <TableHead>Concepto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(payment => {
                    const isOverdue = payment.status === 'pendiente' && new Date(payment.dueDate) < new Date();
                    return (
                      <TableRow key={payment.id} className={cn("border-border/50", isOverdue && "bg-destructive/5")}>
                        <TableCell className="font-medium">{payment.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', payment.type === 'cobrar' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning')}>
                            {payment.type === 'cobrar' ? 'Por Cobrar' : 'Por Pagar'}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-muted-foreground", isOverdue && "text-destructive")}>{payment.dueDate}</TableCell>
                        <TableCell>
                          <Badge className={cn('border-0 text-xs', payment.status === 'pagado' ? 'bg-success/20 text-success' : isOverdue ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning')}>
                            {payment.status === 'pagado' ? 'Pagado' : isOverdue ? 'Vencido' : 'Pendiente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">${payment.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {payment.status === 'pendiente' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => markPaymentAsPaid(payment.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem('payment', payment.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
