import type { Database } from '@/integrations/supabase/types';
import type { PeriodBounds } from '@/features/finanzas/lib/periodBounds';
import type { CashOpeningBalance, Debt, Expense, FinanceTargets, Income } from '@/features/finanzas/lib/types';

// Not part of Paso A's domain types (those only covered
// Income/Expense/Debt/FinanceTargets/CashOpeningBalance) — added here since
// they're specific to what the Finanzas tabs need, following the same
// "alias straight from Database[...]['Row']" convention.
export type ClientRow = Database['public']['Tables']['clients']['Row'];
export type ClientInstallmentRow = Database['public']['Tables']['client_installments']['Row'];

// client_installments joined with the client's name for display — the
// join isn't part of the base Row type, so it's a separate shape rather
// than bolted onto ClientInstallmentRow.
export interface InstallmentWithClient extends ClientInstallmentRow {
  clients: { name: string } | null;
}

// Shared prop contract for all 6 Finanzas tabs. Finanzas.tsx owns every
// fetch; tabs only ever read from these props and call `refetch` after a
// CRUD action — no tab does its own supabase calls for the datasets listed
// here.
export interface FinanzasTabProps {
  activeMonth: Date;
  periodBounds: PeriodBounds;

  incomes: Income[];
  expenses: Expense[];
  clients: ClientRow[];
  installments: InstallmentWithClient[];
  debts: Debt[];
  financeTargets: FinanceTargets | null;
  openingBalance: CashOpeningBalance | null;

  loading: boolean;
  refetch: () => Promise<void>;
}
