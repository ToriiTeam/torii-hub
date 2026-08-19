-- Egresos: agregar client_id opcional para poder calcular costo de entrega
-- por cliente más adelante. NULL = "cliente compartido / gasto general"
-- (equipo, software, adquisición general, etc. que no es de un cliente
-- puntual) — no hace falta un booleano/enum aparte, NULL ya representa
-- ese caso sin ambigüedad.
alter table public.expenses
  add column client_id uuid references public.clients(id) on delete set null;

create index if not exists idx_expenses_client_id on public.expenses(client_id);
