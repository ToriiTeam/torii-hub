import { useEffect, useMemo, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Plus, Trash2, FileText, Upload, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchSteps, addStep, toggleStep, deleteStep,
  addDependency, removeDependency, fetchDocuments, uploadDocument, deleteDocument, updateProcess,
} from '@/features/roadmap/lib/roadmapRepo';
import {
  STATUS_LABELS, RESPONSABLE_OPTIONS, DOCUMENT_TIPO_LABELS,
} from '@/features/roadmap/types';
import type {
  RoadmapProcess, RoadmapProcessStep, RoadmapProcessDependency, RoadmapDocument,
  ProcessStatus, Responsable, DocumentTipo,
} from '@/features/roadmap/types';
import { CycleLoopDiagram } from './CycleLoopDiagram';

const STATUSES = Object.keys(STATUS_LABELS) as ProcessStatus[];

interface FormState {
  nombre: string;
  objetivo: string;
  cuando: string;
  como_construirlo: string;
  depende_de: string;
  condiciona_a: string;
  responsable: Responsable | '';
  status: ProcessStatus;
  fecha_inicio: string;
  fecha_fin: string;
}

function toForm(p: RoadmapProcess): FormState {
  return {
    nombre: p.nombre,
    objetivo: p.objetivo ?? '',
    cuando: p.cuando ?? '',
    como_construirlo: p.como_construirlo ?? '',
    depende_de: p.depende_de ?? '',
    condiciona_a: p.condiciona_a ?? '',
    responsable: p.responsable ?? '',
    status: p.status,
    fecha_inicio: p.fecha_inicio ?? '',
    fecha_fin: p.fecha_fin ?? '',
  };
}

interface Props {
  clientId: string;
  process: RoadmapProcess | null;
  allProcesses: RoadmapProcess[];
  dependencies: RoadmapProcessDependency[];
  onClose: () => void;
  onOpenProcess: (processId: string) => void;
  onChanged: () => void;
}

