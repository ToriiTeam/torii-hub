import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronRight, FileText, ClipboardList, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

// Ported from torii-academy's ContentManagement.tsx — same shape, just
// pointed at the academy schema (supabase.schema('academy').from(...)
// instead of supabase.from(...)) since this content library now lives
// inside the Hub's own Supabase project as a separate schema, not its own
// project. Storage calls are unchanged — buckets aren't schema-scoped.

type View = 'formaciones' | 'modules' | 'videos';

export default function TabContenido() {
  const [view, setView] = useState<View>('formaciones');
  const [selectedFormacion, setSelectedFormacion] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const [formaciones, setFormaciones] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);

  const [formacionDialog, setFormacionDialog] = useState(false);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [videoDialog, setVideoDialog] = useState(false);
  const [examDialog, setExamDialog] = useState(false);
  const [questionDialog, setQuestionDialog] = useState(false);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [formacionForm, setFormacionForm] = useState({ title: '', description: '', order_index: 0, cover_image_url: '' });
  const [uploadingFormacionCover, setUploadingFormacionCover] = useState(false);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', badge_text: '', order_index: 0, cover_image_url: '' });
  const [uploadingCover, setUploadingCover] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: '', video_url: '', order_index: 0 });
  const [examForm, setExamForm] = useState({ title: '', description: '', video_id: '', order_index: 0 });
  const [questionForm, setQuestionForm] = useState({
    question_text: '', question_type: 'multiple_choice' as string,
    options: ['', '', '', ''], correct_answer: '', order_index: 0,
  });
  const [questionExamId, setQuestionExamId] = useState('');

  const [materialVideoId, setMaterialVideoId] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDownloadable, setMaterialDownloadable] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [moduleMaterialTitle, setModuleMaterialTitle] = useState('');
  const [moduleMaterialDownloadable, setModuleMaterialDownloadable] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: f }, { data: m }, { data: v }, { data: mat }, { data: ex }, { data: eq }] = await Promise.all([
      supabase.schema('academy').from('formaciones').select('*').order('order_index'),
      supabase.schema('academy').from('modules').select('*').order('order_index'),
      supabase.schema('academy').from('videos').select('*').order('order_index'),
      supabase.schema('academy').from('module_materials').select('*').order('order_index'),
      supabase.schema('academy').from('exams').select('*').order('order_index'),
      supabase.schema('academy').from('exam_questions').select('*').order('order_index'),
    ]);
    setFormaciones(f || []);
    setModules(m || []);
    setVideos(v || []);
    setMaterials(mat || []);
    setExams(ex || []);
    setExamQuestions(eq || []);
  };

  const goToModules = (formacion: any) => { setSelectedFormacion(formacion); setView('modules'); };
  const goToVideos = (mod: any) => { setSelectedModule(mod); setView('videos'); };
  const goBack = () => {
    if (view === 'videos') { setSelectedModule(null); setView('modules'); }
    else if (view === 'modules') { setSelectedFormacion(null); setView('formaciones'); }
  };

  const openNewFormacion = () => {
    setEditingItem(null);
    setFormacionForm({ title: '', description: '', order_index: formaciones.length + 1, cover_image_url: '' });
    setFormacionDialog(true);
  };
  const openEditFormacion = (f: any) => {
    setEditingItem(f);
    setFormacionForm({ title: f.title, description: f.description || '', order_index: f.order_index, cover_image_url: f.cover_image_url || '' });
    setFormacionDialog(true);
  };
  const uploadFormacionCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFormacionCover(true);
    const filePath = `formacion-covers/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('module-materials').upload(filePath, file);
    if (uploadError) { toast.error('Error: ' + uploadError.message); setUploadingFormacionCover(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('module-materials').getPublicUrl(filePath);
    setFormacionForm(f => ({ ...f, cover_image_url: publicUrl }));
    setUploadingFormacionCover(false);
    toast.success('Imagen subida');
  };
  const saveFormacion = async () => {
    if (!formacionForm.title) { toast.error('Título requerido'); return; }
    const payload = { ...formacionForm, description: formacionForm.description || null, cover_image_url: formacionForm.cover_image_url || null };
    if (editingItem) {
      await supabase.schema('academy').from('formaciones').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.schema('academy').from('formaciones').insert(payload);
    }
    toast.success(editingItem ? 'Formación actualizada' : 'Formación creada');
    setFormacionDialog(false);
    loadData();
  };
  const deleteFormacion = async (id: string) => {
    if (!confirm('¿Eliminar esta formación y todo su contenido?')) return;
    await supabase.schema('academy').from('formaciones').delete().eq('id', id);
    toast.success('Formación eliminada');
    loadData();
  };

  const openNewModule = () => {
    setEditingItem(null);
    const filtered = modules.filter(m => m.formacion_id === selectedFormacion.id);
    setModuleForm({ title: '', description: '', badge_text: '', order_index: filtered.length + 1, cover_image_url: '' });
    setModuleDialog(true);
  };
  const openEditModule = (m: any) => {
    setEditingItem(m);
    setModuleForm({ title: m.title, description: m.description || '', badge_text: m.badge_text || '', order_index: m.order_index, cover_image_url: m.cover_image_url || '' });
    setModuleDialog(true);
  };
  const saveModule = async () => {
    if (!moduleForm.title) { toast.error('Título requerido'); return; }
    const payload = { ...moduleForm, description: moduleForm.description || null, badge_text: moduleForm.badge_text || null, cover_image_url: moduleForm.cover_image_url || null, formacion_id: selectedFormacion.id };
    if (editingItem) {
      await supabase.schema('academy').from('modules').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.schema('academy').from('modules').insert(payload);
    }
    toast.success(editingItem ? 'Módulo actualizado' : 'Módulo creado');
    setModuleDialog(false);
    loadData();
  };
  const deleteModule = async (id: string) => {
    if (!confirm('¿Eliminar este módulo?')) return;
    await supabase.schema('academy').from('modules').delete().eq('id', id);
    toast.success('Módulo eliminado');
    loadData();
  };

  const uploadCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const filePath = `covers/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('module-materials').upload(filePath, file);
    if (uploadError) { toast.error('Error: ' + uploadError.message); setUploadingCover(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('module-materials').getPublicUrl(filePath);
    setModuleForm(f => ({ ...f, cover_image_url: publicUrl }));
    setUploadingCover(false);
    toast.success('Imagen subida');
  };

  const openNewVideo = () => {
    setEditingItem(null);
    const filtered = videos.filter(v => v.module_id === selectedModule.id);
    setVideoForm({ title: '', video_url: '', order_index: filtered.length + 1 });
    setVideoDialog(true);
  };
  const openEditVideo = (v: any) => {
    setEditingItem(v);
    setVideoForm({ title: v.title, video_url: v.video_url, order_index: v.order_index });
    setVideoDialog(true);
  };
  const saveVideo = async () => {
    if (!videoForm.title || !videoForm.video_url) { toast.error('Completa todos los campos'); return; }
    const payload = { ...videoForm, module_id: selectedModule.id };
    if (editingItem) {
      await supabase.schema('academy').from('videos').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.schema('academy').from('videos').insert(payload);
    }
    toast.success(editingItem ? 'Video actualizado' : 'Video creado');
    setVideoDialog(false);
    loadData();
  };
  const deleteVideo = async (id: string) => {
    await supabase.schema('academy').from('videos').delete().eq('id', id);
    toast.success('Video eliminado');
    loadData();
  };

  const uploadMaterial = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !materialVideoId || !materialTitle) {
      toast.error('Selecciona un video y escribe un título primero');
      return;
    }
    setUploading(true);
    const filePath = `${materialVideoId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('module-materials').upload(filePath, file);
    if (uploadError) { toast.error('Error: ' + uploadError.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('module-materials').getPublicUrl(filePath);
    await supabase.schema('academy').from('module_materials').insert({
      video_id: materialVideoId,
      title: materialTitle,
      file_url: publicUrl,
      file_name: file.name,
      is_downloadable: materialDownloadable,
      order_index: materials.filter(m => m.video_id === materialVideoId).length + 1,
    } as any);
    toast.success('Material subido');
    setMaterialTitle('');
    setUploading(false);
    e.target.value = '';
    loadData();
  };
  const uploadModuleMaterial = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedModule || !moduleMaterialTitle) {
      toast.error('Escribe un título primero');
      return;
    }
    setUploading(true);
    const filePath = `module-${selectedModule.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('module-materials').upload(filePath, file);
    if (uploadError) { toast.error('Error: ' + uploadError.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('module-materials').getPublicUrl(filePath);
    await supabase.schema('academy').from('module_materials').insert({
      module_id: selectedModule.id,
      video_id: null,
      title: moduleMaterialTitle,
      file_url: publicUrl,
      file_name: file.name,
      is_downloadable: moduleMaterialDownloadable,
      order_index: materials.filter(m => m.module_id === selectedModule.id).length + 1,
    } as any);
    toast.success('PDF subido');
    setModuleMaterialTitle('');
    setUploading(false);
    e.target.value = '';
    loadData();
  };

  const deleteMaterial = async (id: string, fileUrl: string) => {
    const urlParts = fileUrl.split('/module-materials/');
    if (urlParts[1]) await supabase.storage.from('module-materials').remove([urlParts[1]]);
    await supabase.schema('academy').from('module_materials').delete().eq('id', id);
    toast.success('Material eliminado');
    loadData();
  };

  const openNewExam = (videoId: string) => {
    setEditingItem(null);
    setExamForm({ title: '', description: '', video_id: videoId, order_index: exams.filter(e => e.video_id === videoId).length + 1 });
    setExamDialog(true);
  };
  const saveExam = async () => {
    if (!examForm.title || !examForm.video_id) { toast.error('Completa los campos'); return; }
    const payload = { ...examForm, description: examForm.description || null };
    if (editingItem) {
      await supabase.schema('academy').from('exams').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.schema('academy').from('exams').insert(payload);
    }
    toast.success(editingItem ? 'Examen actualizado' : 'Examen creado');
    setExamDialog(false);
    loadData();
  };
  const deleteExam = async (id: string) => {
    if (!confirm('¿Eliminar examen?')) return;
    await supabase.schema('academy').from('exams').delete().eq('id', id);
    toast.success('Examen eliminado');
    loadData();
  };

  const openNewQuestion = (examId: string) => {
    setQuestionExamId(examId);
    setQuestionForm({ question_text: '', question_type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '', order_index: examQuestions.filter(q => q.exam_id === examId).length + 1 });
    setQuestionDialog(true);
  };
  const saveQuestion = async () => {
    if (!questionForm.question_text) { toast.error('Escribe la pregunta'); return; }
    const payload: any = { exam_id: questionExamId, question_text: questionForm.question_text, question_type: questionForm.question_type, order_index: questionForm.order_index };
    if (questionForm.question_type === 'multiple_choice') {
      const validOpts = questionForm.options.filter(o => o.trim());
      if (validOpts.length < 2) { toast.error('Mínimo 2 opciones'); return; }
      if (!questionForm.correct_answer) { toast.error('Selecciona respuesta correcta'); return; }
      payload.options = validOpts;
      payload.correct_answer = questionForm.correct_answer;
    }
    await supabase.schema('academy').from('exam_questions').insert(payload);
    toast.success('Pregunta agregada');
    setQuestionDialog(false);
    loadData();
  };
  const deleteQuestion = async (id: string) => {
    await supabase.schema('academy').from('exam_questions').delete().eq('id', id);
    toast.success('Pregunta eliminada');
    loadData();
  };

  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <span className={`cursor-pointer hover:text-foreground ${view === 'formaciones' ? 'text-foreground font-medium' : ''}`} onClick={() => { setView('formaciones'); setSelectedFormacion(null); setSelectedModule(null); }}>
        Formaciones
      </span>
      {selectedFormacion && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className={`cursor-pointer hover:text-foreground ${view === 'modules' ? 'text-foreground font-medium' : ''}`} onClick={() => { setView('modules'); setSelectedModule(null); }}>
            {selectedFormacion.title}
          </span>
        </>
      )}
      {selectedModule && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{selectedModule.title}</span>
        </>
      )}
    </div>
  );

  const renderFormaciones = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Formaciones</h2>
        <Button onClick={openNewFormacion}><Plus className="h-4 w-4 mr-2" /> Nueva Formación</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Módulos</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {formaciones.map(f => (
            <TableRow key={f.id} className="cursor-pointer" onClick={() => goToModules(f)}>
              <TableCell>{f.order_index}</TableCell>
              <TableCell className="font-medium">{f.title}</TableCell>
              <TableCell className="text-muted-foreground truncate max-w-[200px]">{f.description}</TableCell>
              <TableCell><Badge variant="outline">{modules.filter(m => m.formacion_id === f.id).length}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => openEditFormacion(f)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteFormacion(f.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {formaciones.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay formaciones. Crea la primera.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderModules = () => {
    const filtered = modules.filter(m => m.formacion_id === selectedFormacion?.id);
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
            <h2 className="text-xl font-semibold">Módulos de "{selectedFormacion?.title}"</h2>
          </div>
          <Button onClick={openNewModule}><Plus className="h-4 w-4 mr-2" /> Nuevo Módulo</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Videos</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(m => (
              <TableRow key={m.id} className="cursor-pointer" onClick={() => goToVideos(m)}>
                <TableCell>{m.order_index}</TableCell>
                <TableCell className="font-medium">{m.title}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[200px]">{m.description}</TableCell>
                <TableCell><Badge variant="outline">{videos.filter(v => v.module_id === m.id).length}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => openEditModule(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteModule(m.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay módulos. Crea el primero.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderVideos = () => {
    const filtered = videos.filter(v => v.module_id === selectedModule?.id);
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
            <h2 className="text-xl font-semibold">Videos de "{selectedModule?.title}"</h2>
          </div>
          <Button onClick={openNewVideo}><Plus className="h-4 w-4 mr-2" /> Agregar Video</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> PDFs del Módulo (sin video)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {materials.filter(m => m.module_id === selectedModule?.id && !m.video_id).map(mat => (
              <div key={mat.id} className="flex items-center justify-between text-sm">
                <span>
                  {mat.title} <span className="text-muted-foreground">({mat.file_name})</span>
                  <Badge variant="outline" className="ml-2 text-xs">{mat.is_downloadable === false ? 'Solo vista' : 'Descargable'}</Badge>
                </span>
                <div className="flex gap-2 items-center">
                  <Switch checked={mat.is_downloadable !== false} onCheckedChange={async (v) => { await supabase.schema('academy').from('module_materials').update({ is_downloadable: v } as any).eq('id', mat.id); loadData(); }} />
                  <Button size="sm" variant="ghost" asChild><a href={mat.file_url} target="_blank" rel="noopener noreferrer">Ver</a></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMaterial(mat.id, mat.file_url)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 space-y-1 min-w-[200px]">
                <Label className="text-xs">Título</Label>
                <Input value={moduleMaterialTitle} onChange={e => setModuleMaterialTitle(e.target.value)} placeholder="Título del PDF" />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={moduleMaterialDownloadable} onCheckedChange={setModuleMaterialDownloadable} />
                <Label className="text-xs">Permitir descargar</Label>
              </div>
              <Input type="file" accept=".pdf" className="w-48" onChange={uploadModuleMaterial} disabled={uploading || !moduleMaterialTitle} />
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No hay videos en este módulo.</CardContent></Card>
        ) : (
          filtered.map(video => {
            const videoMaterials = materials.filter(m => m.video_id === video.id);
            const videoExams = exams.filter(e => e.video_id === video.id);
            return (
              <Card key={video.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{video.order_index}. {video.title}</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditVideo(video)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteVideo(video.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{video.video_url}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Material ({videoMaterials.length})</h4>
                    </div>
                    {videoMaterials.map(mat => (
                      <div key={mat.id} className="flex items-center justify-between text-sm">
                        <span>
                          {mat.title} <span className="text-muted-foreground">({mat.file_name})</span>
                          <Badge variant="outline" className="ml-2 text-xs">{mat.is_downloadable === false ? 'Solo vista' : 'Descargable'}</Badge>
                        </span>
                        <div className="flex gap-2 items-center">
                          <Switch checked={mat.is_downloadable !== false} onCheckedChange={async (v) => { await supabase.schema('academy').from('module_materials').update({ is_downloadable: v } as any).eq('id', mat.id); loadData(); }} />
                          <Button size="sm" variant="ghost" asChild><a href={mat.file_url} target="_blank" rel="noopener noreferrer">Ver</a></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMaterial(mat.id, mat.file_url)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 items-end flex-wrap">
                      <div className="flex-1 space-y-1 min-w-[180px]">
                        <Label className="text-xs">Título</Label>
                        <Input size={1} value={materialVideoId === video.id ? materialTitle : ''} onChange={e => { setMaterialVideoId(video.id); setMaterialTitle(e.target.value); }} placeholder="Título del material" />
                      </div>
                      <div className="flex items-center gap-2 pb-2">
                        <Switch checked={materialVideoId === video.id ? materialDownloadable : true} onCheckedChange={(v) => { setMaterialVideoId(video.id); setMaterialDownloadable(v); }} />
                        <Label className="text-xs">Descargable</Label>
                      </div>
                      <div>
                        <Input type="file" accept=".pdf" className="w-48" onChange={e => { setMaterialVideoId(video.id); uploadMaterial(e); }} disabled={uploading || (materialVideoId === video.id ? !materialTitle : true)} />
                      </div>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Exámenes ({videoExams.length})</h4>
                      <Button size="sm" variant="outline" onClick={() => openNewExam(video.id)}><Plus className="h-3 w-3 mr-1" /> Examen</Button>
                    </div>
                    {videoExams.map(exam => {
                      const questions = examQuestions.filter(q => q.exam_id === exam.id);
                      return (
                        <div key={exam.id} className="border border-muted rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{exam.title} ({questions.length} preguntas)</span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => openNewQuestion(exam.id)}><Plus className="h-3 w-3 mr-1" /> Pregunta</Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteExam(exam.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                          {questions.map(q => (
                            <div key={q.id} className="flex items-center justify-between text-sm pl-2">
                              <span>{q.order_index}. {q.question_text} <Badge variant="outline" className="ml-1 text-xs">{q.question_type === 'multiple_choice' ? 'Opción Múltiple' : 'Abierta'}</Badge></span>
                              <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderBreadcrumb()}

      {view === 'formaciones' && renderFormaciones()}
      {view === 'modules' && renderModules()}
      {view === 'videos' && renderVideos()}

      <Dialog open={formacionDialog} onOpenChange={setFormacionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Editar Formación' : 'Nueva Formación'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={formacionForm.title} onChange={e => setFormacionForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descripción</Label><Textarea value={formacionForm.description} onChange={e => setFormacionForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Imagen de portada</Label>
              {formacionForm.cover_image_url && (
                <div className="relative">
                  <img src={formacionForm.cover_image_url} alt="Portada" className="w-full h-40 object-cover rounded-md border border-border" />
                  <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setFormacionForm(f => ({ ...f, cover_image_url: '' }))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Input type="file" accept="image/*" onChange={uploadFormacionCoverImage} disabled={uploadingFormacionCover} />
            </div>
            <div className="space-y-2"><Label>Orden</Label><Input type="number" value={formacionForm.order_index} onChange={e => setFormacionForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} /></div>
            <Button className="w-full" onClick={saveFormacion}>{editingItem ? 'Guardar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Editar Módulo' : 'Nuevo Módulo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={moduleForm.title} onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descripción</Label><Textarea value={moduleForm.description} onChange={e => setModuleForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Imagen de portada</Label>
              {moduleForm.cover_image_url && (
                <div className="relative">
                  <img src={moduleForm.cover_image_url} alt="Portada" className="w-full h-40 object-cover rounded-md border border-border" />
                  <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setModuleForm(f => ({ ...f, cover_image_url: '' }))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Input type="file" accept="image/*" onChange={uploadCoverImage} disabled={uploadingCover} />
            </div>
            <div className="space-y-2"><Label>Badge (opcional)</Label><Input value={moduleForm.badge_text} onChange={e => setModuleForm(f => ({ ...f, badge_text: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Orden</Label><Input type="number" value={moduleForm.order_index} onChange={e => setModuleForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} /></div>
            <Button className="w-full" onClick={saveModule}>{editingItem ? 'Guardar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={videoDialog} onOpenChange={setVideoDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Editar Video' : 'Nuevo Video'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={videoForm.title} onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>URL del Video</Label><Input value={videoForm.video_url} onChange={e => setVideoForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></div>
            <div className="space-y-2"><Label>Orden</Label><Input type="number" value={videoForm.order_index} onChange={e => setVideoForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} /></div>
            <Button className="w-full" onClick={saveVideo}>{editingItem ? 'Guardar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={examDialog} onOpenChange={setExamDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Examen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={examForm.title} onChange={e => setExamForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Descripción (opcional)</Label><Textarea value={examForm.description} onChange={e => setExamForm(f => ({ ...f, description: e.target.value }))} /></div>
            <Button className="w-full" onClick={saveExam}>Crear Examen</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={questionDialog} onOpenChange={setQuestionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva Pregunta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={questionForm.question_type} onValueChange={v => setQuestionForm(f => ({ ...f, question_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Opción Múltiple</SelectItem>
                  <SelectItem value="open_answer">Respuesta Abierta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Pregunta</Label><Textarea value={questionForm.question_text} onChange={e => setQuestionForm(f => ({ ...f, question_text: e.target.value }))} /></div>
            {questionForm.question_type === 'multiple_choice' && (
              <>
                <div className="space-y-2">
                  <Label>Opciones</Label>
                  {questionForm.options.map((opt, i) => (
                    <Input key={i} value={opt} onChange={e => { const o = [...questionForm.options]; o[i] = e.target.value; setQuestionForm(f => ({ ...f, options: o })); }} placeholder={`Opción ${i + 1}`} />
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Respuesta correcta</Label>
                  <Select value={questionForm.correct_answer} onValueChange={v => setQuestionForm(f => ({ ...f, correct_answer: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {questionForm.options.filter(o => o.trim()).map((opt, i) => (
                        <SelectItem key={i} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button className="w-full" onClick={saveQuestion}>Agregar Pregunta</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
