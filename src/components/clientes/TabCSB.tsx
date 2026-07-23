import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, ExternalLink, FileText, Loader2, Upload, Plus, X, Sparkles, Copy, Check, AlertTriangle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import mammoth from 'mammoth';

// ─── Types ────────────────────────────────────────────────────────────────────
// CSB v2 — 7 evidence blocks (extracted from a sales-call transcript by
// generate-csb-from-transcript) + sintesis (the 3 "Criterio de ejecución"
// fields) + brief_document (the full narrative Markdown, pasteable into
// Word) + revisado (false right after AI generation, true once Benjamin
// confirms). Replaces the old 5-jsonb-field / 6-flat-field schema, which
// was confirmed empty on every existing row before dropping it.

interface Cliente { nombre_completo: string; pais: string; empresa_o_marca: string; red_o_aseguradora: string; }
interface IdentidadEstrategica {
  arquetipo_operativo: string; mercado_real_atiende: string; palanca_historica_crecimiento: string;
  nivel_autoridad_mercado: string; evidencia_nivel_autoridad: string;
}
interface EstadoActual {
  reuniones_por_semana: string; tasa_cierre_estimada: string; ticket_promedio: string;
  canal_adquisicion_actual: string; tiene_equipo: string; tiene_crm: string; capacidad_operativa: string;
}
interface EstadoDeseado {
  objetivo_declarado: string; objetivo_real_inferido: string; evidencia_objetivo_inferido: string;
  definicion_exito_90_dias: string; evidencia_definicion_exito: string;
}
interface Constraints { mercado: string; mentalidad: string; infraestructura: string; capacidad: string; }
interface Riesgo { tipo: string; descripcion: string; severidad: string; }
interface Inteligencia {
  detonante_compra: string; evidencia_detonante: string; frases_exactas_cliente: string[]; oportunidades_identificadas: string;
}
interface Sintesis { mayor_apalancamiento: string; mayor_riesgo: string; señal_exito_30_dias: string; }

const emptyCliente: Cliente = { nombre_completo: '', pais: '', empresa_o_marca: '', red_o_aseguradora: '' };
const emptyIdentidad: IdentidadEstrategica = {
  arquetipo_operativo: '', mercado_real_atiende: '', palanca_historica_crecimiento: '',
  nivel_autoridad_mercado: '', evidencia_nivel_autoridad: '',
};
const emptyEstadoActual: EstadoActual = {
  reuniones_por_semana: '', tasa_cierre_estimada: '', ticket_promedio: '',
  canal_adquisicion_actual: '', tiene_equipo: '', tiene_crm: '', capacidad_operativa: '',
};
const emptyEstadoDeseado: EstadoDeseado = {
  objetivo_declarado: '', objetivo_real_inferido: '', evidencia_objetivo_inferido: '',
  definicion_exito_90_dias: '', evidencia_definicion_exito: '',
};
const emptyConstraints: Constraints = { mercado: '', mentalidad: '', infraestructura: '', capacidad: '' };
const emptyInteligencia: Inteligencia = {
  detonante_compra: '', evidencia_detonante: '', frases_exactas_cliente: [], oportunidades_identificadas: '',
};
const emptySintesis: Sintesis = { mayor_apalancamiento: '', mayor_riesgo: '', señal_exito_30_dias: '' };

interface CSB {
  id: string;
  drive_csl_id: string | null;
  updated_at: string | null;
  revisado: boolean;
  brief_document: string | null;
  cliente: Cliente;
  identidad_estrategica: IdentidadEstrategica;
  estado_actual: EstadoActual;
  estado_deseado: EstadoDeseado;
  constraints: Constraints;
  riesgos: Riesgo[];
  inteligencia: Inteligencia;
  sintesis: Sintesis;
}

interface CSBForm {
  drive_csl_id: string;
  revisado: boolean;
  brief_document: string;
  cliente: Cliente;
  identidad_estrategica: IdentidadEstrategica;
  estado_actual: EstadoActual;
  estado_deseado: EstadoDeseado;
  constraints: Constraints;
  riesgos: Riesgo[];
  inteligencia: Inteligencia;
  sintesis: Sintesis;
}