// Panel único para TODO proceso, normal o ciclo — mismo Sheet, mismos
// campos (objetivo/cuándo/cómo construirlo/depende de/condiciona a/
// responsable/status+fechas), más checklist y documentos. Si es_ciclo,
// además muestra el diagrama de sus etapas (children por parent_process_id).
export function ProcessDetailPanel({ clientId, process, allProcesses, dependencies, onClose, onOpenProcess, onChanged }: Props) {
  const [form, setForm] = useState<FormState | null>(process ? toForm(process) : null);
  const [saving, setSaving] = useState(false);

  const [steps, setSteps] = useState<RoadmapProcessStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [newStepText, setNewStepText] = useState('');

  const [documents, setDocuments] = useState<RoadmapDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docTitulo, setDocTitulo] = useState('');
  const [docTipo, setDocTipo] = useState<DocumentTipo>('sop');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [addDepId, setAddDepId] = useState('');
  const [savingDep, setSavingDep] = useState(false);

  const docFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(process ? toForm(process) : null);
    setNewStepText('');
    setDocTitulo('');
    setDocTipo('sop');
    setAddDepId('');
    if (!process) { setSteps([]); setDocuments([]); return; }

    setLoadingSteps(true);
    fetchSteps(process.id).then(setSteps).catch((err) => {
      console.error('[ProcessDetailPanel] failed to load steps:', err);
    }).finally(() => setLoadingSteps(false));

    setLoadingDocs(true);
    fetchDocuments(clientId).then((docs) => setDocuments(docs.filter((d) => d.process_id === process.id))).catch((err) => {
      console.error('[ProcessDetailPanel] failed to load documents:', err);
    }).finally(() => setLoadingDocs(false));
  }, [process, clientId]);

  const childStages = useMemo(
    () => (process ? allProcesses.filter((p) => p.parent_process_id === process.id) : []),
    [process, allProcesses],
  );

  const dependsOn = useMemo(
    () => (process ? dependencies.filter((d) => d.process_id === process.id) : []),
    [process, dependencies],
  );
  const dependedBy = useMemo(
    () => (process ? dependencies.filter((d) => d.depends_on_process_id === process.id) : []),
    [process, dependencies],
  );
  const processById = useMemo(() => new Map(allProcesses.map((p) => [p.id, p])), [allProcesses]);

  const dependencyOptions = useMemo(
    () => allProcesses.filter((p) => p.id !== process?.id && !dependsOn.some((d) => d.depends_on_process_id === p.id)),
    [allProcesses, process, dependsOn],
  );

  if (!process || !form) return null;

  function upd<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!process || !form) return;
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      await updateProcess(process.id, {
        nombre: form.nombre.trim(),
        objetivo: form.objetivo || null,
        cuando: form.cuando || null,
        como_construirlo: form.como_construirlo || null,
        depende_de: form.depende_de || null,
        condiciona_a: form.condiciona_a || null,
        responsable: form.responsable || null,
        status: form.status,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
      });
      toast.success('Guardado');
      onChanged();
    } catch (err) {
      console.error('[ProcessDetailPanel] save failed:', err);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStep() {
    if (!newStepText.trim() || !process) return;
    try {
      const step = await addStep(process.id, newStepText.trim(), steps.length + 1);
      setSteps((prev) => [...prev, step]);
      setNewStepText('');
    } catch (err) {
      console.error('[ProcessDetailPanel] add step failed:', err);
      toast.error('Error al agregar el paso');
    }
  }

  async function handleToggleStep(step: RoadmapProcessStep) {
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, completado: !s.completado } : s)));
    try {
      await toggleStep(step.id, !step.completado);
    } catch (err) {
      console.error('[ProcessDetailPanel] toggle step failed:', err);
      toast.error('Error al actualizar el paso');
      setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, completado: step.completado } : s)));
    }
  }

  async function handleDeleteStep(id: string) {
    try {
      await deleteStep(id);
      setSteps((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('[ProcessDetailPanel] delete step failed:', err);
      toast.error('Error al eliminar el paso');
    }
  }

  async function handleAddDependency() {
    if (!addDepId || !process) return;
    setSavingDep(true);
    try {
      await addDependency(process.id, addDepId);
      setAddDepId('');
      onChanged();
    } catch (err) {
      console.error('[ProcessDetailPanel] add dependency failed:', err);
      toast.error('Error al vincular el proceso');
    } finally {
      setSavingDep(false);
    }
  }

  async function handleRemoveDependency(id: string) {
    try {
      await removeDependency(id);
      onChanged();
    } catch (err) {
      console.error('[ProcessDetailPanel] remove dependency failed:', err);
      toast.error('Error al desvincular el proceso');
    }
  }

  async function handleUploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !process) return;
    if (!docTitulo.trim()) { toast.error('Escribí un título primero'); return; }
    setUploadingDoc(true);
    try {
      const doc = await uploadDocument(clientId, process.id, process.phase_id, docTitulo.trim(), docTipo, file);
      setDocuments((prev) => [doc, ...prev]);
      setDocTitulo('');
      toast.success('Documento subido');
    } catch (err) {
      console.error('[ProcessDetailPanel] upload document failed:', err);
      toast.error('Error al subir el documento');
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleDeleteDocument(id: string) {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('[ProcessDetailPanel] delete document failed:', err);
      toast.error('Error al eliminar el documento');
    }
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="bg-card border-border overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {process.es_ciclo && <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">Ciclo</Badge>}
            Detalle del proceso
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => upd('nombre', e.target.value)} className="bg-secondary/50 mt-1" />
          </div>

          {process.es_ciclo && childStages.length > 0 && (
            <CycleLoopDiagram stages={childStages} onNodeClick={(p) => onOpenProcess(p.id)} />
          )}

          <div>
            <Label>Objetivo</Label>
            <Textarea rows={3} value={form.objetivo} onChange={(e) => upd('objetivo', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cuándo</Label>
              <Textarea rows={2} value={form.cuando} onChange={(e) => upd('cuando', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
            </div>
            <div>
              <Label>Cómo construirlo</Label>
              <Textarea rows={2} value={form.como_construirlo} onChange={(e) => upd('como_construirlo', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
            </div>
          </div>

          <Separator className="bg-border/40" />

          <div>
            <Label>Depende de (texto)</Label>
            <Textarea rows={2} value={form.depende_de} onChange={(e) => upd('depende_de', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
            <div className="mt-2 space-y-1.5">
              {dependsOn.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm bg-secondary/30 rounded px-2 py-1">
                  <span>{processById.get(d.depends_on_process_id)?.nombre ?? '—'}</span>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleRemoveDependency(d.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Select value={addDepId} onValueChange={setAddDepId}>
                  <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Vincular un proceso real..." /></SelectTrigger>
                  <SelectContent>
                    {dependencyOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" disabled={!addDepId || savingDep} onClick={handleAddDependency}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label>Condiciona a (texto)</Label>
            <Textarea rows={2} value={form.condiciona_a} onChange={(e) => upd('condiciona_a', e.target.value)} className="bg-secondary/50 mt-1 resize-none" />
            {dependedBy.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {dependedBy.map((d) => (
                  <div key={d.id} className="text-sm bg-secondary/30 rounded px-2 py-1 text-muted-foreground">
                    {processById.get(d.process_id)?.nombre ?? '—'}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-border/40" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsable</Label>
              <Select value={form.responsable || '__none'} onValueChange={(v) => upd('responsable', (v === '__none' ? '' : v) as Responsable)}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {RESPONSABLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => upd('status', v as ProcessStatus)}>
                <SelectTrigger className="bg-secondary/50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha inicio</Label>
              <Input type="date" value={form.fecha_inicio} onChange={(e) => upd('fecha_inicio', e.target.value)} className="bg-secondary/50 mt-1" style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <Label>Fecha fin</Label>
              <Input type="date" value={form.fecha_fin} onChange={(e) => upd('fecha_fin', e.target.value)} className="bg-secondary/50 mt-1" style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar cambios
            </Button>
          </div>

          <Separator className="bg-border/40" />

          <div>
            <Label>Checklist de sub-pasos</Label>
            <div className="mt-2 space-y-1.5">
              {loadingSteps ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando...</div>
              ) : (
                steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <Checkbox checked={step.completado} onCheckedChange={() => handleToggleStep(step)} />
                    <span className={`flex-1 text-sm ${step.completado ? 'line-through text-muted-foreground' : ''}`}>{step.texto}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteStep(step.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
              <div className="flex gap-2">
                <Input
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
                  placeholder="Nuevo sub-paso..."
                  className="bg-secondary/50 h-8"
                />
                <Button size="sm" variant="outline" onClick={handleAddStep} disabled={!newStepText.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-border/40" />

          <div>
            <Label className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" />Documentos (SOPs / playbooks)</Label>
            <div className="mt-2 space-y-1.5">
              {loadingDocs ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando...</div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between text-sm bg-secondary/30 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0">{DOCUMENT_TIPO_LABELS[doc.tipo]}</Badge>
                      <span className="truncate">{doc.titulo}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => window.open(doc.file_url, '_blank', 'noopener,noreferrer')}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteDocument(doc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <div className="flex gap-2 items-end flex-wrap pt-1">
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-xs">Título</Label>
                  <Input value={docTitulo} onChange={(e) => setDocTitulo(e.target.value)} className="bg-secondary/50 h-8" placeholder="Ej: SOP de precall" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={docTipo} onValueChange={(v) => setDocTipo(v as DocumentTipo)}>
                    <SelectTrigger className="h-8 w-32 bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DOCUMENT_TIPO_LABELS) as DocumentTipo[]).map((t) => <SelectItem key={t} value={t}>{DOCUMENT_TIPO_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <input ref={docFileInputRef} type="file" className="hidden" onChange={handleUploadDocument} />
                <Button size="sm" variant="outline" disabled={uploadingDoc || !docTitulo.trim()} onClick={() => docFileInputRef.current?.click()}>
                  {uploadingDoc ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                  Subir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
