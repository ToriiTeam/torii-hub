import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
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

export default function Finanzas() {
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState('dashboard');

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
  // month navigation.
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

  const periodBounds = useMemo(() => getPeriodBounds(activeMonth), [activeMonth]);

  function navMonth(dir: 'prev' | 'next') {
    setActiveMonth((prev) => (dir === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)));
  }

  const tabProps = {
    activeMonth,
    periodBounds,
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
      {/* ── Header + Month Nav ── */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-sm text-muted-foreground capitalize">{format(activeMonth, 'MMMM yyyy', { locale: es })}</p>
        </div>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3 min-w-[140px] text-center capitalize">
            {format(activeMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
