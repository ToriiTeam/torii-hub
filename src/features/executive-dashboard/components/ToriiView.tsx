import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Users, Handshake } from 'lucide-react';
import { PortfolioView } from './PortfolioView';
import type { ToriiData } from '../types';

function fmtMoney(v: number | null): string {
  return v == null ? '—' : `$${Math.round(v).toLocaleString()}`;
}
function fmtPct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}

interface ToriiViewProps {
  data: ToriiData;
}

export function ToriiView({ data }: ToriiViewProps) {
  const { ads, closing, incomesTotal, expensesTotal, netProfit, portfolioMrr, portfolio } = data;

  const kpis = [
    { label: 'Revenue de Torii (ventas propias)', value: fmtMoney(portfolioMrr), icon: DollarSign, cls: portfolioMrr > 0 ? 'text-success' : undefined },
    { label: 'Ingresos totales del mes', value: fmtMoney(incomesTotal), icon: TrendingUp },
    { label: 'Egresos totales del mes', value: fmtMoney(expensesTotal), icon: TrendingDown },
    { label: 'Resultado neto', value: fmtMoney(netProfit), icon: DollarSign, cls: netProfit >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Inversión ads propia', value: fmtMoney(ads.inversion), icon: DollarSign },
    { label: 'Leads (cuentas propias)', value: ads.leads.toLocaleString(), icon: Users },
    { label: 'Reuniones (funnel propio)', value: closing.reuniones.toLocaleString(), icon: Handshake },
    { label: 'Cierres', value: closing.cierres.toLocaleString(), icon: Handshake },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="bg-card border-border/50">
              <CardContent className="p-4 text-center">
                <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className={`text-lg font-bold ${k.cls ?? ''}`}>{k.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium">Closing propio de Torii</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div><p className="text-lg font-bold">{fmtPct(closing.showRate)}</p><p className="text-xs text-muted-foreground">Show rate</p></div>
          <div><p className="text-lg font-bold">{closing.calificados}</p><p className="text-xs text-muted-foreground">Calificados</p></div>
          <div><p className="text-lg font-bold">{fmtPct(closing.closeRate)}</p><p className="text-xs text-muted-foreground">Close rate</p></div>
          <div><p className="text-lg font-bold">{fmtMoney(ads.cpl)}</p><p className="text-xs text-muted-foreground">CPL propio</p></div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">Resumen del portfolio</h2>
          <Badge variant="outline" className="text-xs">Todos los clientes</Badge>
        </div>
        <PortfolioView data={portfolio} />
      </div>
    </div>
  );
}
