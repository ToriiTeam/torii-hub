import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/hooks/useStore';
import { initialDocuments } from '@/data/initialData';
import { Document, DocumentCategory } from '@/types/torii';
import { toast } from 'sonner';
import { Plus, Search, FileText, Star, Trash2, Upload, File, Grid, List } from 'lucide-react';
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

export default function Documentos() {
  const [documents, setDocuments] = useStore('documentos', initialDocuments);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = documents.filter(doc => {
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== 'all' && doc.category !== filterCategory) return false;
    return true;
  });

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documentación</h1>
          <p className="text-muted-foreground">{documents.length} documentos</p>
        </div>
        <label>
          <input type="file" className="hidden" onChange={handleUpload} />
          <Button className="bg-primary hover:bg-primary/90 cursor-pointer" asChild>
            <span><Upload className="h-4 w-4 mr-2" />Subir Documento</span>
          </Button>
        </label>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="bg-secondary/50" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px] bg-secondary/50"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button variant={view === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setView('grid')}><Grid className="h-4 w-4" /></Button>
            <Button variant={view === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
