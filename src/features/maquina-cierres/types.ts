export type McClientStatus = 'activo' | 'por_vencer' | 'vencido';

// Identity (name/email/phone) is never persisted in Supabase — it's read
// live from GHL on every page load and merged in-memory with mc_client_ops
// (which only ever holds ghl_contact_id + our own operational flags).
export interface GhlContactSummary {
  ghl_contact_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  fecha_ultima_compra: string | null; // yyyy-MM-dd from GHL's custom field, or null if unset/unresolved
}

export interface McClientOps {
  id: string;
  ghl_contact_id: string;
  academia_access_granted: boolean;
  whatsapp_group_added: boolean;
  notes: string | null;
  updated_at: string;
}

export interface McClientRow extends GhlContactSummary {
  ops: McClientOps | null;
  fechaVencimiento: string | null; // fecha_ultima_compra + 60 days
  status: McClientStatus | null; // null when fecha_ultima_compra is missing — can't classify
}
