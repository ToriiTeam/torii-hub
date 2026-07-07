import type { Database } from '@/integrations/supabase/types';

// Re-exported straight from the generated Supabase types (see
// src/integrations/supabase/types.ts) rather than hand-duplicated, so
// schema changes can't silently drift out of sync with these — same
// pattern as `type Call = Database['public']['Tables']['client_closer_calls']['Row']`
// in Closers.tsx.
export type Income = Database['public']['Tables']['incomes']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];
export type Debt = Database['public']['Tables']['debts']['Row'];
export type FinanceTargets = Database['public']['Tables']['finance_targets']['Row'];
export type CashOpeningBalance = Database['public']['Tables']['cash_opening_balance']['Row'];

// The DB columns behind these are plain `text` with CHECK constraints, not
// Postgres enums, so the generated types only know `string | null`. These
// narrower literal unions exist for the app layer (Selects, exhaustiveness
// checks) — they mirror the CHECK constraints added in
// 20260707120000_finance_tracker_unification.sql exactly.
export type IncomeType = 'Cliente' | 'Aporte de capital' | 'Otro ingreso';
export type IncomeStatus = 'Paid' | 'Pending' | 'Overdue';
export type ExpenseCostType = 'CF' | 'CV';

export const INCOME_TYPES: IncomeType[] = ['Cliente', 'Aporte de capital', 'Otro ingreso'];
export const INCOME_STATUSES: IncomeStatus[] = ['Paid', 'Pending', 'Overdue'];
export const EXPENSE_COST_TYPES: ExpenseCostType[] = ['CF', 'CV'];
