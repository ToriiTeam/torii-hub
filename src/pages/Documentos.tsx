import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { DriveFile } from '@/types/integrations';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tables, Enums } from '@/integrations/supabase/types';
import { 
  Plus, Search, FileText, Star, Trash2, Upload, Grid, List, 
  Cloud, CloudOff, RefreshCw, Eye, ExternalLink, Download, Edit,
  File, FileSpreadsheet, FileImage, Presentation, Loader2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Document = Tables<'documents'>;
type DocumentCategory = Enums<'document_category'>;

const categoryLabels: Record<DocumentCategory, string> = {
  contratos: 'Contratos', sops: 'SOPs', comprobantes: 'Comprobantes',
  propuestas: 'Propuestas', legal: 'Legal', otros: 'Otros'
};

const categoryColors: Record<DocumentCategory, string> = {
  contratos: 'bg-primary/20 text-primary', sops: 'bg-blue-500/20 text-blue-400',
  comprobantes: 'bg-yellow-500/20 text-yellow-400', propuestas: 'bg-green-500/20 text-green-400',
  legal: 'bg-destructive/20 text-destructive', otros: 'bg-muted text-muted-foreground'
};

const getFileIcon = (mimeType: string) => {
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return FileSpreadsheet;
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return Presentation;
  if (mimeType?.includes('image')) return FileImage;
  if (mimeType?.includes('pdf')) return FileText;
  return File;
};

const getFileTypeFromName = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    txt: 'text/plain',
    md: 'text/markdown',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

export default function Documentos() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'local' | 'drive'>('local');
  
  // Document viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFile | null>(null);
  
  // Document edit/create dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'otros' as DocumentCategory,
    description: '',
    tags: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);

  const { 
    connectionStatus, 
    driveFiles, 
    isConnecting, 
    isLoading,
    connect, 
    disconnect, 
    refreshFiles,
    getViewerUrl,
    getOpenUrl 
  } = useGoogleDrive();

  // Fetch documents from Supabase
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('upload_date', { ascending: false });
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const filtered = documents.filter(doc => {
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== 'all' && doc.category !== filterCategory) return false;
    return true;
  });

  const filteredDriveFiles = driveFiles.filter(file =>
    !search || file.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFavorite = async (doc: Document) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ favorite: !doc.favorite })
        .eq('id', doc.id);
      
      if (error) throw error;
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, favorite: !d.favorite } : d));
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast.error('Error al actualizar favorito');
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success('Documento eliminado');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar documento');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB for base64 storage)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }
      
      setUploadingFile(file);
      setFormData({
        name: file.name,
        category: 'otros',
        description: '',
        tags: ''
      });
      setEditingDocument(null);
      setEditDialogOpen(true);
    }
  };

  const handleSaveDocument = async () => {
    try {
      if (editingDocument) {
        // Update existing document
        const { error } = await supabase
          .from('documents')
          .update({
            name: formData.name,
            category: formData.category,
            description: formData.description || null,
            tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null
          })
          .eq('id', editingDocument.id);
        
        if (error) throw error;
        
        setDocuments(prev => prev.map(d => 
          d.id === editingDocument.id 
            ? { ...d, name: formData.name, category: formData.category, description: formData.description, tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null }
            : d
        ));
        toast.success('Documento actualizado');
      } else if (uploadingFile) {
        // Create new document with file content
        const reader = new FileReader();
        reader.onload = async (event) => {
          const fileContent = event.target?.result as string;
          const fileType = getFileTypeFromName(uploadingFile.name);
          
          const { data, error } = await supabase
            .from('documents')
            .insert({
              name: formData.name,
              category: formData.category,
              description: formData.description || null,
              tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
              file_type: fileType,
              file_content: fileContent,
              favorite: false
            })
            .select()
            .single();
          
          if (error) throw error;
          
          setDocuments(prev => [data, ...prev]);
          toast.success('Documento subido exitosamente');
          setUploadingFile(null);
        };
        reader.readAsDataURL(uploadingFile);
      }
      
      setEditDialogOpen(false);
      setEditingDocument(null);
      setUploadingFile(null);
      setFormData({ name: '', category: 'otros', description: '', tags: '' });
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Error al guardar documento');
    }
  };

  const openEditDialog = (doc: Document) => {
    setEditingDocument(doc);
    setFormData({
      name: doc.name,
      category: doc.category || 'otros',
      description: doc.description || '',
      tags: doc.tags?.join(', ') || ''
    });
    setUploadingFile(null);
    setEditDialogOpen(true);
  };

  const openLocalViewer = (doc: Document) => {
    setSelectedDocument(doc);
    setSelectedDriveFile(null);
    setViewerOpen(true);
  };

  const openDriveViewer = (file: DriveFile) => {
    setSelectedDriveFile(file);
    setSelectedDocument(null);
    setViewerOpen(true);
  };

  const downloadDocument = (doc: Document) => {
    if (doc.file_content) {
      const link = document.createElement('a');
      link.href = doc.file_content;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Descargando documento...');
    } else {
      toast.error('No hay contenido disponible para descargar');
    }
  };

  const renderLocalDocumentContent = () => {
    if (!selectedDocument?.file_content) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <FileText className="h-16 w-16 mb-4" />
          <p>No hay vista previa disponible</p>
        </div>
      );
    }

    const fileType = selectedDocument.file_type || '';
    const content = selectedDocument.file_content;

    // Images
    if (fileType.includes('image')) {
      return <img src={content} alt={selectedDocument.name} className="max-w-full max-h-full object-contain mx-auto" />;
    }

    // PDF
    if (fileType.includes('pdf')) {
      return <iframe src={content} className="w-full h-full border-0" title={selectedDocument.name} />;
    }

    // Text files
    if (fileType.includes('text') || fileType.includes('markdown')) {
      // Decode base64 content
      const base64Content = content.split(',')[1];
      const decodedContent = atob(base64Content);
      return (
        <div className="p-4 bg-secondary/20 rounded-lg h-full overflow-auto">
          <pre className="whitespace-pre-wrap text-sm font-mono">{decodedContent}</pre>
        </div>
      );
    }

    // Other files - offer download
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FileText className="h-16 w-16 mb-4" />
        <p className="mb-4">Vista previa no disponible para este tipo de archivo</p>
        <Button onClick={() => downloadDocument(selectedDocument)}>
          <Download className="h-4 w-4 mr-2" />
          Descargar archivo
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documentación</h1>
          <p className="text-muted-foreground">
            {activeTab === 'local' ? `${documents.length} documentos locales` : `${driveFiles.length} archivos en Drive`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'local' ? (
            <>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt,.md"
              />
              <Button className="bg-primary hover:bg-primary/90" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Subir Documento
              </Button>
            </>
          ) : connectionStatus.connected ? (
            <Button variant="outline" onClick={refreshFiles} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Actualizar
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tab switcher & Drive connection */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button 
                variant={activeTab === 'local' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('local')}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Locales ({documents.length})
              </Button>
              <Button 
                variant={activeTab === 'drive' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('drive')}
                className="gap-2"
              >
                <Cloud className="h-4 w-4" />
                Google Drive
              </Button>
            </div>

            {activeTab === 'drive' && (
              <div className="flex items-center gap-2">
                {connectionStatus.connected ? (
                  <>
                    <Badge className="bg-green-500/20 text-green-400 border-0 gap-1">
                      <Cloud className="h-3 w-3" />
                      Conectado
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={disconnect}>
                      <CloudOff className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button onClick={connect} disabled={isConnecting} className="gap-2">
                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                    Conectar Drive
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search & Filters */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="bg-secondary/50" />
          </div>
          {activeTab === 'local' && (
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px] bg-secondary/50"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-1">
            <Button variant={view === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setView('grid')}><Grid className="h-4 w-4" /></Button>
            <Button variant={view === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Category badges (local only) */}
      {activeTab === 'local' && (
        <div className="flex gap-2 flex-wrap">
          <Badge 
            variant="outline" 
            className={cn("cursor-pointer hover:bg-secondary/50", filterCategory === 'all' && "bg-primary/20 text-primary")}
            onClick={() => setFilterCategory('all')}
          >
            Todas ({documents.length})
          </Badge>
          {Object.entries(categoryLabels).map(([key, label]) => {
            const count = documents.filter(d => d.category === key).length;
            return (
              <Badge 
                key={key} 
                variant="outline" 
                className={cn("cursor-pointer hover:bg-secondary/50", filterCategory === key && categoryColors[key as DocumentCategory])}
                onClick={() => setFilterCategory(key)}
              >
                {label} ({count})
              </Badge>
            );
          })}
        </div>
      )}

      {/* Content */}
      {activeTab === 'local' ? (
        filtered.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
              <p className="text-muted-foreground mb-6">Sube tu primer documento para comenzar</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Subir Documento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2')}>
            {filtered.map(doc => {
              const IconComponent = getFileIcon(doc.file_type || '');
              return (
                <Card key={doc.id} className="bg-card border-border/50 hover:border-primary/30 transition-all group">
                  <CardContent className={cn("p-4", view === 'list' && "flex items-center gap-4")}>
                    <div className={cn("flex items-center gap-3", view === 'grid' && "mb-3")}>
                      <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.upload_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    {doc.description && view === 'grid' && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{doc.description}</p>
                    )}
                    <div className={cn("flex items-center justify-between", view === 'list' && "ml-auto gap-4")}>
                      <Badge className={cn('text-xs border-0', categoryColors[doc.category || 'otros'])}>
                        {categoryLabels[doc.category || 'otros']}
                      </Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLocalViewer(doc)} title="Ver">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDocument(doc)} title="Descargar">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(doc)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavorite(doc)} title="Favorito">
                          <Star className={cn("h-4 w-4", doc.favorite && "fill-yellow-400 text-yellow-400")} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDocument(doc.id)} title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        connectionStatus.connected ? (
          <div className={cn(view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2')}>
            {filteredDriveFiles.map(file => {
              const IconComponent = getFileIcon(file.mimeType);
              return (
                <Card key={file.id} className="bg-card border-border/50 hover:border-primary/30 transition-all group">
                  <CardContent className={cn("p-4", view === 'list' && "flex items-center gap-4")}>
                    <div className={cn("flex items-center gap-3", view === 'grid' && "mb-3")}>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.modifiedTime).toLocaleDateString('es-ES')} • {file.size}
                        </p>
                      </div>
                    </div>
                    <div className={cn("flex items-center justify-between", view === 'list' && "ml-auto gap-2")}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDriveViewer(file)} title="Ver">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Abrir en Drive">
                          <a href={getOpenUrl(file)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-card border-border/50">
            <CardContent className="p-12 text-center">
              <Cloud className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Conecta Google Drive</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Visualiza y gestiona tus documentos de Google Drive directamente desde Torii.
              </p>
              <Button onClick={connect} disabled={isConnecting} className="gap-2">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                Conectar Google Drive
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* Document Viewer Modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocument && (
                <>
                  {(() => {
                    const IconComponent = getFileIcon(selectedDocument.file_type || '');
                    return <IconComponent className="h-5 w-5 text-primary" />;
                  })()}
                  {selectedDocument.name}
                </>
              )}
              {selectedDriveFile && (
                <>
                  {(() => {
                    const IconComponent = getFileIcon(selectedDriveFile.mimeType);
                    return <IconComponent className="h-5 w-5 text-primary" />;
                  })()}
                  {selectedDriveFile.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="flex gap-2 mb-4">
              <Badge className={cn('text-xs border-0', categoryColors[selectedDocument.category || 'otros'])}>
                {categoryLabels[selectedDocument.category || 'otros']}
              </Badge>
              {selectedDocument.description && (
                <span className="text-sm text-muted-foreground">{selectedDocument.description}</span>
              )}
            </div>
          )}
          
          <div className="flex gap-2 mb-4">
            {selectedDocument && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadDocument(selectedDocument)}>
                <Download className="h-4 w-4" />
                Descargar
              </Button>
            )}
            {selectedDriveFile && (
              <>
                <Button variant="outline" size="sm" className="gap-1" asChild>
                  <a href={getOpenUrl(selectedDriveFile)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Abrir en Drive
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
              </>
            )}
          </div>
          
          <div className="flex-1 bg-secondary/20 rounded-lg overflow-hidden">
            {selectedDocument && renderLocalDocumentContent()}
            {selectedDriveFile && (
              <iframe
                src={getViewerUrl(selectedDriveFile)}
                className="w-full h-full border-0"
                title={selectedDriveFile.name}
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Document Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDocument ? 'Editar Documento' : 'Subir Documento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {uploadingFile && (
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                <File className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadingFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadingFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del documento"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={formData.category} onValueChange={(v: DocumentCategory) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Etiquetas (separadas por coma)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                placeholder="contrato, importante, 2024"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDocument} disabled={!formData.name}>
              {editingDocument ? 'Guardar' : 'Subir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
