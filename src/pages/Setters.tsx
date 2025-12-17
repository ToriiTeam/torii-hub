import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useStore } from '@/hooks/useStore';
import { initialSetters } from '@/data/initialData';
import { Plus, Phone, Users, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Setters() {
  const [setters] = useStore('setters', initialSetters);
  const totalCalls = setters.reduce((sum, s) => sum + s.metrics.calls, 0);
  const totalLeads = setters.reduce((sum, s) => sum + s.metrics.leads, 0);
  const totalAppointments = setters.reduce((sum, s) => sum + s.metrics.appointments, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Setters</h1>
          <p className="text-muted-foreground">Métricas y rendimiento del equipo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Phone className="h-8 w-8 mx-auto mb-2 text-info" />
            <p className="text-2xl font-bold">{totalCalls}</p>
            <p className="text-xs text-muted-foreground">Llamadas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold">{totalLeads}</p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold">{totalAppointments}</p>
            <p className="text-xs text-muted-foreground">Citas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{((totalLeads / totalCalls) * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Conversión</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader><CardTitle className="text-base">Comparativa de Setters</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={setters.map(s => ({ name: s.name.split(' ')[0], calls: s.metrics.calls, leads: s.metrics.leads, citas: s.metrics.appointments }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="calls" fill="hsl(var(--info))" name="Llamadas" />
                <Bar dataKey="leads" fill="hsl(var(--success))" name="Leads" />
                <Bar dataKey="citas" fill="hsl(var(--warning))" name="Citas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {setters.map((setter, i) => (
          <Card key={setter.id} className="bg-card border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold">
                  {setter.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{setter.name}</h3>
                    <Badge className="bg-info/20 text-info border-0 text-xs">#{i + 1}</Badge>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{setter.metrics.calls} llamadas</span>
                    <span>{setter.metrics.leads} leads</span>
                    <span>{setter.metrics.confirmed} confirmados</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Meta: {setter.goal} citas</p>
                  <Progress value={(setter.metrics.confirmed / setter.goal) * 100} className="h-2 w-32" />
                  <p className="text-xs text-muted-foreground mt-1">{setter.metrics.confirmed}/{setter.goal}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
