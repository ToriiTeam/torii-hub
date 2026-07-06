import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, ExternalLink, FileText, Loader2, Upload } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import mammoth from 'mammoth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CSB {
  id: string;
  oferta: string | null;
  icp: string | null;
  mercado: string | null;
  angulo_principal: string | null;
  hipotesis_activa: string | null;
  objecion_principal: string | null;
  propuesta_de_valor: string | null;
  precio: number | null;
  garantia: string | null;
  drive_csl_id: string | null;
  notas: string | null;
  updated_at: string | null;
}

type CSBForm = Omit<CSB, 'id' | 'updated_at'> & { precio: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyForm: CSBForm = {
  oferta:            '',
  icp:               '',
  mercado:           '',
  angulo_principal:  '',
  hipotesis_activa:  '',
  objecion_principal:'',
  propuesta_de_valor:'',
  precio:            '',
  garantia:          '',
  drive_csl_id:      '',
  notas:             '',
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setCsb(data as CSB);
      setForm({
        oferta:             data.oferta ?? '',
        icp:                data.icp ?? '',
        mercado:            data.mercado ?? '',
        angulo_principal:   data.angulo_principal ?? '',
        hipotesis_activa:   data.hipotesis_activa ?? '',
        objecion_principal: data.objecion_principal ?? '',
        propuesta_de_valor: data.propuesta_de_valor ?? '',
        precio:             data.precio != null ? String(data.precio) : '',
        garantia:           data.garantia ?? '',
        drive_csl_id:       data.drive_csl_id ?? '',
        notas:              data.notas ?? '',
      });
    }
    setLoading(false);
    setDirty(false);
  }, [clientId]);

  useEffect(() => { fetchCSB(); }, [fetchCSB]);

  const setField = (key: keyof CSBForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

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

      const extracted = data?.data as Partial<Record<keyof CSBForm, string | number | null>> | undefined;
      if (!extracted) {
        toast.error('La IA no devolvió campos extraídos');
        return;
      }

      setForm(prev => ({
        ...prev,
        oferta: extracted.oferta != null ? String(extracted.oferta) : prev.oferta,
        icp: extracted.icp != null ? String(extracted.icp) : prev.icp,
        mercado: extracted.mercado != null ? String(extracted.mercado) : prev.mercado,
        angulo_principal: extracted.angulo_principal != null ? String(extracted.angulo_principal) : prev.angulo_principal,
        hipotesis_activa: extracted.hipotesis_activa != null ? String(extracted.hipotesis_activa) : prev.hipotesis_activa,
        objecion_principal: extracted.objecion_principal != null ? String(extracted.objecion_principal) : prev.objecion_principal,
        propuesta_de_valor: extracted.propuesta_de_valor != null ? String(extracted.propuesta_de_valor) : prev.propuesta_de_valor,
        precio: extracted.precio != null ? String(extracted.precio) : prev.precio,
        garantia: extracted.garantia != null ? String(extracted.garantia) : prev.garantia,
      }));
      setDirty(true);
      toast.success('Campos autocompletados — revisá y guardá los cambios');
    } catch (err) {
      console.error('[TabCSB] import from Word failed:', err);
      toast.error('Error al importar el documento');
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const payload = {
      client_id:          clientId,
      oferta:             form.oferta || null,
      icp:                form.icp || null,
      mercado:            form.mercado || null,
      angulo_principal:   form.angulo_principal || null,
      hipotesis_activa:   form.hipotesis_activa || null,
      objecion_principal: form.objecion_principal || null,
      propuesta_de_valor: form.propuesta_de_valor || null,
      precio:             form.precio ? parseFloat(form.precio) : null,
      garantia:           form.garantia || null,
      drive_csl_id:       form.drive_csl_id || null,
      notas:              form.notas || null,
      updated_at:         new Date().toISOString(),
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            disabled={importing}
          >
            {importing
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5 mr-1.5" />
            }
            Importar desde Word
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
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            size="sm"
            className="bg-primary"
          >
            {saving
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <Save className="h-3.5 w-3.5 mr-1.5" />
            }
            {csb ? 'Guardar cambios' : 'Crear CSB'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── Bloque 1: Oferta ───────────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Oferta
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Descripción de la oferta</Label>
              <Textarea
                value={form.oferta ?? ''}
                onChange={e => setField('oferta', e.target.value)}
                className="bg-secondary/50 mt-1 resize-none"
                rows={3}
                placeholder="Qué entrega Torii exactamente en este engagement..."
              />
            </div>
            <div className="col-span-2">
              <Label>Propuesta de valor</Label>
              <Textarea
                value={form.propuesta_de_valor ?? ''}
                onChange={e => setField('propuesta_de_valor', e.target.value)}
                className="bg-secondary/50 mt-1 resize-none"
                rows={2}
                placeholder="Por qué este cliente eligió Torii sobre otras alternativas..."
              />
            </div>
            <div>
              <Label>Precio (USD)</Label>
              <Input
                type="number"
                min="0"
                value={form.precio ?? ''}
                onChange={e => setField('precio', e.target.value)}
                className="bg-secondary/50 mt-1"
                placeholder="4500"
              />
            </div>
            <div>
              <Label>Garantía</Label>
              <Input
                value={form.garantia ?? ''}
                onChange={e => setField('garantia', e.target.value)}
                className="bg-secondary/50 mt-1"
                placeholder="Ej: 12-20 clientes o devolvemos el 50%"
              />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 2: Mercado y cliente ideal ─────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mercado y cliente ideal
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mercado</Label>
              <Input
                value={form.mercado ?? ''}
                onChange={e => setField('mercado', e.target.value)}
                className="bg-secondary/50 mt-1"
                placeholder="Ej: Asesores financieros España"
              />
            </div>
            <div className="col-span-1" />
            <div className="col-span-2">
              <Label>ICP — Cliente ideal (Ideal Customer Profile)</Label>
              <Textarea
                value={form.icp ?? ''}
                onChange={e => setField('icp', e.target.value)}
                className="bg-secondary/50 mt-1 resize-none"
                rows={3}
                placeholder="Características del prospecto ideal: cargo, experiencia, situación actual, motivación..."
              />
            </div>
            <div className="col-span-2">
              <Label>Objeción principal</Label>
              <Textarea
                value={form.objecion_principal ?? ''}
                onChange={e => setField('objecion_principal', e.target.value)}
                className="bg-secondary/50 mt-1 resize-none"
                rows={2}
                placeholder="La objeción más frecuente que frena al prospecto ideal..."
              />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 3: Estrategia de contenido ─────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Estrategia publicitaria
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ángulo principal</Label>
              <Input
                value={form.angulo_principal ?? ''}
                onChange={e => setField('angulo_principal', e.target.value)}
                className="bg-secondary/50 mt-1"
                placeholder="Ej: Miedo al estancamiento"
              />
            </div>
            <div className="col-span-1" />
            <div className="col-span-2">
              <Label>Hipótesis activa</Label>
              <Textarea
                value={form.hipotesis_activa ?? ''}
                onChange={e => setField('hipotesis_activa', e.target.value)}
                className="bg-secondary/50 mt-1 resize-none"
                rows={3}
                placeholder="Qué estamos testando actualmente y por qué creemos que va a funcionar..."
              />
            </div>
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 4: Documentos ──────────────────────────────────────── */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Documentos
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>ID o URL del CSL en Google Drive</Label>
              <Input
                value={form.drive_csl_id ?? ''}
                onChange={e => setField('drive_csl_id', e.target.value)}
                className="bg-secondary/50 mt-1 font-mono text-sm"
                placeholder="https://docs.google.com/... o ID del documento"
              />
            </div>
            {form.drive_csl_id && (
              <Button
                variant="outline"
                onClick={() => window.open(
                  form.drive_csl_id!.startsWith('http')
                    ? form.drive_csl_id!
                    : `https://docs.google.com/document/d/${form.drive_csl_id}`,
                  '_blank',
                  'noopener,noreferrer'
                )}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Abrir CSL en Drive
              </Button>
            )}
          </div>
        </section>

        <Separator className="bg-border/40" />

        {/* ── Bloque 5: Notas libres ────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notas
          </h3>
          <Textarea
            value={form.notas ?? ''}
            onChange={e => setField('notas', e.target.value)}
            className="bg-secondary/50 resize-none"
            rows={4}
            placeholder="Contexto adicional, decisiones tomadas, historial relevante..."
          />
        </section>

      </CardContent>
    </Card>
  );
}
