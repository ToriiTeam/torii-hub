-- ─── 1. Unify fixed_costs + variable_costs into expenses ────────────────────
-- expenses.cost_type already exists (untyped, partially backfilled: 23 'CF',
-- 46 'CV', 27 NULL from a prior manual import). Constraint allows NULL —
-- the 27 unclassified rows stay unclassified rather than guessing CF vs CV.
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_cost_type_check CHECK (cost_type IS NULL OR cost_type IN ('CF', 'CV'));

-- fixed_costs/variable_costs are both empty today, so these backfills are
-- no-ops in practice — but written to be correct and idempotent in any
-- environment where they aren't, per "sin duplicar ni perder nada".
-- Synthesized sheet_row_id ('fixed_costs:<id>' / 'variable_costs:<id>')
-- lets ON CONFLICT guard against double-running this migration, since
-- neither source table has its own natural dedupe key.

-- fixed_costs has no `date` column (only `payment_date`, the day-of-month
-- it's charged) — backfilled rows land on that day in the current month.
INSERT INTO public.expenses (name, amount, date, category, description, cost_type, sheet_row_id)
SELECT
  fc.name,
  fc.amount,
  make_date(
    EXTRACT(YEAR FROM CURRENT_DATE)::int,
    EXTRACT(MONTH FROM CURRENT_DATE)::int,
    LEAST(COALESCE(fc.payment_date, 1), 28)
  ),
  fc.category,
  'Frecuencia: ' || COALESCE(fc.frequency, 'mensual'),
  'CF',
  'fixed_costs:' || fc.id::text
FROM public.fixed_costs fc
ON CONFLICT (sheet_row_id) DO NOTHING;

INSERT INTO public.expenses (name, amount, date, category, description, cost_type, sheet_row_id)
SELECT
  vc.name,
  vc.amount,
  vc.date,
  vc.category,
  vc.description,
  'CV',
  'variable_costs:' || vc.id::text
FROM public.variable_costs vc
ON CONFLICT (sheet_row_id) DO NOTHING;

-- fixed_costs/variable_costs are NOT dropped — kept as read-only legacy
-- tables per instructions, just no longer written to going forward.

-- ─── 2. incomes: new columns + normalized `type` ─────────────────────────────
ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Paid',
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS installment_number integer,
  ADD COLUMN IF NOT EXISTS total_installments integer,
  ADD COLUMN IF NOT EXISTS fee_percent numeric,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.incomes
  ADD CONSTRAINT incomes_status_check CHECK (status IN ('Paid', 'Pending', 'Overdue'));

-- Normalize the 5 existing values down to the 3 the tracker uses.
-- 'unico' (8 rows) and 'recurrente' (3 rows) don't map cleanly to 'Cliente'
-- (client_id is null on every row, so there's no way to confirm they're
-- client payments) — bucketed into 'Otro ingreso' instead of guessing.
UPDATE public.incomes SET type = 'Otro ingreso' WHERE type IN ('unico', 'recurrente');

ALTER TABLE public.incomes ALTER COLUMN type SET DEFAULT 'Cliente';
ALTER TABLE public.incomes
  ADD CONSTRAINT incomes_type_check CHECK (type IN ('Cliente', 'Aporte de capital', 'Otro ingreso'));

-- ─── 3. debts (Balance sheet — DEUDA / CUENTAS POR PAGAR) ────────────────────
CREATE TABLE public.debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creditor TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE,
  note TEXT,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for all users"
ON public.debts
FOR ALL
USING (true)
WITH CHECK (true);

-- ─── 4. finance_targets (Métricas sheet manual inputs) ───────────────────────
CREATE TABLE public.finance_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_margin NUMERIC,
  target_mrr NUMERIC,
  target_clients INTEGER,
  current_mrr NUMERIC,
  current_active_clients INTEGER,
  new_clients_ytd INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for all users"
ON public.finance_targets
FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO public.finance_targets
  (target_margin, target_mrr, target_clients, current_mrr, current_active_clients, new_clients_ytd)
VALUES (0, 0, 0, 0, 0, 0);

-- ─── 5. cash_opening_balance (Balance sheet cash reconciliation) ─────────────
CREATE TABLE public.cash_opening_balance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL DEFAULT 0,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_opening_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for all users"
ON public.cash_opening_balance
FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO public.cash_opening_balance (amount, as_of_date) VALUES (0, CURRENT_DATE);
