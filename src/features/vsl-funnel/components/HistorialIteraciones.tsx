import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchCreativeIterations, addCreativeIteration, type CreativeIteration } from '@/features/vsl-funnel/lib/creativeIterationRepo';

// Mismo mecanismo visual que BitacoraTimeline.tsx (Delivery OS) — tronco
// horizontal + ramas curvas alternando arriba/abajo, mismo cálculo de
// posiciones. Adaptado: acá no hay categorías (no hay un "cuello de
// botella" del que colgar un color), así que todas las ramas usan un único
// acento fijo — el rojo de marca (#e5182b, mismo que ya usa el resto del
// proyecto: btn-apply, dot de "Nota" en BitacoraTimeline, etc.). Rama =
// tiene reemplaza_a_id; tronco = no reemplaza nada.
const ACCENT = '#e5182b';
const STEP_X = 110;
const PAD_X = 50;
const MID_Y = 70;
const NONE = '__none';

interface TimelineNode {
  id: string;
  texto: string;
  fecha: string;
  isBranch: boolean;
  reemplazaTexto: string | null;
}

interface Props {
  clientId: string;
}

export function HistorialIteraciones({ clientId }: Props) {
  const [iterations, setIterations] = useState<CreativeIteration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [texto, setTexto] = useState('');
  const [reemplazaAId, setReemplazaAId] = useState(NONE);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setIterations(await fetchCreativeIterations(clientId));
    } catch (err) {
      console.error('[HistorialIteraciones] load failed:', err);
      toast.error('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const iterationById = useMemo(() => new Map(iterations.map((it) => [it.id, it])), [iterations]);

  const nodes: TimelineNode[] = useMemo(() => {
    return iterations.map((it) => ({
      id: it.id,
      texto: it.texto,
      fecha: it.fecha,
      isBranch: it.reemplaza_a_id != null,
      reemplazaTexto: it.reemplaza_a_id ? iterationById.get(it.reemplaza_a_id)?.texto ?? null : null,
    }));
  }, [iterations, iterationById]);

  const width = Math.max(680, nodes.length * STEP_X + PAD_X * 2);
  let branchToggle = 1;

  async function handleAdd() {
    if (!texto.trim()) return;
    setSaving(true);
    try {
      await addCreativeIteration(clientId, {
        texto: texto.trim(),
        fecha,
        reemplazaAId: reemplazaAId === NONE ? null : reemplazaAId,
      });
      setTexto('');
      setReemplazaAId(NONE);
      await load();
    } catch (err) {
      console.error('[HistorialIteraciones] add failed:', err);
      toast.error('Error al agregar la iteración');
    } finally {
      setSaving(false);
    }
  }

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70 mb-1">
        🎬 Historial de iteraciones
      </div>
      <p className="text-xs text-muted-foreground/70 mb-3">
        Qué versión de un anuncio/VSL/ángulo reemplazó a cuál y por qué. Clickeá un punto para ver el detalle.
      </p>

      <Card className="bg-card border-border/50 rounded-2xl mb-0">
        <CardContent className="p-3.5 flex gap-2 flex-wrap">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-secondary/50 w-[150px]" style={{ colorScheme: 'dark' }} />
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="Qué cambió (ej: variante B del VSL, hook más directo)"
            className="bg-secondary/50 flex-1 min-w-[200px]"
          />
          <Select value={reemplazaAId} onValueChange={setReemplazaAId}>
            <SelectTrigger className="bg-secondary/50 w-[220px]"><SelectValue placeholder="Reemplaza a… (opcional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No reemplaza nada</SelectItem>
              {iterations.map((it) => (
                <SelectItem key={it.id} value={it.id}>
                  {it.texto.length > 40 ? `${it.texto.slice(0, 40)}…` : it.texto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!texto.trim() || saving} className="bg-destructive hover:bg-destructive/90">
            <Plus className="h-4 w-4 mr-1" />Agregar
          </Button>
        </CardContent>
      </Card>

      <div className="border border-border/50 rounded-2xl mt-3.5 p-5 overflow-x-auto">
        {loading ? (
          <div className="h-24 rounded-lg bg-secondary/40 animate-pulse" />
        ) : nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 text-center py-6">Todavía no hay iteraciones registradas para este cliente.</p>
        ) : (
          <svg width={width} height={140} viewBox={`0 0 ${width} 140`} className="min-w-[680px]">
            <line x1={PAD_X} y1={MID_Y} x2={PAD_X + (nodes.length - 1) * STEP_X} y2={MID_Y} stroke="rgba(255,255,255,.12)" strokeWidth={2} />
            {nodes.map((node, i) => {
              const x = PAD_X + i * STEP_X;
              if (node.isBranch) {
                const offset = (branchToggle % 2 === 0 ? 1 : -1) * 34;
                branchToggle++;
                const y = MID_Y + offset;
                return (
                  <g key={node.id} className="cursor-pointer" onClick={() => setSelectedId(node.id)}>
                    <path
                      d={`M ${x - 38} ${MID_Y} C ${x - 18} ${MID_Y}, ${x - 18} ${y}, ${x} ${y} C ${x + 18} ${y}, ${x + 18} ${MID_Y}, ${x + 38} ${MID_Y}`}
                      fill="none" stroke={ACCENT} strokeWidth={2.5} opacity={0.85}
                    />
                    <circle cx={x} cy={y} r={6} fill={ACCENT} stroke="hsl(var(--card))" strokeWidth={2} />
                    <text x={x} y={y + (offset > 0 ? 20 : -12)} textAnchor="middle" className="fill-muted-foreground text-[9px] font-semibold">
                      Reemplazo
                    </text>
                    <text x={x} y={MID_Y + 22} textAnchor="middle" className="fill-muted-foreground/50 text-[9px]">
                      {format(parseISO(node.fecha), 'd MMM', { locale: es })}
                    </text>
                  </g>
                );
              }
              return (
                <g key={node.id} className="cursor-pointer" onClick={() => setSelectedId(node.id)}>
                  <circle cx={x} cy={MID_Y} r={6} fill="#5b5f70" stroke="hsl(var(--card))" strokeWidth={2} />
                  <text x={x} y={MID_Y - 16} textAnchor="middle" className="fill-muted-foreground text-[9px] font-semibold">
                    Iteración
                  </text>
                  <text x={x} y={MID_Y + 22} textAnchor="middle" className="fill-muted-foreground/50 text-[9px]">
                    {format(parseISO(node.fecha), 'd MMM', { locale: es })}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {selected && (
          <div className="mt-3.5 p-3.5 rounded-xl bg-white/[0.03]">
            <span
              className="inline-block text-[10px] font-bold px-2 py-0.5 rounded mb-1.5"
              style={{ background: `${ACCENT}26`, color: ACCENT }}
            >
              {selected.isBranch ? 'Reemplazo' : 'Iteración'}
            </span>
            <p className="text-sm text-foreground/90 leading-relaxed">{selected.texto}</p>
            {selected.reemplazaTexto && (
              <p className="text-xs text-muted-foreground/70 mt-1">Reemplaza a: {selected.reemplazaTexto}</p>
            )}
            <p className="text-[11px] text-muted-foreground/70 mt-1">{format(parseISO(selected.fecha), 'd MMM yyyy', { locale: es })}</p>
          </div>
        )}
      </div>
    </div>
  );
}
