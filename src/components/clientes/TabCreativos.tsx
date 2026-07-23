import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ExternalLink, FileText, Loader2, GitBranch, Layers,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Angle {
  id: string;
  nombre: string | null;
  narrativa: string | null;
  pipeline_stage: string;
  hipotesis_activa: string | null;
  resultado: string | null;
}

interface Script {
  id: string;
  angle_id: string;
  version: number;
  titulo: string | null;
  estado: string;
  drive_doc_id: string | null;
  variante_de: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  { value: 'analisis',    label: 'Análisis' },
  { value: 'competencia', label: 'Competencia' },
  { value: 'copy',        label: 'Copy' },
  { value: 'guion',       label: 'Guión' },
  { value: 'revision',    label: 'Revisión' },
  { value: 'listo',       label: 'Listo' },
  { value: 'lanzado',     label: 'Lanzado' },
];

// Unified vocabulary (ResultadoEstado from creative-tree/types.ts) — this
// table used to have its own 4th value 'sin_datos', now retired (0 real
// rows ever used it, and a null resultado already means the same thing —
// see the "Sin datos" fallback below, which is a display-only label, not a
// stored enum value anymore).
const resultadoStyle: Record<string, { badge: string; label: string }> = {
  ganador:    { badge: 'bg-success/20 text-success',         label: 'Ganador' },
  perdedor:   { badge: 'bg-destructive/20 text-destructive', label: 'Perdedor' },
  en_test:    { badge: 'bg-warning/20 text-warning',         label: 'En test' },
  inconcluso: { badge: 'bg-info/20 text-info',               label: 'Inconcluso' },
  pausado:    { badge: 'bg-secondary text-muted-foreground', label: 'Pausado' },
};
const SIN_DATOS_STYLE = { badge: 'bg-secondary text-muted-foreground', label: 'Sin datos' };

const scriptEstadoStyle: Record<string, { badge: string; label: string }> = {
  borrador: { badge: 'bg-secondary text-muted-foreground',  label: 'Borrador' },
  revision: { badge: 'bg-warning/20 text-warning',          label: 'Revisión' },
  aprobado: { badge: 'bg-info/20 text-info',                label: 'Aprobado' },
  grabado:  { badge: 'bg-primary/20 text-primary',          label: 'Grabado' },
  lanzado:  { badge: 'bg-success/20 text-success',          label: 'Lanzado' },
};

