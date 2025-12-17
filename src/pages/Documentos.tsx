import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStore } from '@/hooks/useStore';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { initialDocuments } from '@/data/initialData';
import { Document, DocumentCategory } from '@/types/torii';
import { DriveFile } from '@/types/integrations';
import { toast } from 'sonner';
import { 
  Plus, Search, FileText, Star, Trash2, Upload, Grid, List, 
  Cloud, CloudOff, RefreshCw, Eye, ExternalLink, Download, Tag,
  File, FileSpreadsheet, FileImage, Presentation, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryLabels: Record<DocumentCategory, string> = {
  contratos: 'Contratos', sops: 'SOPs', comprobantes: 'Comprobantes',
  propuestas: 'Propuestas', legal: 'Legal', otros: 'Otros'
};

const categoryColors: Record<DocumentCategory, string> = {
  contratos: 'bg-primary/20 text-primary', sops: 'bg-info/20 text-info',
  comprobantes: 'bg-warning/20 text-warning', propuestas: 'bg-success/20 text-success',
  legal: 'bg-destructive/20 text-destructive', otros: 'bg-muted text-muted-foreground'
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
  if (mimeType.includes('image')) return FileImage;
  if (mimeType.includes('pdf')) return FileText;
  return File;
};

export default function Documentos() {
  const [documents, setDocuments] = useStore('documentos', initialDocuments);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'local' | 'drive'>('local');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

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

  const filtered = documents.filter(doc => {
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== 'all' && doc.category !== filterCategory) return false;
    return true;
  });

  const filteredDriveFiles = driveFiles.filter(file =>
    !search || file.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFavorite = (id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, favorite: !d.favorite } : d));
  };

  const deleteDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    toast.success('Documento eliminado');
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newDoc: Document = {
        id: Date.now().toString(), name: file.name, category: 'otros',
        uploadDate: new Date().toISOString().split('T')[0], tags: [],
        favorite: false, fileType: file.name.split('.').pop() || 'file'
      };
      setDocuments(prev => [...prev, newDoc]);
      toast.success('Documento subido');
    }
  };

  const openFileViewer = (file: DriveFile) => {
    setSelectedFile(file);
    setViewerOpen(true);
  };

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
            <label>
              <input type="file" className="hidden" onChange={handleUpload} />
              <Button className="bg-primary hover:bg-primary/90 cursor-pointer" asChild>
                <span><Upload className="h-4 w-4 mr-2" />Subir Documento</span>
              </Button>
            </label>
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
            {/* Tabs */}
            <div className="flex gap-2">
              <Button 
                variant={activeTab === 'local' ? 'default' : 'outline'} 
                onClick={() => setActiveTab('local')}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Locales
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

            {/* Drive connection status */}
            {activeTab === 'drive' && (
              <div className="flex items-center gap-2">
                {connectionStatus.connected ? (
                  <>
                    <Badge className="bg-success/20 text-success border-0 gap-1">
                      <Cloud className="h-3 w-3" />
                      Drive Conectado
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={disconnect} className="text-muted-foreground">
                      <CloudOff className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button onClick={connect} disabled={isConnecting} className="gap-2">
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    Conectar Google Drive
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
          {Object.entries(categoryLabels).map(([key, label]) => {
            const count = documents.filter(d => d.category === key).length;
            return (
              <Badge key={key} variant="outline" className="cursor-pointer hover:bg-secondary/50" onClick={() => setFilterCategory(key)}>
                {label} ({count})
              </Badge>
            );
          })}
        </div>
      )}

      {/* Content */}
      {activeTab === 'local' ? (
        /* Local Documents */
        <div className={cn(view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2')}>
          {filtered.map(doc => (
            <Card key={doc.id} className="bg-card border-border/50 hover:border-primary/30 transition-all group">
              <CardContent className={cn("p-4", view === 'list' && "flex items-center gap-4")}>
                <div className={cn("flex items-center gap-3", view === 'grid' && "mb-3")}>
                  <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.uploadDate}</p>
                  </div>
                </div>
                <div className={cn("flex items-center justify-between", view === 'list' && "ml-auto gap-4")}>
                  <Badge className={cn('text-xs border-0', categoryColors[doc.category])}>{categoryLabels[doc.category]}</Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFavorite(doc.id)}>
                      <Star className={cn("h-4 w-4", doc.favorite && "fill-warning text-warning")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDoc(doc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Google Drive Documents */
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openFileViewer(file)} title="Ver">
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
                Visualiza y gestiona tus documentos de Google Drive directamente desde Torii sin salir de la plataforma.
              </p>
              <Button onClick={connect} disabled={isConnecting} className="gap-2">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                Conectar Google Drive
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* File Viewer Modal */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFile && (
                <>
                  {(() => {
                    const IconComponent = getFileIcon(selectedFile.mimeType);
                    return <IconComponent className="h-5 w-5 text-primary" />;
                  })()}
                  {selectedFile.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" className="gap-1">
              <Eye className="h-4 w-4" />
              Ver
            </Button>
            {selectedFile && (
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <a href={getOpenUrl(selectedFile)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Abrir en Drive
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </div>
          <div className="flex-1 bg-secondary/20 rounded-lg overflow-hidden">
            {selectedFile && (
              <iframe
                src={getViewerUrl(selectedFile)}
                className="w-full h-full border-0"
                title={selectedFile.name}
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
