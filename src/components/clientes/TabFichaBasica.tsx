import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { DollarSign, CreditCard, Calendar, Edit2, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { type Client } from '@/pages/ClienteDetalle';

interface Installment {
  installment_number: number;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_date: string | null;
}

const PAYMENT_TYPES = ['Upfront', 'Mensual', 'Cuotas'] as const;

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
  start_date: string;
  payment_type: string;
  total_installments: string;
  paid_installments: string;
  mrr: string;
}

function toForm(client: Client): FormState {
  return {
    name: client.name ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    country: client.country ?? '',
    canal: client.canal ?? '',
    start_date: client.start_date ?? '',
    payment_type: client.payment_type ?? '',
    total_installments: client.total_installments?.toString() ?? '',
    paid_installments: client.paid_installments?.toString() ?? '',
    mrr: client.mrr?.toString() ?? '',
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
        start_date: form.start_date || null,
        payment_type: form.payment_type || null,
        total_installments: form.total_installments ? parseInt(form.total_installments) : null,
        paid_installments: form.paid_installments ? parseInt(form.paid_installments) : null,
        mrr: form.mrr ? parseFloat(form.mrr) : null,
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
            <Field label="Fecha de inicio">
              {editing ? <Input type="date" value={form.start_date} onChange={(e) => upd('start_date', e.target.value)} className="bg-secondary/50 h-8 text-sm" /> : <Value>{fmtDate(client.start_date)}</Value>}
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
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}
