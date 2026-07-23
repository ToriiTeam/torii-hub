import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Target, ShieldAlert, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContenidoTabProps } from './types';
import { pillarStyle } from './pillarStyle';

// Read-only reference view — content_pillars/content_mechanisms are shared
// catalogs that barely change, so there's no edit form here yet.

export default function TabPilares({ pillars, mechanisms, loading }: ContenidoTabProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(pillars.map((p) => p.id)));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-lg bg-secondary/40" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Pilares ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pilares de contenido</h2>
        <div className="space-y-3">
          {pillars.map((pilar) => {
            const style = pillarStyle(pilar.nombre);
            const isOpen = expanded.has(pilar.id);
            const mecanismos = Array.isArray(pilar.mejores_mecanismos) ? pilar.mejores_mecanismos as string[] : [];
            return (
              <Card key={pilar.id} className={cn('bg-card', style.border)}>
                <CardHeader
                  className="pb-3 flex-row items-center justify-between cursor-pointer select-none"
                  onClick={() => toggle(pilar.id)}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className={cn('h-5 w-5', style.accent)} />
                    <span className={cn('text-lg font-bold', style.accent)}>{pilar.nombre}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CardHeader>
                {isOpen && (
                  <CardContent className="space-y-4 pt-0">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ángulo</p>
                      <p className="text-sm leading-relaxed">{pilar.angulo}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Target className="h-3.5 w-3.5" />Para qué
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{pilar.para_que}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5" />Prueba de que aplica
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{pilar.prueba_de_que_aplica}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive/80">
                        <ShieldAlert className="h-3.5 w-3.5" />Error a evitar
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{pilar.error_a_evitar}</p>
                    </div>

                    {mecanismos.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mejores mecanismos</p>
                        <div className="flex flex-wrap gap-1.5">
                          {mecanismos.map((m) => (
                            <Badge key={m} className={cn('text-xs border-0', style.badge)}>{m}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
          {pillars.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Sin pilares registrados.</p>
          )}
        </div>
      </div>

      {/* ── Mecanismos ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Mecanismos narrativos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mechanisms.map((m) => (
            <Card key={m.id} className="bg-card border-border/50 flex flex-col">
              <CardHeader className="pb-2">
                <span className="text-sm font-bold text-primary">{m.nombre}</span>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 flex-1">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Qué es</p>
                  <p className="text-sm leading-snug">{m.que_es}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Cuándo usarlo</p>
                  <p className="text-sm text-muted-foreground leading-snug">{m.cuando_usarlo}</p>
                </div>
                <div className="border-l-2 border-primary/30 pl-2.5">
                  <p className="text-xs italic text-muted-foreground leading-snug">"{m.ejemplo}"</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {mechanisms.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6 col-span-full">Sin mecanismos registrados.</p>
          )}
        </div>
      </div>
    </div>
  );
}
