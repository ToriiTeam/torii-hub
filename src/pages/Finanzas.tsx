import { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff } from 'lucide-react';
import { PeriodSelector } from '@/features/executive-dashboard/components/shared/PeriodSelector';
import { getPeriodRange, type PeriodType, type PresetKey } from '@/features/executive-dashboard/lib/periodRange';
import { SensitiveDataProvider, useSensitiveData } from '@/features/meta-ads/context/SensitiveDataContext';
import { getPeriodBounds } from '@/features/finanzas/lib/periodBounds';
import type { CashOpeningBalance, Debt, Expense, FinanceTargets, Income } from '@/features/finanzas/lib/types';
import type { ClientRow, InstallmentWithClient } from '@/components/finanzas/types';
import TabDashboard from '@/components/finanzas/TabDashboard';
import TabResultado from '@/components/finanzas/TabResultado';
import TabBalance from '@/components/finanzas/TabBalance';
import TabMetricas from '@/components/finanzas/TabMetricas';
import TabIngresos from '@/components/finanzas/TabIngresos';
import TabEgresos from '@/components/finanzas/TabEgresos';

const TABS = [
  { value: 'dashboard', label: '🏠 Dashboard', Component: TabDashboard },
  { value: 'resultado', label: '📈 Resultado', Component: TabResultado },
  { value: 'balance', label: '⚖️ Balance', Component: TabBalance },
  { value: 'metricas', label: '📊 Métricas', Component: TabMetricas },
  { value: 'ingresos', label: '💰 Ingresos', Component: TabIngresos },
  { value: 'egresos', label: '💸 Egresos', Component: TabEgresos },
];

// Same shape/behavior as ExecutiveDashboard.tsx's navMonth — reused
// verbatim rather than reinvented.
function navMonth(year: number, month: number, dir: 'prev' | 'next'): { year: number; month: number } {
  if (dir === 'prev') return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export default function Finanzas() {
  return (
    <SensitiveDataProvider>
      <FinanzasContent />
    </SensitiveDataProvider>
  );
}

function FinanzasContent() {
  const { isHidden, toggle } = useSensitiveData();
  const now = new Date();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Same PeriodSelector state shape as ExecutiveDashboard.tsx, but
  // defaulting to preset 'all' ("Todo") instead of '30d'.
  const [periodType, setPeriodType] = useState<PeriodType>('preset');
  const [preset, setPreset] = useState<PresetKey>('all');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [customSince, setCustomSince] = useState(() => now.toISOString().slice(0, 10));
  const [customUntil, setCustomUntil] = useState(() => now.toISOString().slice(0, 10));

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [installments, setInstallments] = useState<InstallmentWithClient[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [financeTargets, setFinanceTargets] = useState<FinanceTargets | null>(null);
  const [openingBalance, setOpeningBalance] = useState<CashOpeningBalance | null>(null);
  const [loading, setLoading] = useState(true);

  // Full datasets, loaded once — every tab filters/aggregates against
  // these client-side using periodBounds, per the pure-function design in
  // features/finanzas/lib (Paso A). No per-tab fetching, no re-fetching on
  // period navigation.
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [
      incomesRes, expensesRes, clientsRes, installmentsRes,
      debtsRes, targetsRes, openingRes,
    ] = await Promise.all([
      supabase.from('incomes').select('*').order('date', { ascending: false }),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('clients').select('*').order('name'),
      supabase.from('client_installments').select('*, clients(name)').order('due_date'),
      supabase.from('debts').select('*').order('due_date'),
      supabase.from('finance_targets').select('*').limit(1).maybeSingle(),
      supabase.from('cash_opening_balance').select('*').limit(1).maybeSingle(),
    ]);

    if (incomesRes.data) setIncomes(incomesRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (installmentsRes.data) setInstallments(installmentsRes.data as InstallmentWithClient[]);
    if (debtsRes.data) setDebts(debtsRes.data);
    if (targetsRes.data) setFinanceTargets(targetsRes.data);
    if (openingRes.data) setOpeningBalance(openingRes.data);

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const periodInput = { periodType, preset, year, month, customSince, customUntil };
  const periodBounds = useMemo(() => getPeriodBounds(periodInput), [periodType, preset, year, month, customSince, customUntil]);
  const monthLabel = useMemo(() => getPeriodRange(periodInput).label, [periodType, preset, year, month, customSince, customUntil]);

  const tabProps = {
    periodBounds,
    periodType,
    preset,
    incomes,
    expenses,
    clients,
    installments,
    debts,
    financeTargets,
    openingBalance,
    loading,
    refetch: fetchData,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header + Period Selector ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-sm text-muted-foreground">{periodBounds.periodLabel}</p>
        </div>
        <Button variant="outline" size="sm" onClick={toggle} title={isHidden ? 'Mostrar datos sensibles' : 'Ocultar datos sensibles'}>
          {isHidden ? <Eye className="h-4 w-4 mr-1.5" /> : <EyeOff className="h-4 w-4 mr-1.5" />}
          {isHidden ? 'Mostrar' : 'Ocultar'}
        </Button>
      </div>

      <PeriodSelector
        periodType={periodType}
        preset={preset}
        monthLabel={monthLabel}
        customSince={customSince}
        customUntil={customUntil}
        onPresetChange={(p) => { setPeriodType('preset'); setPreset(p); }}
        onModeChange={setPeriodType}
        onNavMonth={(dir) => { const n = navMonth(year, month, dir); setYear(n.year); setMonth(n.month); }}
        onCustomChange={(since, until) => { setCustomSince(since); setCustomUntil(until); }}
      />

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ value, Component }) => (
          <TabsContent key={value} value={value}>
            <Component {...tabProps} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
