import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { addHito, type ActivityLogRow, type CuelloBotella } from '@/features/delivery-tracker/lib/deliveryOsRepo';
import { MOTIVO_GRUPOS } from '@/features/delivery-tracker/lib/motivos';

const CATEGORY_COLOR = new Map(MOTIVO_GRUPOS.map((g) => [g.categoria, g.color]));
const STEP_X = 110;
const PAD_X = 50;
const MID_Y = 70;

interface TimelineNode {
  id: string;
  texto: string;
  fecha: string;
  branch: string | null;
  color: string | null;
  auto: boolean;
}

interface Props {
  clientId: string;
  activityLog: ActivityLogRow[];
  cuellos: CuelloBotella[];
  onChanged: () => void;
}

// Traducción del canvas SVG del mockup: tronco horizontal + ramas curvas
// alternando arriba/abajo para los hitos que vienen de un cuello de
// botella (tipo='sistema' con cuello_de_botella_id) — el resto queda
// sobre el tronco. Mismo cálculo de posiciones (stepX/padX/midY).
export function BitacoraTimeline({ clientId, activityLog, cuellos, onChanged }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);

  const cuelloById = useMemo(() => new Map(cuellos.map((c) => [c.id, c])), [cuellos]);

  const nodes: TimelineNode[] = useMemo(() => {
    return activityLog.map((row) => {
      const cuello = row.cuello_de_botella_id ? cuelloById.get(row.cuello_de_botella_id) : undefined;
      return {
        id: row.id,
        texto: row.texto,
        fecha: row.fecha,
        branch: cuello ? cuello.categoria : null,
        color: cuello ? CATEGORY_COLOR.get(cuello.categoria) ?? '#8b8fa3' : null,
        auto: row.tipo === 'sistema',
      };
    }).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [activityLog, cuelloById]);

  const width = Math.max(680, nodes.length * STEP_X + PAD_X * 2);
  let branchToggle = 1;

  async function handleAddHito() {
    if (!texto.trim()) return;
    setSaving(true);
    try {
      await addHito(clientId, fecha, texto.trim());
      setTexto('');
      onChanged();
    } catch (err) {
      console.error('[BitacoraTimeline] add hito failed:', err);
      toast.error('Error al agregar el hito');
    } finally {
      setSaving(false);
    }
  }

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70 mb-1">
        📋 Bitácora — línea de tiempo ramificada
      </div>
      <p className="text-xs text-muted-foreground/70 mb-3">
        Cada rama es una decisión tomada ante un cuello de botella. Deslizá y clickeá un punto para ver el detalle.
      </p>

      <Card className="bg-card border-border/50 rounded-2xl mb-0">
        <CardContent className="p-3.5 flex gap-2 flex-wrap">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-secondary/50 w-[150px]" style={{ colorScheme: 'dark' }} />
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddHito(); }}
            placeholder="Anotá qué pasó (ej: se activaron las campañas)"
            className="bg-secondary/50 flex-1 min-w-[200px]"
          />
          <Button onClick={handleAddHito} disabled={!texto.trim() || saving} className="bg-destructive hover:bg-destructive/90">
            <Plus className="h-4 w-4 mr-1" />Agregar
          </Button>
        </CardContent>
      </Card>

      <div className="border border-border/50 rounded-2xl mt-3.5 p-5 overflow-x-auto">
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 text-center py-6">Todavía no hay actividad registrada para este cliente.</p>
        ) : (
          <svg width={width} height={140} viewBox={`0 0 ${width} 140`} className="min-w-[680px]">
            <line x1={PAD_X} y1={MID_Y} x2={PAD_X + (nodes.length - 1) * STEP_X} y2={MID_Y} stroke="rgba(255,255,255,.12)" strokeWidth={2} />
            {nodes.map((node, i) => {
              const x = PAD_X + i * STEP_X;
              if (node.branch) {
                const offset = (branchToggle % 2 === 0 ? 1 : -1) * 34;
                branchToggle++;
                const y = MID_Y + offset;
                return (
                  <g key={node.id} className="cursor-pointer" onClick={() => setSelectedId(node.id)}>
                    <path
                      d={`M ${x - 38} ${MID_Y} C ${x - 18} ${MID_Y}, ${x - 18} ${y}, ${x} ${y} C ${x + 18} ${y}, ${x + 18} ${MID_Y}, ${x + 38} ${MID_Y}`}
                      fill="none" stroke={node.color ?? '#8b8fa3'} strokeWidth={2.5} opacity={0.85}
                    />
                    <circle cx={x} cy={y} r={6} fill={node.color ?? '#8b8fa3'} stroke="hsl(var(--card))" strokeWidth={2} />
                    <text x={x} y={y + (offset > 0 ? 20 : -12)} textAnchor="middle" className="fill-muted-foreground text-[9px] font-semibold">
                      {node.branch.split(' / ')[0]}
                    </text>
                    <text x={x} y={MID_Y + 22} textAnchor="middle" className="fill-muted-foreground/50 text-[9px]">
                      {format(parseISO(node.fecha), 'd MMM', { locale: es })}
                    </text>
                  </g>
                );
              }
              return (
                <g key={node.id} className="cursor-pointer" onClick={() => setSelectedId(node.id)}>
                  <circle cx={x} cy={MID_Y} r={6} fill={node.auto ? '#5b5f70' : '#e5182b'} stroke="hsl(var(--card))" strokeWidth={2} />
                  <text x={x} y={MID_Y - 16} textAnchor="middle" className="fill-muted-foreground text-[9px] font-semibold">
                    {node.auto ? 'Sistema' : 'Nota'}
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
              style={{
                background: selected.color ? `${selected.color}26` : 'rgba(255,255,255,.08)',
                color: selected.color ?? '#8b8fa3',
              }}
            >
              {selected.branch || (selected.auto ? 'Evento del sistema' : 'Nota manual')}
            </span>
            <p className="text-sm text-foreground/90 leading-relaxed">{selected.texto}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">{format(parseISO(selected.fecha), 'd MMM yyyy', { locale: es })}</p>
          </div>
        )}
      </div>
    </div>
  );
}
