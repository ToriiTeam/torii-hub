import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useStore } from '@/hooks/useStore';
import { initialClosers } from '@/data/initialData';
import { Handshake, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Closers() {
  const [closers] = useStore('closers', initialClosers);
  const totalMeetings = closers.reduce((sum, c) => sum + c.metrics.meetings, 0);
  const totalClosed = closers.reduce((sum, c) => sum + c.metrics.closed, 0);
  const totalValue = closers.reduce((sum, c) => sum + c.metrics.totalValue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Closers</h1>
        <p className="text-muted-foreground">Métricas de ventas y cierres</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Handshake className="h-8 w-8 mx-auto mb-2 text-info" />
            <p className="text-2xl font-bold">{totalMeetings}</p>
            <p className="text-xs text-muted-foreground">Reuniones</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{closers.reduce((s, c) => s + c.metrics.proposals, 0)}</p>
            <p className="text-xs text-muted-foreground">Propuestas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{totalClosed}</p>
            <p className="text-xs text-muted-foreground">Cierres</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Valor Total</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader><CardTitle className="text-base">Performance por Closer</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={closers.map(c => ({ name: c.name.split(' ')[0], reuniones: c.metrics.meetings, cierres: c.metrics.closed, valor: c.metrics.totalValue / 1000 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="reuniones" fill="hsl(var(--info))" name="Reuniones" />
                <Bar dataKey="cierres" fill="hsl(var(--success))" name="Cierres" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {closers.map((closer, i) => (
          <Card key={closer.id} className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center text-lg font-bold">
                  {closer.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{closer.name}</h3>
                    <Badge className="bg-warning/20 text-warning border-0 text-xs">#{i + 1}</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{closer.metrics.meetings} reuniones</span>
                    <span>{closer.metrics.closed} cierres</span>
                    <span>${closer.metrics.totalValue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Meta: ${closer.goal.toLocaleString()}</p>
                  <Progress value={(closer.metrics.totalValue / closer.goal) * 100} className="h-2 w-32" />
                  <p className="text-xs text-muted-foreground mt-1">{((closer.metrics.totalValue / closer.goal) * 100).toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