const emptyForm: CSBForm = {
  drive_csl_id: '',
  revisado: false,
  brief_document: '',
  cliente: emptyCliente,
  identidad_estrategica: emptyIdentidad,
  estado_actual: emptyEstadoActual,
  estado_deseado: emptyEstadoDeseado,
  constraints: emptyConstraints,
  riesgos: [],
  inteligencia: emptyInteligencia,
  sintesis: emptySintesis,
};

const NIVEL_AUTORIDAD_OPTIONS = ['1', '2', '3'] as const;
const SEVERIDAD_OPTIONS = ['alta', 'media', 'baja'] as const;

// ─── ListEditor ───────────────────────────────────────────────────────────────
// Generic add/remove list editor reused for every jsonb list below (plain
// string rows like frases_exactas_cliente, or object rows like riesgos) —
// unchanged from the v1 CSB, no need to duplicate it.

function ListEditor<T>({ items, onChange, renderRow, newItem, addLabel, emptyMessage }: {
  items: T[];
  onChange: (items: T[]) => void;
  renderRow: (item: T, setItem: (value: T) => void) => React.ReactNode;
  newItem: () => T;
  addLabel: string;
  emptyMessage: string;
}) {
  function setAt(i: number, value: T) {
    onChange(items.map((it, idx) => (idx === i ? value : it)));
  }
  function removeAt(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1">{renderRow(item, (value) => setAt(i, value))}</div>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-destructive/50 hover:text-destructive shrink-0"
            onClick={() => removeAt(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-muted-foreground">{emptyMessage}</p>}
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onChange([...items, newItem()])}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />{addLabel}
      </Button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
}

export default function TabCSB({ clientId }: Props) {
  const [csb, setCsb] = useState<CSB | null>(null);
  const [form, setForm] = useState<CSBForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchCSB = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_csb')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    if (error) {
      toast.error('Error al cargar CSB');
    } else if (data) {
      const row: CSB = {
        id: data.id,
        drive_csl_id: data.drive_csl_id,
        updated_at: data.updated_at,
        revisado: data.revisado,
        brief_document: data.brief_document,
        cliente: { ...emptyCliente, ...(data.cliente as Partial<Cliente> ?? {}) },
        identidad_estrategica: { ...emptyIdentidad, ...(data.identidad_estrategica as Partial<IdentidadEstrategica> ?? {}) },
        estado_actual: { ...emptyEstadoActual, ...(data.estado_actual as Partial<EstadoActual> ?? {}) },
        estado_deseado: { ...emptyEstadoDeseado, ...(data.estado_deseado as Partial<EstadoDeseado> ?? {}) },
        constraints: { ...emptyConstraints, ...(data.constraints as Partial<Constraints> ?? {}) },
        riesgos: (data.riesgos as Riesgo[] | null) ?? [],
        inteligencia: { ...emptyInteligencia, ...(data.inteligencia as Partial<Inteligencia> ?? {}) },
        sintesis: { ...emptySintesis, ...(data.sintesis as Partial<Sintesis> ?? {}) },
      };
      setCsb(row);
      setForm({
        drive_csl_id: row.drive_csl_id ?? '',
        revisado: row.revisado,
        brief_document: row.brief_document ?? '',
        cliente: row.cliente,
        identidad_estrategica: row.identidad_estrategica,
        estado_actual: row.estado_actual,
        estado_deseado: row.estado_deseado,
        constraints: row.constraints,
        riesgos: row.riesgos,
        inteligencia: row.inteligencia,
        sintesis: row.sintesis,
      });
    }
    setLoading(false);
    setDirty(false);
  }, [clientId]);

  useEffect(() => { fetchCSB(); }, [fetchCSB]);

  function setDriveCslId(value: string) {
    setForm(prev => ({ ...prev, drive_csl_id: value }));
    setDirty(true);
  }
  function setBriefDocument(value: string) {
    setForm(prev => ({ ...prev, brief_document: value }));
    setDirty(true);
  }
  function setCliente(patch: Partial<Cliente>) {
    setForm(prev => ({ ...prev, cliente: { ...prev.cliente, ...patch } }));
    setDirty(true);
  }
  function setIdentidad(patch: Partial<IdentidadEstrategica>) {
    setForm(prev => ({ ...prev, identidad_estrategica: { ...prev.identidad_estrategica, ...patch } }));
    setDirty(true);
  }
  function setEstadoActual(patch: Partial<EstadoActual>) {
    setForm(prev => ({ ...prev, estado_actual: { ...prev.estado_actual, ...patch } }));
    setDirty(true);
  }
  function setEstadoDeseado(patch: Partial<EstadoDeseado>) {
    setForm(prev => ({ ...prev, estado_deseado: { ...prev.estado_deseado, ...patch } }));
    setDirty(true);
  }
  function setConstraints(patch: Partial<Constraints>) {
    setForm(prev => ({ ...prev, constraints: { ...prev.constraints, ...patch } }));
    setDirty(true);
  }
  function setRiesgos(items: Riesgo[]) {
    setForm(prev => ({ ...prev, riesgos: items }));
    setDirty(true);
  }
  function setInteligencia(patch: Partial<Inteligencia>) {
    setForm(prev => ({ ...prev, inteligencia: { ...prev.inteligencia, ...patch } }));
    setDirty(true);
  }
  function setFrasesExactas(items: string[]) {
    setInteligencia({ frases_exactas_cliente: items });
  }
  function setSintesis(patch: Partial<Sintesis>) {
    setForm(prev => ({ ...prev, sintesis: { ...prev.sintesis, ...patch } }));
    setDirty(true);
  }

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: text } = await mammoth.extractRawText({ arrayBuffer });
      if (!text.trim()) {
        toast.error('No se pudo extraer texto del documento');
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-csb-from-doc', {
        body: { text },
      });
      if (error) throw error;

      // generate-csb-from-doc still returns its own old flat-field shape
      // (oferta/icp/mercado/precio/garantia) — none of those fields exist
      // in this schema anymore. Nothing here to map cleanly, so this
      // import path is effectively retired for this tab; kept only
      // because a separate prompt said not to touch that function.
      if (!data?.data) {
        toast.error('La IA no devolvió campos extraídos');
        return;
      }
      toast.error('El importador de Word usa el schema viejo del CSB — no hay campos compatibles con la estructura actual. Usá "Generar desde transcripción" en su lugar.');
    } catch (err) {
      console.error('[TabCSB] import from Word failed:', err);
      toast.error('Error al importar el documento');
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateFromTranscript = async () => {
    if (!transcriptText.trim()) { toast.error('Pegá una transcripción primero'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-csb-from-transcript', {
        body: { client_id: clientId, transcripcion: transcriptText },
      });
      if (error) throw error;

      if (!data.success) {
        toast.error(data.error ?? 'Error al generar el CSB');
        return;
      }

      const extracted = data.data as Partial<CSB> & Record<string, unknown>;
      setForm({
        drive_csl_id: form.drive_csl_id, // no tocar — es del CSL, no de la transcripción
        revisado: false,
        brief_document: (extracted.brief_document as string | null) ?? '',
        cliente: { ...emptyCliente, ...(extracted.cliente as Partial<Cliente> ?? {}) },
        identidad_estrategica: { ...emptyIdentidad, ...(extracted.identidad_estrategica as Partial<IdentidadEstrategica> ?? {}) },
        estado_actual: { ...emptyEstadoActual, ...(extracted.estado_actual as Partial<EstadoActual> ?? {}) },
        estado_deseado: { ...emptyEstadoDeseado, ...(extracted.estado_deseado as Partial<EstadoDeseado> ?? {}) },
        constraints: { ...emptyConstraints, ...(extracted.constraints as Partial<Constraints> ?? {}) },
        riesgos: (extracted.riesgos as Riesgo[] | undefined) ?? [],
        inteligencia: { ...emptyInteligencia, ...(extracted.inteligencia as Partial<Inteligencia> ?? {}) },
        sintesis: { ...emptySintesis, ...(extracted.sintesis as Partial<Sintesis> ?? {}) },
      });
      setDirty(true);
      setTranscriptOpen(false);
      setTranscriptText('');

      if (data.warning) {
        toast(data.warning, { icon: <AlertTriangle className="h-4 w-4 text-warning" /> });
      } else {
        toast.success('CSB generado — revisá los campos y guardá los cambios');
      }
    } catch (err) {
      console.error('[TabCSB] generate from transcript failed:', err);
      toast.error('Error al generar el CSB desde la transcripción');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const payload = {
      client_id: clientId,
      drive_csl_id: form.drive_csl_id || null,
      revisado: form.revisado,
      brief_document: form.brief_document || null,
      cliente: form.cliente,
      identidad_estrategica: form.identidad_estrategica,
      estado_actual: form.estado_actual,
      estado_deseado: form.estado_deseado,
      constraints: form.constraints,
      riesgos: form.riesgos,
      inteligencia: form.inteligencia,
      sintesis: form.sintesis,
      updated_at: new Date().toISOString(),
    };

    const { error } = csb
      ? await supabase.from('client_csb').update(payload).eq('id', csb.id)
      : await supabase.from('client_csb').insert(payload);

    setSaving(false);

    if (error) {
      toast.error('Error al guardar CSB');
      return;
    }

    toast.success('CSB guardado');
    fetchCSB();
  };

  const handleMarkReviewed = async () => {
    if (!csb) { toast.error('Guardá el CSB antes de marcarlo como revisado'); return; }
    const { error } = await supabase.from('client_csb').update({ revisado: true }).eq('id', csb.id);
    if (error) { toast.error('Error al marcar como revisado'); return; }
    setForm(prev => ({ ...prev, revisado: true }));
    setCsb(prev => prev ? { ...prev, revisado: true } : prev);
    toast.success('CSB marcado como revisado');
  };

  const handleCopyBrief = async () => {
    if (!form.brief_document) return;
    await navigator.clipboard.writeText(form.brief_document);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const lastUpdated = csb?.updated_at
    ? (() => {
        try {
          const d = parseISO(csb.updated_at);
          return isValid(d) ? format(d, "d MMM yyyy, HH:mm", { locale: es }) : null;
        } catch { return null; }
      })()
    : null;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-medium">
            Client Strategy Brief
          </CardTitle>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground ml-2">
              Actualizado {lastUpdated}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button variant="outline" size="sm" onClick={handleImportClick} disabled={importing}>
            {importing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            Importar desde Word
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTranscriptOpen(true)}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Generar desde transcripción
          </Button>
          {form.drive_csl_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(
                form.drive_csl_id!.startsWith('http')
                  ? form.drive_csl_id!
                  : `https://docs.google.com/document/d/${form.drive_csl_id}`,
                '_blank',
                'noopener,noreferrer'
              )}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Abrir CSL en Drive
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !dirty} size="sm" className="bg-primary">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            {csb ? 'Guardar cambios' : 'Crear CSB'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {!form.revisado && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Generado por IA — pendiente de revisión humana. Todos los campos son editables.
            </div>
            <Button variant="outline" size="sm" className="border-warning/40 shrink-0" onClick={handleMarkReviewed}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Marcar como revisado
            </Button>
          </div>
        )}

        {/* ── Bloque 1: Cliente ──────────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre completo</Label>
              <Input value={form.cliente.nombre_completo} onChange={e => setCliente({ nombre_completo: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label>País</Label>
              <Input value={form.cliente.pais} onChange={e => setCliente({ pais: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label>Empresa o marca</Label>
              <Input value={form.cliente.empresa_o_marca} onChange={e => setCliente({ empresa_o_marca: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label>Red o aseguradora</Label>
              <Input value={form.cliente.red_o_aseguradora} onChange={e => setCliente({ red_o_aseguradora: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 2: Identidad estratégica ────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identidad estratégica</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Arquetipo operativo</Label>
              <Textarea value={form.identidad_estrategica.arquetipo_operativo} onChange={e => setIdentidad({ arquetipo_operativo: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Mercado real que atiende</Label>
              <Textarea value={form.identidad_estrategica.mercado_real_atiende} onChange={e => setIdentidad({ mercado_real_atiende: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Palanca histórica de crecimiento</Label>
              <Textarea value={form.identidad_estrategica.palanca_historica_crecimiento} onChange={e => setIdentidad({ palanca_historica_crecimiento: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div>
              <Label>Nivel de autoridad en el mercado</Label>
              <Select value={form.identidad_estrategica.nivel_autoridad_mercado || undefined} onValueChange={v => setIdentidad({ nivel_autoridad_mercado: v })}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue placeholder="Sin definir" /></SelectTrigger>
                <SelectContent>
                  {NIVEL_AUTORIDAD_OPTIONS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Evidencia (nivel de autoridad)</Label>
              <Input value={form.identidad_estrategica.evidencia_nivel_autoridad} onChange={e => setIdentidad({ evidencia_nivel_autoridad: e.target.value })} className="bg-secondary/50 mt-1" placeholder="[cita textual de la transcripción]" />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 3: Estado actual ─────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado actual</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Reuniones por semana</Label>
              <Input value={form.estado_actual.reuniones_por_semana} onChange={e => setEstadoActual({ reuniones_por_semana: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label>Tasa de cierre estimada</Label>
              <Input value={form.estado_actual.tasa_cierre_estimada} onChange={e => setEstadoActual({ tasa_cierre_estimada: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label>Ticket promedio</Label>
              <Input value={form.estado_actual.ticket_promedio} onChange={e => setEstadoActual({ ticket_promedio: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label>Canal de adquisición actual</Label>
              <Input value={form.estado_actual.canal_adquisicion_actual} onChange={e => setEstadoActual({ canal_adquisicion_actual: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label>¿Tiene equipo?</Label>
              <Input value={form.estado_actual.tiene_equipo} onChange={e => setEstadoActual({ tiene_equipo: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
            <div>
              <Label>¿Tiene CRM?</Label>
              <Input value={form.estado_actual.tiene_crm} onChange={e => setEstadoActual({ tiene_crm: e.target.value })} className="bg-secondary/50 mt-1" />
            </div>
            <div className="col-span-2">
              <Label>Capacidad operativa</Label>
              <Textarea value={form.estado_actual.capacidad_operativa} onChange={e => setEstadoActual({ capacidad_operativa: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 4: Estado deseado ────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado deseado</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Objetivo declarado</Label>
              <Textarea value={form.estado_deseado.objetivo_declarado} onChange={e => setEstadoDeseado({ objetivo_declarado: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Objetivo real inferido</Label>
              <Textarea value={form.estado_deseado.objetivo_real_inferido} onChange={e => setEstadoDeseado({ objetivo_real_inferido: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Evidencia (objetivo inferido)</Label>
              <Input value={form.estado_deseado.evidencia_objetivo_inferido} onChange={e => setEstadoDeseado({ evidencia_objetivo_inferido: e.target.value })} className="bg-secondary/50 mt-1" placeholder="[cita textual de la transcripción]" />
            </div>
            <div className="col-span-2">
              <Label>Definición de éxito a 90 días</Label>
              <Textarea value={form.estado_deseado.definicion_exito_90_dias} onChange={e => setEstadoDeseado({ definicion_exito_90_dias: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Evidencia (definición de éxito)</Label>
              <Input value={form.estado_deseado.evidencia_definicion_exito} onChange={e => setEstadoDeseado({ evidencia_definicion_exito: e.target.value })} className="bg-secondary/50 mt-1" placeholder="[cita textual de la transcripción]" />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 5: Constraints ───────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Constraints</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mercado</Label>
              <Textarea value={form.constraints.mercado} onChange={e => setConstraints({ mercado: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div>
              <Label>Mentalidad</Label>
              <Textarea value={form.constraints.mentalidad} onChange={e => setConstraints({ mentalidad: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div>
              <Label>Infraestructura</Label>
              <Textarea value={form.constraints.infraestructura} onChange={e => setConstraints({ infraestructura: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div>
              <Label>Capacidad</Label>
              <Textarea value={form.constraints.capacidad} onChange={e => setConstraints({ capacidad: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 6: Riesgos ───────────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Riesgos</h3>
          <ListEditor
            items={form.riesgos}
            onChange={setRiesgos}
            newItem={() => ({ tipo: '', descripcion: '', severidad: 'media' })}
            addLabel="Agregar riesgo"
            emptyMessage="Sin riesgos registrados."
            renderRow={(item, setItem) => (
              <div className="grid grid-cols-4 gap-2">
                <Input value={item.tipo} onChange={e => setItem({ ...item, tipo: e.target.value })} className="bg-secondary/50" placeholder="Tipo de riesgo" />
                <Input value={item.descripcion} onChange={e => setItem({ ...item, descripcion: e.target.value })} className="bg-secondary/50 col-span-2" placeholder="Descripción" />
                <Select value={item.severidad || undefined} onValueChange={v => setItem({ ...item, severidad: v })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Severidad" /></SelectTrigger>
                  <SelectContent>
                    {SEVERIDAD_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 7: Inteligencia ──────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inteligencia</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Detonante de compra</Label>
              <Textarea value={form.inteligencia.detonante_compra} onChange={e => setInteligencia({ detonante_compra: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Evidencia (detonante)</Label>
              <Input value={form.inteligencia.evidencia_detonante} onChange={e => setInteligencia({ evidencia_detonante: e.target.value })} className="bg-secondary/50 mt-1" placeholder="[cita textual de la transcripción]" />
            </div>
            <div className="col-span-2">
              <Label className="mb-1.5 block">Frases exactas del cliente</Label>
              <ListEditor
                items={form.inteligencia.frases_exactas_cliente}
                onChange={setFrasesExactas}
                newItem={() => ''}
                addLabel="Agregar frase"
                emptyMessage="Sin frases registradas."
                renderRow={(value, setValue) => (
                  <Input value={value} onChange={e => setValue(e.target.value)} className="bg-secondary/50" placeholder="Cita textual del cliente" />
                )}
              />
            </div>
            <div className="col-span-2">
              <Label>Oportunidades identificadas</Label>
              <Textarea value={form.inteligencia.oportunidades_identificadas} onChange={e => setInteligencia({ oportunidades_identificadas: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Síntesis (Criterio de ejecución) ────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Criterio de ejecución <span className="text-warning">[REQUIERE VALIDACIÓN]</span>
          </h3>
          <div className="space-y-3">
            <div>
              <Label>Mayor apalancamiento</Label>
              <Textarea value={form.sintesis.mayor_apalancamiento} onChange={e => setSintesis({ mayor_apalancamiento: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div>
              <Label>Mayor riesgo</Label>
              <Textarea value={form.sintesis.mayor_riesgo} onChange={e => setSintesis({ mayor_riesgo: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
            <div>
              <Label>Señal de éxito en 30 días</Label>
              <Textarea value={form.sintesis.señal_exito_30_dias} onChange={e => setSintesis({ señal_exito_30_dias: e.target.value })} className="bg-secondary/50 mt-1 resize-none" rows={2} />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Brief completo (Markdown, para Word) ────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brief completo (Markdown)</h3>
            {form.brief_document && (
              <Button variant="outline" size="sm" onClick={handleCopyBrief}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copied ? 'Copiado' : 'Copiar para Word'}
              </Button>
            )}
          </div>
          <Textarea
            value={form.brief_document}
            onChange={e => setBriefDocument(e.target.value)}
            className="bg-secondary/50 resize-none font-mono text-xs"
            rows={12}
            placeholder="Generá el brief desde una transcripción, o pegalo manualmente acá."
          />
        </section>

        <Separator className="bg-border/40" />

        {/* ── Documentos ───────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documentos</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>ID o URL del CSL en Google Drive</Label>
              <Input
                value={form.drive_csl_id}
                onChange={e => setDriveCslId(e.target.value)}
                className="bg-secondary/50 mt-1 font-mono text-sm"
                placeholder="https://docs.google.com/... o ID del documento"
              />
            </div>
          </div>
        </section>

      </CardContent>

      <Dialog open={transcriptOpen} onOpenChange={setTranscriptOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generar CSB desde transcripción</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Pegá la transcripción completa de la llamada de venta</Label>
            <Textarea
              value={transcriptText}
              onChange={e => setTranscriptText(e.target.value)}
              className="bg-secondary/50 resize-none"
              rows={16}
              placeholder="Cliente: ...&#10;Closer: ..."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTranscriptOpen(false)} disabled={generating}>Cancelar</Button>
            <Button onClick={handleGenerateFromTranscript} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {generating ? 'Generando…' : 'Generar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
