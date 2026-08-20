import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { statusLabels, type ClientStatus } from '@/lib/clientStatus';

type OfferType = 'DWY' | 'DFY';
type PaymentType = 'Upfront' | 'Mensual' | 'Cuotas';
type PaymentPlatform = 'Stripe' | 'Binance' | 'Transfer';

const emptyForm = {
  name: '', email: '', phone: '', offer_type: 'DFY' as OfferType,
  start_date: '', end_date: '', status: 'active' as ClientStatus,
  payment_type: 'Cuotas' as PaymentType, total_installments: '1',
  paid_installments: '0', installment_amount: '0', total_amount: '0',
  next_due_date: '', platform: 'Stripe' as PaymentPlatform,
  platform_fee: '2.9', country: '', notes: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Se dispara después de un insert exitoso — quien monta el diálogo decide
  // qué refetchear (Clientes.tsx refresca su grilla, la sección Clientes de
  // Torii refresca get_situacion_clientes(), etc.).
  onCreated: () => void;
}

// Diálogo "Nuevo Cliente" — extraído de Clientes.tsx (Vista Global / Salud
// de la cartera) para reusarlo tal cual en la nueva sección "Clientes" de
// la subcuenta Torii (Parte 4A). Misma lógica de alta, sin duplicar el
// formulario ni el insert.
export function NuevoClienteDialog({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState(emptyForm);

  const resetForm = () => {
    setForm(emptyForm);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    const data = {
      name: form.name, email: form.email || null, phone: form.phone || null,
      offer_type: form.offer_type, start_date: form.start_date || null,
      end_date: form.end_date || null, status: form.status,
      payment_type: form.payment_type,
      total_installments: parseInt(form.total_installments) || 1,
      paid_installments: parseInt(form.paid_installments) || 0,
      installment_amount: parseFloat(form.installment_amount) || 0,
      total_amount: parseFloat(form.total_amount) || 0,
      next_due_date: form.next_due_date || null, platform: form.platform,
      platform_fee: parseFloat(form.platform_fee) || 0,
      country: form.country || null, notes: form.notes || null,
    };
    const { error } = await supabase.from('clients').insert(data);
    if (error) { toast.error('Error al crear'); return; }
    toast.success('Cliente agregado');
    resetForm();
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setForm(emptyForm); }}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo Cliente</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Cliente *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary/50" /></div>
            <div><Label>Oferta</Label>
              <Select value={form.offer_type} onValueChange={v => setForm({ ...form, offer_type: v as OfferType })}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DWY">DWY (Done With You)</SelectItem>
                  <SelectItem value="DFY">DFY (Done For You)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Inicio</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="bg-secondary/50" /></div>
            <div><Label>Fin</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="bg-secondary/50" /></div>
            <div><Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ClientStatus })}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div><Label>Monto Total</Label><Input type="number" min="0" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} className="bg-secondary/50" /></div>
            <div><Label>Total Cuotas</Label><Input type="number" min="1" value={form.total_installments} onChange={e => setForm({ ...form, total_installments: e.target.value })} className="bg-secondary/50" /></div>
            <div><Label>Cuotas Pagadas</Label><Input type="number" min="0" value={form.paid_installments} onChange={e => setForm({ ...form, paid_installments: e.target.value })} className="bg-secondary/50" /></div>
            <div><Label>Tipo Pago</Label>
              <Select value={form.payment_type} onValueChange={v => setForm({ ...form, payment_type: v as PaymentType })}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upfront">Upfront</SelectItem>
                  <SelectItem value="Mensual">Mensual</SelectItem>
                  <SelectItem value="Cuotas">Cuotas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div><Label>Próx. Venc.</Label><Input type="date" value={form.next_due_date} onChange={e => setForm({ ...form, next_due_date: e.target.value })} className="bg-secondary/50" /></div>
            <div><Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v as PaymentPlatform })}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Stripe">Stripe</SelectItem>
                  <SelectItem value="Binance">Binance</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Fee %</Label><Input type="number" step="0.1" value={form.platform_fee} onChange={e => setForm({ ...form, platform_fee: e.target.value })} className="bg-secondary/50" /></div>
            <div><Label>País</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="bg-secondary/50" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-secondary/50" /></div>
            <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-secondary/50" /></div>
          </div>
          <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary/50" /></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-primary">Agregar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
