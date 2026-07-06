import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { PHASE_LABELS } from '@/features/delivery-os/types';
import type { DeliveryPhase } from '@/features/delivery-os/types';

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return '—'; }
}

interface Props {
  history: DeliveryPhase[];
  onSelect: (phase: DeliveryPhase) => void;
}

export function PhaseHistoryTable({ history, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Historial de fases</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {open ? 'Ocultar historial' : 'Mostrar historial'}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fase</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Días</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Cumplido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => {
                const days = h.fecha_fin ? differenceInCalendarDays(parseISO(h.fecha_fin), parseISO(h.fecha_inicio)) : null;
                return (
                  <TableRow key={h.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => onSelect(h)}>
                    <TableCell className="font-medium">{PHASE_LABELS[h.fase]}</TableCell>
                    <TableCell>{fmtDate(h.fecha_inicio)}</TableCell>
                    <TableCell>{fmtDate(h.fecha_fin)}</TableCell>
                    <TableCell>{days ?? '—'}</TableCell>
                    <TableCell>{h.tiempo_objetivo_dias ?? '—'}</TableCell>
                    <TableCell>
                      {h.objetivo_cumplido
                        ? <Badge className="bg-success/20 text-success border-0">Sí</Badge>
                        : <Badge variant="outline">No</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {history.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Sin fases completadas todavía</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
