import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, CreditCard, Calendar, Edit2, X, Check, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { type Client } from '@/pages/ClienteDetalle';
import { cn } from '@/lib/utils';
import { statusColors, statusLabels } from '@/lib/clientStatus';
import { CancelClientDialog } from '@/features/clientes/components/CancelClientDialog';

interface Installment {
  installment_number: number;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_date: string | null;
}

const PAYMENT_TYPES = ['Upfront', 'Mensual', 'Cuotas'] as const;
// offer_type (DWY/DFY) y platform son distintos de payment_type/canal de
// arriba — mismos valores que usa el diálogo de Clientes.tsx.
const OFFER_TYPES = ['DWY', 'DFY'] as const;
const OFFER_TYPE_LABELS: Record<string, string> = { DWY: 'DWY (Done With You)', DFY: 'DFY (Done For You)' };
const PLATFORMS = ['Stripe', 'Binance', 'Transfer'] as const;

// Mirrors the CHECK constraint on clients.canal_captacion exactly — how
// Torii itself acquired this client, not the client's own marketing
// channel (that's the pre-existing free-text `canal` field below).
const CANAL_CAPTACION_OPTIONS = [
  'Meta Ads', 'Referido', 'LinkedIn orgánico', 'Instagram orgánico', 'YouTube', 'Outbound/Setters', 'Otro',
] as const;
// Mirrors the CHECK constraint on clients.oferta — which productized
// service Torii delivers to this client, independent of canal_captacion
// above (how they were acquired). E.g. a client can be closed via LinkedIn
// outbound calls but still buy the Meta Ads Leadgen service.
const OFERTA_OPTIONS = ['LinkedIn Outbound', 'Meta Ads Leadgen'] as const;
const NONE = 'none';

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, "d MMM yyyy", { locale: es }) : '—';
  } catch {
    return '—';
  }
}

function daysActive(startDate: string | null | undefined): number | null {
  if (!startDate) return null;
  try {
    const d = parseISO(startDate);
    return isValid(d) ? differenceInDays(new Date(), d) : null;
  } catch {
    return null;
  }
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  country: string;
  canal: string;
  canal_captacion: string;
  oferta: string;
  offer_type: string;
  start_date: string;
  end_date: string;
  payment_type: string;
  total_installments: string;
  paid_installments: string;
  installment_amount: string;
  total_amount: string;
  next_due_date: string;
  platform: string;
  platform_fee: string;
  mrr: string;
  notes: string;
}

function toForm(client: Client): FormState {
  return {
    name: client.name ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    country: client.country ?? '',
    canal: client.canal ?? '',
    canal_captacion: client.canal_captacion ?? NONE,
    oferta: client.oferta ?? NONE,
    offer_type: client.offer_type ?? OFFER_TYPES[0],
    start_date: client.start_date ?? '',
    end_date: client.end_date ?? '',
    payment_type: client.payment_type ?? '',
    total_installments: client.total_installments?.toString() ?? '',
    paid_installments: client.paid_installments?.toString() ?? '',
    installment_amount: client.installment_amount?.toString() ?? '',
    total_amount: client.total_amount?.toString() ?? '',
    next_due_date: client.next_due_date ?? '',
    platform: client.platform ?? PLATFORMS[0],
    platform_fee: client.platform_fee?.toString() ?? '',
    mrr: client.mrr?.toString() ?? '',
    notes: client.notes ?? '',
  };
}

interface Props {
  client: Client;
  onClientUpdate: () => void;
}

