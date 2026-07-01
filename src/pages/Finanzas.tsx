import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Plus,
  TrendingUp, TrendingDown, DollarSign, Clock, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_CATEGORIES = ['Equipo', 'Software', 'Licencias', 'Publicidad', 'Mentoría', 'Comisiones', 'Otros'];
const INCOME_TYPES    = ['Cliente', 'Aporte de capital', 'unico', 'recurrente'];
const FIXED_FREQS     = ['mensual', 'anual', 'trimestral', 'semestral'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  type: string | null;
  client_id: string | null;
  clients?: { name: string } | null;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string | null;
  description: string | null;
  cost_type: string | null;  // 'CF' | 'CV' | null
}

interface FixedCost {
  id: string;
  name: string;
  amount: number;
  frequency: string | null;
  category: string | null;
  payment_date: number | null;
}

interface Installment {
  id: string;
  client_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  clients?: { name: string } | null;
}

interface MonthlyAccounting {
  id?: string;
  year: number;
  month: number;
  total_income: number | null;
  total_fixed_costs: number | null;
  total_variable_costs: number | null;
  net_profit: number | null;
  notes: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number | null | undefined) {
  if (n == null) return '—';
  return `$${Math.round(n).toLocaleString('es')}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yy'); } catch { return d; }
}

function monthLabel(year: number, month: number) {
  return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es });
}

function monthBounds(year: number, month: number) {
  const d = new Date(year, month - 1, 1);
  return {
    since: format(startOfMonth(d), 'yyyy-MM-dd'),
    until: format(endOfMonth(d),   'yyyy-MM-dd'),
  };
}

function navMonth(year: number, month: number, dir: 'prev' | 'next') {
  if (dir === 'prev') return month === 1  ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return                      month === 12 ? { year: year + 1, month: 1  } : { year, month: month + 1 };
}

function monthlyEquiv(fc: FixedCost): number {
  const a = fc.amount ?? 0;
  if (!fc.frequency || fc.frequency === 'mensual')  return a;
  if (fc.frequency === 'anual')                      return a / 12;
  if (fc.frequency === 'trimestral')                 return a / 3;
  if (fc.frequency === 'semestral')                  return a / 6;
  return a;
}

function costTypeBadge(ct: string | null) {
  if (ct === 'CF') return <Badge className="text-xs border-0 bg-info/20 text-info">Fijo</Badge>;
  if (ct === 'CV') return <Badge className="text-xs border-0 bg-warning/20 text-warning">Variable</Badge>;
  return <span className="text-muted-foreground text-xs">—</span>;
}

// ─── FieldRow helper ─────────────────────────────────────────────────────────

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ─── CategorySelect ───────────────────────────────────────────────────────────
// Select with existing categories + "Otra…" that reveals a free-text input

function CategorySelect({
  value, onChange, knownCategories,
}: {
  value: string; onChange: (v: string) => void; knownCategories: string[];
}) {
  const [custom, setCustom] = useState('');
  const isCustom = value === '__custom__' || (value !== '' && !knownCategories.includes(value) && !BASE_CATEGORIES.includes(value));
  const allOpts  = [...new Set([...BASE_CATEGORIES, ...knownCategories])].sort();

  function handleSelect(v: string) {
    if (v === '__custom__') { onChange('__custom__'); return; }
    onChange(v);
  }
  function commitCustom() {
    const t = custom.trim();
    if (t) { onChange(t); setCustom(''); }
  }

  if (isCustom) {
    return (
      <div className="flex gap-2">
        <Input
          value={custom || (value !== '__custom__' ? value : '')}
          onChange={e => { setCustom(e.target.value); onChange(e.target.value); }}
          placeholder="Nueva categoría…"
          className="bg-secondary/50 h-9 text-sm"
          onKeyDown={e => e.key === 'Enter' && commitCustom()}
        />
        <Button variant="ghost" size="sm" className="shrink-0 h-9 text-xs"
          onClick={() => { onChange(''); setCustom(''); }}>↩</Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleSelect}>
      <SelectTrigger className="bg-secondary/50 h-9 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="">—</SelectItem>
        {allOpts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        <SelectItem value="__custom__" className="text-muted-foreground text-xs italic">
          Escribir nueva…
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── AddIncomeDialog ──────────────────────────────────────────────────────────

function AddIncomeDialog({ clients, defaultDate, onClose, onSaved }: {
  clients: { id: string; name: string }[];
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    source: '', amount: '', date: defaultDate, type: '', client_id: '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.source.trim() || !form.amount) { toast.error('Fuente y monto requeridos'); return; }
    setSaving(true);
    const { error } = await supabase.from('incomes').insert({
      source:    form.source.trim(),
      amount:    parseFloat(form.amount),
      date:      form.date,
      type:      form.type      || null,
      client_id: form.client_id || null,
    });
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Ingreso registrado');
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Nuevo Ingreso</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2">
            <F label="Fuente / Descripción *">
              <Input value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                className="bg-secondary/50" placeholder="ej. Pago cuota — Juan Pérez" />
            </F>
          </div>
          <F label="Monto (USD) *">
            <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              className="bg-secondary/50" placeholder="0" />
          </F>
          <F label="Fecha">
            <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="bg-secondary/50 h-9" />
          </F>
          <F label="Tipo">
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger className="bg-secondary/50 h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {INCOME_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Cliente (opcional)">
            <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
              <SelectTrigger className="bg-secondary/50 h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-primary">
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AddEgresoDialog ──────────────────────────────────────────────────────────

function AddEgresoDialog({ defaultDate, knownCategories, onClose, onSaved }: {
  defaultDate: string; knownCategories: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '', amount: '', date: defaultDate, category: '', description: '', cost_type: '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim() || !form.amount) { toast.error('Nombre y monto requeridos'); return; }
    const category = form.category === '__custom__' ? '' : form.category;
    setSaving(true);
    const { error } = await supabase.from('expenses').insert({
      name:        form.name.trim(),
      amount:      parseFloat(form.amount),
      date:        form.date,
      category:    category    || null,
      description: form.description || null,
      cost_type:   form.cost_type   || null,
    });
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Gasto registrado');
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader><DialogTitle>Nuevo Gasto</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2">
            <F label="Nombre / Concepto *">
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="bg-secondary/50" placeholder="ej. Suscripción HubSpot" />
            </F>
          </div>
          <F label="Monto (USD) *">
            <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              className="bg-secondary/50" placeholder="0" />
          </F>
          <F label="Fecha">
            <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="bg-secondary/50 h-9" />
          </F>
          <F label="Categoría">
            <CategorySelect
              value={form.category}
              onChange={v => setForm(p => ({ ...p, category: v }))}
              knownCategories={knownCategories}
            />
          </F>
          <F label="Tipo de costo">
            <Select value={form.cost_type} onValueChange={v => setForm(p => ({ ...p, cost_type: v }))}>
              <SelectTrigger className="bg-secondary/50 h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                <SelectItem value="CF">Fijo (CF)</SelectItem>
                <SelectItem value="CV">Variable (CV)</SelectItem>
              </SelectContent>
            </Select>
          </F>
          <div className="col-span-2">
            <F label="Descripción">
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="bg-secondary/50" placeholder="Detalle opcional" />
            </F>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-primary">
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AddFixedCostDialog ───────────────────────────────────────────────────────

function AddFixedCostDialog({ knownCategories, onClose, onSaved }: {
  knownCategories: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: '', amount: '', frequency: 'mensual', category: '', payment_date: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim() || !form.amount) { toast.error('Nombre y monto requeridos'); return; }
    setSaving(true);
    const { error } = await supabase.from('fixed_costs').insert({
      name:         form.name.trim(),
      amount:       parseFloat(form.amount),
      frequency:    form.frequency     || null,
      category:     form.category      || null,
      payment_date: form.payment_date ? parseInt(form.payment_date) : null,
    });
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Costo fijo agregado');
    onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader><DialogTitle>Nuevo Costo Fijo (catálogo)</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <F label="Nombre *">
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-secondary/50" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Monto (USD) *">
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="bg-secondary/50" />
            </F>
            <F label="Día de pago">
              <Input type="number" min={1} max={31} value={form.payment_date}
                onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))}
                className="bg-secondary/50" placeholder="ej. 1" />
            </F>
            <F label="Frecuencia">
              <Select value={form.frequency} onValueChange={v => setForm(p => ({ ...p, frequency: v }))}>
                <SelectTrigger className="bg-secondary/50 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIXED_FREQS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Categoría">
              <CategorySelect
                value={form.category}
                onChange={v => setForm(p => ({ ...p, category: v }))}
                knownCategories={knownCategories}
              />
            </F>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-primary">
            {saving ? 'Guardando…' : 'Agregar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Finanzas() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [incomes,        setIncomes]        = useState<Income[]>([]);
  const [expenses,       setExpenses]       = useState<Expense[]>([]);
  const [fixedCosts,     setFixedCosts]     = useState<FixedCost[]>([]);
  const [installments,   setInstallments]   = useState<Installment[]>([]);
  const [accounting,     setAccounting]     = useState<MonthlyAccounting | null>(null);
  const [clients,        setClients]        = useState<{ id: string; name: string }[]>([]);
  const [allCategories,  setAllCategories]  = useState<string[]>([]);

  const [loading,          setLoading]          = useState(true);
  const [incomeTypeFilter, setIncomeTypeFilter] = useState('all');
  const [addingIncome,     setAddingIncome]     = useState(false);
  const [addingEgreso,     setAddingEgreso]     = useState(false);
  const [addingFixedCost,  setAddingFixedCost]  = useState(false);
  const [savingAcc,        setSavingAcc]        = useState(false);
  const [accNotes,         setAccNotes]         = useState('');

  const { since, until } = monthBounds(year, month);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [iRes, eRes, fcRes, instRes, accRes, cRes, catRes] = await Promise.all([
      supabase.from('incomes').select('*, clients(name)').gte('date', since).lte('date', until).order('date', { ascending: false }),
      supabase.from('expenses').select('*').gte('date', since).lte('date', until).order('date', { ascending: false }),
      supabase.from('fixed_costs').select('*').order('name'),
      supabase.from('client_installments').select('*, clients(name)').eq('paid', false).order('due_date'),
      supabase.from('monthly_accounting').select('*').eq('year', year).eq('month', month).maybeSingle(),
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('expenses').select('category').not('category', 'is', null),
    ]);
    if (iRes.data)   setIncomes(iRes.data as Income[]);
    if (eRes.data)   setExpenses(eRes.data as Expense[]);
    if (fcRes.data)  setFixedCosts(fcRes.data as FixedCost[]);
    if (instRes.data) setInstallments(instRes.data as Installment[]);
    if (accRes.data) { setAccounting(accRes.data); setAccNotes(accRes.data.notes ?? ''); }
    else             { setAccounting(null); setAccNotes(''); }
    if (cRes.data)   setClients(cRes.data);
    if (catRes.data) {
      const distinct = [...new Set(catRes.data.map((r: { category: string }) => r.category).filter(Boolean))] as string[];
      setAllCategories(distinct);
    }
    setLoading(false);
  }, [since, until, year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function nav(dir: 'prev' | 'next') {
    const { year: y, month: m } = navMonth(year, month, dir);
    setYear(y); setMonth(m);
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const totalIncome = incomes.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalCF     = expenses.filter(e => e.cost_type === 'CF').reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalCV     = expenses.filter(e => e.cost_type === 'CV').reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalEgresos = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const profit       = totalIncome - totalEgresos;
  const pendingAR    = installments.reduce((s, i) => s + (i.amount ?? 0), 0);
  const totalFixedCatalog = fixedCosts.reduce((s, f) => s + monthlyEquiv(f), 0);

  // Category breakdown (all expenses for month, grouped)
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category ?? 'Sin categoría';
      map[cat] = (map[cat] ?? 0) + (e.amount ?? 0);
    });
    return Object.entries(map)
      .map(([cat, amt]) => ({ cat, amt }))
      .sort((a, b) => b.amt - a.amt);
  }, [expenses]);

  // Filtered incomes
  const filteredIncomes = incomeTypeFilter === 'all'
    ? incomes
    : incomes.filter(i => i.type === incomeTypeFilter);

  const incomeTypes = [...new Set(incomes.map(i => i.type).filter(Boolean))] as string[];

  // Deletes
  async function deleteIncome(id: string) {
    await supabase.from('incomes').delete().eq('id', id);
    toast.success('Eliminado'); fetchData();
  }
  async function deleteExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id);
    toast.success('Eliminado'); fetchData();
  }
  async function deleteFixedCost(id: string) {
    await supabase.from('fixed_costs').delete().eq('id', id);
    toast.success('Eliminado'); fetchData();
  }

  async function saveAccounting() {
    setSavingAcc(true);
    const payload = {
      year, month,
      total_income:         totalIncome,
      total_fixed_costs:    totalCF,
      total_variable_costs: totalCV,
      net_profit:           profit,
      notes:                accNotes || null,
    };
    const { error } = accounting?.id
      ? await supabase.from('monthly_accounting').update(payload).eq('id', accounting.id)
      : await supabase.from('monthly_accounting').insert(payload);
    setSavingAcc(false);
    if (error) { toast.error('Error al guardar resumen'); return; }
    toast.success('Resumen guardado'); fetchData();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header + Month Nav ── */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel(year, month)}</p>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3 min-w-[140px] text-center capitalize">
            {monthLabel(year, month)}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <p className="text-xl font-bold text-success">{fmtUSD(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">{incomes.length} trans.</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Costos Fijos (CF)</p>
              <TrendingDown className="h-4 w-4 text-info" />
            </div>
            <p className="text-xl font-bold text-destructive">{fmtUSD(totalCF)}</p>
            <p className="text-xs text-muted-foreground mt-1">catálogo: {fmtUSD(totalFixedCatalog)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Costos Variables (CV)</p>
              <TrendingDown className="h-4 w-4 text-warning" />
            </div>
            <p className="text-xl font-bold text-destructive">{fmtUSD(totalCV)}</p>
            <p className="text-xs text-muted-foreground mt-1">total egresos: {fmtUSD(totalEgresos)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Profit neto</p>
              <DollarSign className={cn('h-4 w-4', profit >= 0 ? 'text-success' : 'text-destructive')} />
            </div>
            <p className={cn('text-xl font-bold', profit >= 0 ? 'text-success' : 'text-destructive')}>
              {fmtUSD(profit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalIncome > 0 ? `${Math.round((profit / totalIncome) * 100)}% margen` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Cuentas por cobrar</p>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <p className={cn('text-xl font-bold', pendingAR > 0 ? 'text-warning' : 'text-muted-foreground')}>
              {fmtUSD(pendingAR)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {installments.length > 0 ? `${installments.length} cuotas` : 'sin cuotas registradas'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Ingresos + Egresos ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Ingresos */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos ({filteredIncomes.length}) · {fmtUSD(totalIncome)}
              </CardTitle>
              <Select value={incomeTypeFilter} onValueChange={setIncomeTypeFilter}>
                <SelectTrigger className="w-28 h-7 bg-secondary/50 text-xs ml-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {incomeTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setAddingIncome(true)} className="bg-primary h-7 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" />Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Fuente</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs text-right">Monto</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncomes.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm font-medium">{i.source}</TableCell>
                    <TableCell>
                      {i.type
                        ? <Badge className="text-xs border-0 bg-secondary text-foreground">{i.type}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(i.clients as { name: string } | null)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium text-success">{fmtUSD(i.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(i.date)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/50 hover:text-destructive"
                        onClick={() => deleteIncome(i.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredIncomes.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">Sin ingresos este mes</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Egresos — todos los expenses del mes */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Egresos ({expenses.length}) · {fmtUSD(totalEgresos)}
              </CardTitle>
              <Button size="sm" onClick={() => setAddingEgreso(true)} className="bg-primary h-7 text-xs px-2 ml-auto">
                <Plus className="h-3 w-3 mr-1" />Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Concepto</TableHead>
                  <TableHead className="text-xs">Categoría</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-right">Monto</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm font-medium">
                      {e.name}
                      {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.category ?? '—'}</TableCell>
                    <TableCell>{costTypeBadge(e.cost_type)}</TableCell>
                    <TableCell className="text-sm text-right font-medium text-destructive">{fmtUSD(e.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(e.date)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/50 hover:text-destructive"
                        onClick={() => deleteExpense(e.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">Sin egresos este mes</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Desglose por Categoría ── */}
      {categoryBreakdown.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Desglose por Categoría — egresos del mes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Categoría</TableHead>
                  <TableHead className="text-xs text-right">Monto</TableHead>
                  <TableHead className="text-xs text-right">% del total</TableHead>
                  <TableHead className="text-xs">Barra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryBreakdown.map(({ cat, amt }) => {
                  const pctVal = totalEgresos > 0 ? (amt / totalEgresos) * 100 : 0;
                  return (
                    <TableRow key={cat}>
                      <TableCell className="text-sm font-medium">{cat}</TableCell>
                      <TableCell className="text-sm text-right">{fmtUSD(amt)}</TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground">
                        {pctVal.toFixed(1)}%
                      </TableCell>
                      <TableCell className="w-48">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all"
                            style={{ width: `${pctVal}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 font-semibold bg-secondary/20">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{fmtUSD(totalEgresos)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">100%</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Costos Fijos — catálogo de referencia ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Costos Fijos — catálogo de referencia
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Referencia de costos recurrentes esperados · {fmtUSD(totalFixedCatalog)}/mes estimado
              </p>
            </div>
            <Button size="sm" onClick={() => setAddingFixedCost(true)} className="bg-primary h-7 text-xs px-2 ml-auto">
              <Plus className="h-3 w-3 mr-1" />Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nombre</TableHead>
                <TableHead className="text-xs">Categoría</TableHead>
                <TableHead className="text-xs">Frecuencia</TableHead>
                <TableHead className="text-xs">Día de pago</TableHead>
                <TableHead className="text-xs text-right">Monto</TableHead>
                <TableHead className="text-xs text-right">Equiv. mensual</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fixedCosts.map(fc => (
                <TableRow key={fc.id}>
                  <TableCell className="text-sm font-medium">{fc.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fc.category ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">{fc.frequency ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fc.payment_date ? `Día ${fc.payment_date}` : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-right">{fmtUSD(fc.amount)}</TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">{fmtUSD(monthlyEquiv(fc))}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/50 hover:text-destructive"
                      onClick={() => deleteFixedCost(fc.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {fixedCosts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                    Sin costos fijos cargados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Cuentas por Cobrar ── */}
      {installments.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cuentas por Cobrar · {installments.length} cuotas · {fmtUSD(pendingAR)} pendiente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs text-center">Cuota</TableHead>
                  <TableHead className="text-xs text-right">Monto</TableHead>
                  <TableHead className="text-xs">Vencimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map(inst => (
                  <TableRow key={inst.id}>
                    <TableCell className="text-sm font-medium">
                      {(inst.clients as { name: string } | null)?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-center text-sm">#{inst.installment_number}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmtUSD(inst.amount)}</TableCell>
                    <TableCell className="text-xs text-warning">{fmtDate(inst.due_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Resumen mensual ── */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Resumen Mensual{accounting ? ' · guardado' : ' · sin guardar'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Ingresos',        value: accounting?.total_income         ?? totalIncome,   cls: 'text-success' },
              { label: 'Costos fijos',    value: accounting?.total_fixed_costs    ?? totalCF,       cls: 'text-destructive' },
              { label: 'Costos variables',value: accounting?.total_variable_costs ?? totalCV,       cls: 'text-destructive' },
              { label: 'Profit neto',     value: accounting?.net_profit           ?? profit,
                cls: (accounting?.net_profit ?? profit) >= 0 ? 'text-success' : 'text-destructive' },
            ].map(r => (
              <div key={r.label} className="bg-secondary/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">{r.label}</p>
                <p className={cn('text-lg font-bold', r.cls)}>{fmtUSD(r.value)}</p>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Notas del mes</Label>
              <Textarea
                rows={2}
                value={accNotes}
                onChange={e => setAccNotes(e.target.value)}
                className="bg-secondary/50 text-sm resize-none"
                placeholder="Observaciones, contexto, decisiones del mes…"
              />
            </div>
            <Button onClick={saveAccounting} disabled={savingAcc} className="bg-primary shrink-0">
              {savingAcc ? 'Guardando…' : accounting ? 'Actualizar resumen' : 'Guardar resumen'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}
      {addingIncome && (
        <AddIncomeDialog
          clients={clients}
          defaultDate={since}
          onClose={() => setAddingIncome(false)}
          onSaved={fetchData}
        />
      )}
      {addingEgreso && (
        <AddEgresoDialog
          defaultDate={since}
          knownCategories={allCategories}
          onClose={() => setAddingEgreso(false)}
          onSaved={fetchData}
        />
      )}
      {addingFixedCost && (
        <AddFixedCostDialog
          knownCategories={allCategories}
          onClose={() => setAddingFixedCost(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
