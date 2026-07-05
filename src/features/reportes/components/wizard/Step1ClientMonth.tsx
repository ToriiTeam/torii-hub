import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PeriodType } from '../../types';

interface ClientOption {
  id: string;
  name: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2000, i, 1), 'MMMM', { locale: es }),
}));

const PERIOD_TABS: { value: PeriodType; label: string }[] = [
  { value: 'month', label: 'Mes específico' },
  { value: 'week', label: 'Semana específica' },
  { value: 'custom', label: 'Período personalizado' },
];

interface Step1Props {
  clientId: string;
  periodType: PeriodType;
  year: number;
  month: number;
  weekStart: string;
  customSince: string;
  customUntil: string;
  onClientChange: (id: string, name: string) => void;
  onPeriodTypeChange: (type: PeriodType) => void;
  onMonthPeriodChange: (year: number, month: number) => void;
  onWeekStartChange: (weekStart: string) => void;
  onCustomRangeChange: (since: string, until: string) => void;
}

export function Step1ClientMonth({
  clientId,
  periodType,
  year,
  month,
  weekStart,
  customSince,
  customUntil,
  onClientChange,
  onPeriodTypeChange,
  onMonthPeriodChange,
  onWeekStartChange,
  onCustomRangeChange,
}: Step1Props) {
  const [clients, setClients] = useState<ClientOption[]>([]);

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClients(data ?? []));
  }, []);

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  const weekStartDate = new Date(`${weekStart}T00:00:00`);
  const weekEndDate = addDays(weekStartDate, 6);
  function navWeek(dir: 'prev' | 'next') {
    const shifted = addDays(weekStartDate, dir === 'prev' ? -7 : 7);
    onWeekStartChange(format(shifted, 'yyyy-MM-dd'));
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Cliente y período</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5 max-w-sm">
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

        <div className="space-y-3">
          <Tabs value={periodType} onValueChange={(v) => onPeriodTypeChange(v as PeriodType)}>
            <TabsList>
              {PERIOD_TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          {periodType === 'month' && (
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mes</Label>
                <Select value={String(month)} onValueChange={(v) => onMonthPeriodChange(year, Number(v))}>
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
                <Select value={String(year)} onValueChange={(v) => onMonthPeriodChange(Number(v), month)}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {periodType === 'week' && (
            <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-3 min-w-[220px] text-center capitalize">
                {format(weekStartDate, 'dd')} – {format(weekEndDate, "dd 'de' MMMM yyyy", { locale: es })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {periodType === 'custom' && (
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Input
                  type="date"
                  value={customSince}
                  onChange={(e) => onCustomRangeChange(e.target.value, customUntil)}
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Input
                  type="date"
                  value={customUntil}
                  onChange={(e) => onCustomRangeChange(customSince, e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
