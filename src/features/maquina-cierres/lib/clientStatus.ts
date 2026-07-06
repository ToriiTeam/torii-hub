import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import type { GhlContactSummary, McClientOps, McClientRow, McClientStatus } from '../types';

const ACCESS_DAYS = 60;
const POR_VENCER_THRESHOLD_DAYS = 7;

// Stripe has no concept of a "subscription" here — it's a one-time charge,
// and the 60-day access window is purely our own business rule layered on
// top of sv_fecha_ultima_compra (set/updated in GHL on every purchase or
// renewal). This is the only place that rule is computed.
export function computeVencimiento(fechaUltimaCompra: string | null): { fechaVencimiento: string | null; status: McClientStatus | null } {
  if (!fechaUltimaCompra) return { fechaVencimiento: null, status: null };

  let compra: Date;
  try {
    compra = parseISO(fechaUltimaCompra);
  } catch {
    return { fechaVencimiento: null, status: null };
  }

  const vencimiento = addDays(compra, ACCESS_DAYS);
  const daysUntil = differenceInCalendarDays(vencimiento, new Date());

  const status: McClientStatus = daysUntil < 0
    ? 'vencido'
    : daysUntil <= POR_VENCER_THRESHOLD_DAYS
    ? 'por_vencer'
    : 'activo';

  return { fechaVencimiento: vencimiento.toISOString().slice(0, 10), status };
}

export function mergeClientRows(contacts: GhlContactSummary[], ops: McClientOps[]): McClientRow[] {
  const opsByContactId = new Map(ops.map((o) => [o.ghl_contact_id, o]));
  return contacts.map((c) => {
    const { fechaVencimiento, status } = computeVencimiento(c.fecha_ultima_compra);
    return {
      ...c,
      ops: opsByContactId.get(c.ghl_contact_id) ?? null,
      fechaVencimiento,
      status,
    };
  });
}
