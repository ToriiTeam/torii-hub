import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Plus, Edit2, Trash2, ExternalLink, FileText, FileType as FileTypeIcon, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Embed helpers — ported 1:1 from torii-portal's ReportesPage.tsx ──────

function getYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbedded)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return match ? match[1] : null;
}

function getEmbedUrl(url: string): string {
  if (url.includes('youtu')) {
    const id = getYoutubeId(url);
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
  }
  if (url.includes('loom.com/share')) {
    const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (match) return `https://www.loom.com/embed/${match[1]}?autoplay=1`;
  }
  return url;
}

function getDriveEmbedUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  return url;
}

// ─── Types ──────────────────────────────────────────────────────────────

interface ClientVideo {
  id: string;
  client_id: string;
  title: string;
  video_url: string;
  description: string | null;
  sent_at: string | null;
}

type DocFileType = 'pdf' | 'google_doc' | 'otro';

interface ClientDocument {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  file_type: DocFileType | null;
  file_url: string;
  upload_date: string | null;
}

const emptyVideoForm = { title: '', video_url: '', description: '', sent_at: '' };
const emptyDocForm = { name: '', description: '', file_type: 'pdf' as DocFileType, file_url: '' };

const docTypeIcons: Record<DocFileType, { Icon: typeof FileText; className: string }> = {
  pdf: { Icon: FileText, className: 'text-destructive' },
  google_doc: { Icon: FileTypeIcon, className: 'text-info' },
  otro: { Icon: FileIcon, className: 'text-muted-foreground' },
};

const docTypeLabels: Record<DocFileType, string> = {
  pdf: 'PDF',
  google_doc: 'Google Doc',
  otro: 'Otro',
};

interface Props {
  clientId: string;
}