const emptyAngleForm = {
  nombre: '', narrativa: '', hipotesis_activa: '', pipeline_stage: 'analisis',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function driveUrl(id: string) {
  return id.startsWith('http') ? id : `https://docs.google.com/document/d/${id}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  clientId: string;
}

export default function TabCreativos({ clientId }: Props) {
  const [angles, setAngles]   = useState<Angle[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyAngleForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [anglesRes, scriptsRes] = await Promise.all([
      supabase
        .from('angles')
        .select('id, nombre, narrativa, pipeline_stage, hipotesis_activa, resultado')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true }),
      supabase
        .from('scripts')
        .select('id, angle_id, version, titulo, estado, drive_doc_id, variante_de')
        .eq('client_id', clientId)
        .order('version', { ascending: true }),
    ]);
    if (anglesRes.data)  setAngles(anglesRes.data as Angle[]);
    if (scriptsRes.data) setScripts(scriptsRes.data as Script[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveAngle = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    const { error } = await supabase.from('angles').insert({
      client_id:       clientId,
      nombre:          form.nombre,
      narrativa:       form.narrativa || null,
      hipotesis_activa:form.hipotesis_activa || null,
      pipeline_stage:  form.pipeline_stage,
    });
    setSaving(false);
    if (error) { toast.error('Error al crear angle'); return; }
    toast.success('Angle creado');
    setDialogOpen(false);
    setForm(emptyAngleForm);
    fetchAll();
  };

  const changeStage = async (angle: Angle, newStage: string) => {
    // Optimistic update
    setAngles(prev => prev.map(a => a.id === angle.id ? { ...a, pipeline_stage: newStage } : a));
    const { error } = await supabase
      .from('angles')
      .update({ pipeline_stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', angle.id);
    if (error) {
      toast.error('Error al actualizar etapa');
      fetchAll(); // revert
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <>
      {/* ── New angle dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setForm(emptyAngleForm); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle>Nuevo angle creativo</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="bg-secondary/50 mt-1"
                placeholder="Ej: Miedo al estancamiento"
              />
            </div>
            <div>
              <Label>Narrativa</Label>
              <Textarea
                value={form.narrativa}
                onChange={e => setForm({ ...form, narrativa: e.target.value })}
                className="bg-secondary/50 mt-1 resize-none"
                rows={3}
                placeholder="El eje narrativo del ángulo — qué historia cuenta..."
              />
            </div>
            <div>
              <Label>Hipótesis activa</Label>
              <Textarea
                value={form.hipotesis_activa}
                onChange={e => setForm({ ...form, hipotesis_activa: e.target.value })}
                className="bg-secondary/50 mt-1 resize-none"
                rows={2}
                placeholder="Por qué creemos que este ángulo va a funcionar..."
              />
            </div>
            <div>
              <Label>Etapa inicial</Label>
              <Select value={form.pipeline_stage} onValueChange={v => setForm({ ...form, pipeline_stage: v })}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveAngle} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Crear angle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Pipeline de creativos
          </span>
          <Badge variant="outline" className="text-xs">{angles.length} angles</Badge>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Nuevo angle
        </Button>
      </div>

      {/* ── Kanban ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 228}px` }}>
          {STAGES.map((stage, stageIdx) => {
            const stageAngles = angles.filter(a => a.pipeline_stage === stage.value);
            return (
              <div key={stage.value} className="flex-shrink-0 w-52">
                {/* Column header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {stage.label}
                  </span>
                  {stageAngles.length > 0 && (
                    <Badge variant="outline" className="text-xs h-5 px-1.5">
                      {stageAngles.length}
                    </Badge>
                  )}
                </div>

                {/* Column body */}
                <div className={cn(
                  'space-y-2 min-h-20 rounded-lg p-1.5',
                  stageAngles.length === 0 && 'border border-dashed border-border/30'
                )}>
                  {stageAngles.map(angle => (
                    <AngleCard
                      key={angle.id}
                      angle={angle}
                      stageIdx={stageIdx}
                      scripts={scripts.filter(s => s.angle_id === angle.id)}
                      onChangeStage={changeStage}
                      onRefresh={fetchAll}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── AngleCard sub-component ──────────────────────────────────────────────────

interface AngleCardProps {
  angle: Angle;
  stageIdx: number;
  scripts: Script[];
  onChangeStage: (angle: Angle, newStage: string) => Promise<void>;
  onRefresh: () => void;
}

function AngleCard({ angle, stageIdx, scripts, onChangeStage, onRefresh }: AngleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [moving, setMoving] = useState(false);

  const canGoBack    = stageIdx > 0;
  const canGoForward = stageIdx < STAGES.length - 1;

  const handleMove = async (direction: 'back' | 'forward') => {
    const newIdx = direction === 'back' ? stageIdx - 1 : stageIdx + 1;
    setMoving(true);
    await onChangeStage(angle, STAGES[newIdx].value);
    setMoving(false);
  };

  const resultStyle = angle.resultado ? (resultadoStyle[angle.resultado] ?? SIN_DATOS_STYLE) : SIN_DATOS_STYLE;

  return (
    <Card className="bg-card border-border/50 hover:border-primary/20 transition-colors">
      <CardContent className="p-3 space-y-2">

        {/* ── Nombre + resultado ────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-1">
          <p className="font-medium text-sm leading-tight flex-1 min-w-0 truncate" title={angle.nombre ?? ''}>
            {angle.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}
          </p>
          {angle.resultado && (
            <Badge className={cn('text-xs border-0 flex-shrink-0 px-1.5', resultStyle.badge)}>
              {resultStyle.label}
            </Badge>
          )}
        </div>

        {/* ── Hipótesis ─────────────────────────────────────────────────── */}
        {angle.hipotesis_activa && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {angle.hipotesis_activa}
          </p>
        )}

        {/* ── Scripts count + expand ────────────────────────────────────── */}
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          onClick={() => setExpanded(v => !v)}
        >
          <FileText className="h-3 w-3 flex-shrink-0" />
          <span>{scripts.length} script{scripts.length !== 1 ? 's' : ''}</span>
          {scripts.length > 0 && (
            expanded
              ? <ChevronUp className="h-3 w-3 ml-auto" />
              : <ChevronDown className="h-3 w-3 ml-auto" />
          )}
        </button>

        {/* ── Scripts list (expanded) ────────────────────────────────────── */}
        {expanded && scripts.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/30">
            {scripts.map(script => {
              const estadoStyle = scriptEstadoStyle[script.estado] ?? scriptEstadoStyle['borrador'];
              const isVariant = script.variante_de != null;
              return (
                <div
                  key={script.id}
                  className={cn(
                    'flex flex-col gap-1 text-xs rounded p-1.5 bg-secondary/30',
                    isVariant && 'ml-2 border-l-2 border-border/50'
                  )}
                >
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-muted-foreground font-mono">v{script.version}</span>
                    {isVariant && (
                      <Badge className="bg-secondary text-muted-foreground border-0 text-xs px-1 py-0 h-4 gap-0.5">
                        <GitBranch className="h-2.5 w-2.5" />Variante
                      </Badge>
                    )}
                    <Badge className={cn('border-0 text-xs px-1 py-0 h-4', estadoStyle.badge)}>
                      {estadoStyle.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium truncate text-xs leading-tight flex-1" title={script.titulo ?? ''}>
                      {script.titulo || <span className="italic text-muted-foreground">Sin título</span>}
                    </span>
                    {script.drive_doc_id && (
                      <button
                        onClick={() => window.open(driveUrl(script.drive_doc_id!), '_blank', 'noopener,noreferrer')}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title="Abrir en Drive"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {expanded && scripts.length === 0 && (
          <p className="text-xs text-muted-foreground pt-1 border-t border-border/30 italic">
            Sin scripts todavía
          </p>
        )}

        <Separator className="bg-border/30" />

        {/* ── Stage navigation ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
            disabled={!canGoBack || moving}
            onClick={() => handleMove('back')}
            title={canGoBack ? `Mover a ${STAGES[stageIdx - 1].label}` : undefined}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground px-1">
            {STAGES[stageIdx].label}
          </span>
          <Button
            variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
            disabled={!canGoForward || moving}
            onClick={() => handleMove('forward')}
            title={canGoForward ? `Mover a ${STAGES[stageIdx + 1].label}` : undefined}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