export default function TabFichaBasica({ client, onClientUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(toForm(client));
  const [saving, setSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(true);

  useEffect(() => { setForm(toForm(client)); }, [client]);

  useEffect(() => { fetchInstallments(); }, [client.id]);

  const fetchInstallments = async () => {
    setLoadingInstallments(true);
    const { data } = await supabase
      .from('client_installments')
      .select('installment_number, amount, due_date, paid, paid_date')
      .eq('client_id', client.id)
      .order('installment_number', { ascending: true });
    if (data) setInstallments(data as Installment[]);
    setLoadingInstallments(false);
  };

  function upd<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('clients')
      .update({
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        country: form.country || null,
        canal: form.canal || null,
        canal_captacion: form.canal_captacion === NONE ? null : form.canal_captacion,
        oferta: form.oferta === NONE ? null : form.oferta,
        offer_type: (form.offer_type || null) as 'DWY' | 'DFY' | null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        payment_type: (form.payment_type || null) as 'Upfront' | 'Mensual' | 'Cuotas' | null,
        total_installments: form.total_installments ? parseInt(form.total_installments) : null,
        paid_installments: form.paid_installments ? parseInt(form.paid_installments) : null,
        installment_amount: form.installment_amount ? parseFloat(form.installment_amount) : null,
        total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
        next_due_date: form.next_due_date || null,
        platform: (form.platform || null) as 'Stripe' | 'Binance' | 'Transfer' | null,
        platform_fee: form.platform_fee ? parseFloat(form.platform_fee) : null,
        mrr: form.mrr ? parseFloat(form.mrr) : null,
        notes: form.notes || null,
      })
      .eq('id', client.id);
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Ficha actualizada');
    setEditing(false);
    onClientUpdate();
  }

  function handleCancel() {
    setForm(toForm(client));
    setEditing(false);
  }

  const days = daysActive(client.start_date);

  const totalPaid = installments.filter((i) => i.paid).reduce((s, i) => s + Number(i.amount), 0);
  const totalPending = installments.filter((i) => !i.paid).reduce((s, i) => s + Number(i.amount), 0);
  const nextUnpaid = installments.find((i) => !i.paid && i.due_date) ?? null;
  const payProgress = installments.length > 0
    ? (installments.filter((i) => i.paid).length / installments.length) * 100
    : (client.total_installments > 0 ? (client.paid_installments / client.total_installments) * 100 : 0);

  return (
    <div className="space-y-4">
      {/* Header propio de Ficha Básica — antes vivía en ClienteDetalle.tsx y
          se pintaba en TODAS las pantallas de la ficha de cliente (Resumen,
          VSL Funnel, Social Funnel, Closing, etc.), aunque solo tenía
          sentido acá. Movido para que solo aparezca en Información > Ficha
          Básica. */}
      <div className="flex items-center justify-end gap-2">
        <Badge className={cn('text-sm border-0', statusColors[client.status])}>
          {statusLabels[client.status]}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Edit2 className="h-4 w-4 mr-1.5" />Editar
        </Button>
        {client.status !== 'cancelled' && (
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setCancelDialogOpen(true)}>
            <Ban className="h-4 w-4 mr-1.5" />Cancelar cliente
          </Button>
        )}
      </div>

      <CancelClientDialog
        client={client}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onCancelled={onClientUpdate}
      />

    <div className="grid grid-cols-3 gap-4">
      {/* ── Datos del cliente ── */}
      <Card className="col-span-3 bg-card border-border/50">
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Datos del cliente
          </CardTitle>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="h-4 w-4 mr-1" />Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />{saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1.5" />Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Nombre">
              {editing ? <Input value={form.name} onChange={(e) => upd('name', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{client.name || '—'}</Value>}
            </Field>
            <Field label="Email">
              {editing ? <Input type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{client.email || '—'}</Value>}
            </Field>
            <Field label="Teléfono">
              {editing ? <Input value={form.phone} onChange={(e) => upd('phone', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{client.phone || '—'}</Value>}
            </Field>
            <Field label="País">
              {editing ? <Input value={form.country} onChange={(e) => upd('country', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{client.country || '—'}</Value>}
            </Field>
            <Field label="Canal">
              {editing ? <Input value={form.canal} onChange={(e) => upd('canal', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{client.canal || '—'}</Value>}
            </Field>
            <Field label="Canal de captación (cómo llegó a Torii)">
              {editing ? (
                <Select value={form.canal_captacion} onValueChange={(v) => upd('canal_captacion', v)}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Sin definir" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin definir</SelectItem>
                    {CANAL_CAPTACION_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <Value>{client.canal_captacion || '—'}</Value>}
            </Field>
            <Field label="Oferta (servicio vendido)">
              {editing ? (
                <Select value={form.oferta} onValueChange={(v) => upd('oferta', v)}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Sin definir" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin definir</SelectItem>
                    {OFERTA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <Value>{client.oferta || '—'}</Value>}
            </Field>
            <Field label="Tipo de oferta">
              {editing ? (
                <Select value={form.offer_type} onValueChange={(v) => upd('offer_type', v)}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OFFER_TYPES.map((t) => <SelectItem key={t} value={t}>{OFFER_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <Value>{client.offer_type || '—'}</Value>}
            </Field>
            <Field label="Fecha de inicio">
              {editing ? <Input type="date" value={form.start_date} onChange={(e) => upd('start_date', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{fmtDate(client.start_date)}</Value>}
            </Field>
            <Field label="Fecha de fin">
              {editing ? <Input type="date" value={form.end_date} onChange={(e) => upd('end_date', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{fmtDate(client.end_date)}</Value>}
            </Field>
            <Field label="Días activo">
              <Value>{days != null ? `${days} días` : '—'}</Value>
            </Field>
            <Field label="Tipo de pago">
              {editing ? (
                <Select value={form.payment_type} onValueChange={(v) => upd('payment_type', v)}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue placeholder="Sin definir" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <Value>{client.payment_type || '—'}</Value>}
            </Field>
            <Field label="Cuotas (pagadas / total)">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={0} value={form.paid_installments} onChange={(e) => upd('paid_installments', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
                  <span className="text-muted-foreground text-sm">/</span>
                  <Input type="number" min={0} value={form.total_installments} onChange={(e) => upd('total_installments', e.target.value)} className="bg-secondary/50 h-8 text-sm" />
                </div>
              ) : <Value>{client.paid_installments ?? 0} / {client.total_installments ?? 0}</Value>}
            </Field>
            <Field label="MRR">
              {editing ? <Input type="number" min={0} value={form.mrr} onChange={(e) => upd('mrr', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{client.mrr != null ? `$${Number(client.mrr).toLocaleString()}` : '—'}</Value>}
            </Field>
            <Field label="Monto total del contrato">
              {editing ? <Input type="number" min={0} value={form.total_amount} onChange={(e) => upd('total_amount', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{client.total_amount != null ? `$${Number(client.total_amount).toLocaleString()}` : '—'}</Value>}
            </Field>
            <Field label="Monto por cuota">
              {editing ? <Input type="number" min={0} value={form.installment_amount} onChange={(e) => upd('installment_amount', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{client.installment_amount != null ? `$${Number(client.installment_amount).toLocaleString()}` : '—'}</Value>}
            </Field>
            <Field label="Próximo vencimiento">
              {editing ? <Input type="date" value={form.next_due_date} onChange={(e) => upd('next_due_date', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{fmtDate(client.next_due_date)}</Value>}
            </Field>
            <Field label="Plataforma de pago">
              {editing ? (
                <Select value={form.platform} onValueChange={(v) => upd('platform', v)}>
                  <SelectTrigger className="bg-secondary/50 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : <Value>{client.platform || '—'}</Value>}
            </Field>
            <Field label="Fee de plataforma (%)">
              {editing ? <Input type="number" min={0} step="0.1" value={form.platform_fee} onChange={(e) => upd('platform_fee', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{client.platform_fee != null ? `${client.platform_fee}%` : '—'}</Value>}
            </Field>
            <Field label="Notas" full>
              {editing ? <Textarea value={form.notes} onChange={(e) => upd('notes', e.target.value)} className="bg-secondary/50 text-sm" rows={3} /> : <Value>{client.notes || '—'}</Value>}
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Pagos (movida desde Ficha Operativa) ── */}
      <Card className="col-span-3 bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Pagos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingInstallments ? (
            <div className="h-24 rounded-lg bg-secondary/40 animate-pulse" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-8 w-8 text-success flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cobrado</p>
                    <p className="text-xl font-bold text-success">${totalPaid.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-8 w-8 text-warning flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pendiente</p>
                    <p className="text-xl font-bold text-warning">${totalPending.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Próxima cuota</p>
                    {nextUnpaid ? (
                      <>
                        <p className="text-lg font-bold">${Number(nextUnpaid.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(nextUnpaid.due_date)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{installments.filter((i) => i.paid).length} de {installments.length || client.total_installments} cuotas pagadas</span>
                  <span>{Math.round(payProgress)}%</span>
                </div>
                <Progress value={payProgress} className="h-2" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn('space-y-1', full && 'col-span-2 sm:col-span-3')}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}