export default function TabVideosDocs({ clientId }: Props) {
  const [videos, setVideos] = useState<ClientVideo[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ClientVideo | null>(null);
  const [videoForm, setVideoForm] = useState(emptyVideoForm);
  const [savingVideo, setSavingVideo] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<ClientVideo | null>(null);

  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ClientDocument | null>(null);
  const [docForm, setDocForm] = useState(emptyDocForm);
  const [savingDoc, setSavingDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ClientDocument | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [videosRes, docsRes] = await Promise.all([
      supabase.from('client_videos').select('*').eq('client_id', clientId).order('sent_at', { ascending: false }),
      supabase.from('documents').select('*').eq('client_id', clientId).order('upload_date', { ascending: false }),
    ]);
    setVideos((videosRes.data ?? []) as ClientVideo[]);
    setDocuments((docsRes.data ?? []) as ClientDocument[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Videos ──

  function openNewVideo() {
    setEditingVideo(null);
    setVideoForm(emptyVideoForm);
    setVideoDialogOpen(true);
  }

  function openEditVideo(v: ClientVideo) {
    setEditingVideo(v);
    setVideoForm({
      title: v.title, video_url: v.video_url,
      description: v.description || '', sent_at: v.sent_at ? v.sent_at.slice(0, 10) : '',
    });
    setVideoDialogOpen(true);
  }

  async function handleSaveVideo() {
    if (!videoForm.title.trim() || !videoForm.video_url.trim()) {
      toast.error('Título y URL son requeridos');
      return;
    }
    setSavingVideo(true);
    const data = {
      client_id: clientId,
      title: videoForm.title.trim(),
      video_url: videoForm.video_url.trim(),
      description: videoForm.description.trim() || null,
      sent_at: videoForm.sent_at || null,
    };
    const { error } = editingVideo
      ? await supabase.from('client_videos').update(data).eq('id', editingVideo.id)
      : await supabase.from('client_videos').insert(data);
    setSavingVideo(false);
    if (error) { toast.error('Error al guardar el video'); return; }
    toast.success(editingVideo ? 'Video actualizado' : 'Video agregado');
    setVideoDialogOpen(false);
    fetchData();
  }

  async function handleDeleteVideo(v: ClientVideo) {
    const { error } = await supabase.from('client_videos').delete().eq('id', v.id);
    if (error) { toast.error('Error al eliminar el video'); return; }
    toast.success('Video eliminado');
    fetchData();
  }

  // ── Documents ──

  function openNewDoc() {
    setEditingDoc(null);
    setDocForm(emptyDocForm);
    setDocDialogOpen(true);
  }

  function openEditDoc(d: ClientDocument) {
    setEditingDoc(d);
    setDocForm({
      name: d.name, description: d.description || '',
      file_type: d.file_type || 'pdf', file_url: d.file_url,
    });
    setDocDialogOpen(true);
  }

  async function handleSaveDoc() {
    if (!docForm.name.trim() || !docForm.file_url.trim()) {
      toast.error('Nombre y URL son requeridos');
      return;
    }
    setSavingDoc(true);
    const data = {
      client_id: clientId,
      name: docForm.name.trim(),
      description: docForm.description.trim() || null,
      file_type: docForm.file_type,
      file_url: docForm.file_url.trim(),
    };
    const { error } = editingDoc
      ? await supabase.from('documents').update(data).eq('id', editingDoc.id)
      : await supabase.from('documents').insert(data);
    setSavingDoc(false);
    if (error) { toast.error('Error al guardar el documento'); return; }
    toast.success(editingDoc ? 'Documento actualizado' : 'Documento agregado');
    setDocDialogOpen(false);
    fetchData();
  }

  async function handleDeleteDoc(d: ClientDocument) {
    const { error } = await supabase.from('documents').delete().eq('id', d.id);
    if (error) { toast.error('Error al eliminar el documento'); return; }
    toast.success('Documento eliminado');
    fetchData();
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-40 rounded-lg bg-secondary/40 animate-pulse" />
      <div className="h-40 rounded-lg bg-secondary/40 animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/50">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Videos ({videos.length})
          </CardTitle>
          <Button size="sm" onClick={openNewVideo}>
            <Plus className="h-4 w-4 mr-1.5" />Agregar video
          </Button>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin videos cargados todavía.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map(v => {
                const ytId = getYoutubeId(v.video_url);
                return (
                  <div key={v.id} className="rounded-lg border border-border/50 overflow-hidden group">
                    <div
                      className="relative bg-secondary/40 cursor-pointer"
                      style={{ paddingBottom: '56.25%' }}
                      onClick={() => setPreviewVideo(v)}
                    >
                      {ytId ? (
                        <img
                          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                          alt={v.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                          {v.video_url.includes('loom.com') ? 'Loom' : 'Video'}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                        <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      {v.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{v.description}</p>}
                      <div className="flex items-center justify-end gap-1 mt-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditVideo(v)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteVideo(v)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Documentos ({documents.length})
          </CardTitle>
          <Button size="sm" onClick={openNewDoc}>
            <Plus className="h-4 w-4 mr-1.5" />Agregar documento
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin documentos cargados todavía.</p>
          ) : (
            <div className="space-y-2">
              {documents.map(d => {
                const { Icon, className } = docTypeIcons[d.file_type || 'otro'];
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => setPreviewDoc(d)}
                  >
                    <Icon className={cn('h-6 w-6 shrink-0', className)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      {d.description && <p className="text-xs text-muted-foreground truncate">{d.description}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{docTypeLabels[d.file_type || 'otro']}</span>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDoc(d)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDoc(d)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video create/edit dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingVideo ? 'Editar' : 'Agregar'} video</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input value={videoForm.title} onChange={e => setVideoForm({ ...videoForm, title: e.target.value })} className="bg-secondary/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL (YouTube o Loom)</Label>
              <Input value={videoForm.video_url} onChange={e => setVideoForm({ ...videoForm, video_url: e.target.value })} className="bg-secondary/50" placeholder="https://youtube.com/watch?v=... o https://loom.com/share/..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción (opcional)</Label>
              <Textarea value={videoForm.description} onChange={e => setVideoForm({ ...videoForm, description: e.target.value })} className="bg-secondary/50" rows={3} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha de envío (opcional)</Label>
              <Input type="date" value={videoForm.sent_at} onChange={e => setVideoForm({ ...videoForm, sent_at: e.target.value })} className="bg-secondary/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVideoDialogOpen(false)} disabled={savingVideo}>Cancelar</Button>
            <Button onClick={handleSaveVideo} disabled={savingVideo}>{savingVideo ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video preview dialog */}
      <Dialog open={!!previewVideo} onOpenChange={open => !open && setPreviewVideo(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{previewVideo?.title}</DialogTitle></DialogHeader>
          {previewVideo && (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={getEmbedUrl(previewVideo.video_url)}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0 rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document create/edit dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingDoc ? 'Editar' : 'Agregar'} documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} className="bg-secondary/50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={docForm.file_type} onValueChange={v => setDocForm({ ...docForm, file_type: v as DocFileType })}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(docTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL</Label>
              <Input value={docForm.file_url} onChange={e => setDocForm({ ...docForm, file_url: e.target.value })} className="bg-secondary/50" placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción (opcional)</Label>
              <Textarea value={docForm.description} onChange={e => setDocForm({ ...docForm, description: e.target.value })} className="bg-secondary/50" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDocDialogOpen(false)} disabled={savingDoc}>Cancelar</Button>
            <Button onClick={handleSaveDoc} disabled={savingDoc}>{savingDoc ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document preview dialog */}
      <Dialog open={!!previewDoc} onOpenChange={open => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader className="flex-row items-center justify-between pr-8">
            <DialogTitle>{previewDoc?.name}</DialogTitle>
            {previewDoc && (
              <Button variant="outline" size="sm" onClick={() => window.open(previewDoc.file_url, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="h-4 w-4 mr-1.5" />Abrir en Drive
              </Button>
            )}
          </DialogHeader>
          {previewDoc && (
            <iframe
              src={getDriveEmbedUrl(previewDoc.file_url)}
              title={previewDoc.name}
              className="flex-1 w-full border-0 rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
