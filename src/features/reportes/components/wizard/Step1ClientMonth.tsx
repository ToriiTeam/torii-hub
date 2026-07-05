import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientOption {
  id: string;
  name: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2000, i, 1), 'MMMM', { locale: es }),
}));

interface Step1Props {
  clientId: string;
  year: number;
  month: number;
  onClientChange: (id: string, name: string) => void;
  onPeriodChange: (year: number, month: number) => void;
}

export function Step1ClientMonth({ clientId, year, month, onClientChange, onPeriodChange }: Step1Props) {
  const [clients, setClients] = useState<ClientOption[]>([]);

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClients(data ?? []));
  }, []);

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Cliente y período</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5 col-span-1">
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <Select
            value={clientId}
            onValueChange={(id) => {
              const c = clients.find((c) => c.id === id);
              onClientChange(id, c?.name ?? '');
            }}
          >
            <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccioná un cliente" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mes</Label>
          <Select value={String(month)} onValueChange={(v) => onPeriodChange(year, Number(v))}>
            <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)} className="capitalize">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Año</Label>
          <Select value={String(year)} onValueChange={(v) => onPeriodChange(Number(v), month)}>
            <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
