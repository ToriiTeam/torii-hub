import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, ExternalLink, FileText, Loader2, Save } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import mammoth from 'mammoth';

interface CSLRecord {
  id: string;
  csl_content: string | null;
  drive_csl_id: string | null;
  updated_at: string | null;
}

function extractGoogleDocId(url: string): string | null {
  if (!url.trim()) return null;
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Bare ID pasted directly (no slashes), not a full URL
  return /^[a-zA-Z0-9_-]+$/.test(url.trim()) ? url.trim() : null;
}

interface Props {
  clientId: string;
}

export default function TabCSL({ clientId }: Props) {
  const [record, setRecord] = useState<CSLRecord | null>(null);
  const [driveId, setDriveId] = useState('');
  const [driveDirty, setDriveDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingDrive, setSavingDrive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCSL = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_csb')
      .select('id, csl_content, drive_csl_id, updated_at')
      .eq('client_id', clientId)
      .maybeSingle();

    if (error) {
      toast.error('Error al cargar el CSL');
    } else if (data) {
      setRecord(data as CSLRecord);
      setDriveId(data.drive_csl_id ?? '');
    }
    setLoading(false);
    setDriveDirty(false);
  }, [clientId]);

  useEffect(() => { fetchCSL(); }, [fetchCSL]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(`${clientId}/csl.docx`, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('client_csb')
        .upsert(
          { client_id: clientId, csl_content: html, updated_at: new Date().toISOString() },
          { onConflict: 'client_id' },
        );
      if (dbError) throw dbError;

      toast.success('CSL subido');
      fetchCSL();
    } catch (err) {
      console.error('[TabCSL] upload failed:', err);
      toast.error('Error al subir el CSL');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDrive = async () => {
    setSavingDrive(true);
    const { error } = await supabase
      .from('client_csb')
      .upsert(
        { client_id: clientId, drive_csl_id: driveId || null, updated_at: new Date().toISOString() },
        { onConflict: 'client_id' },
      );
    setSavingDrive(false);
    if (error) { toast.error('Error al guardar el link de Drive'); return; }
    toast.success('Link de Drive guardado');
    fetchCSL();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const lastUpdated = record?.updated_at
    ? (() => {
        try {
          const d = parseISO(record.updated_at);
          return isValid(d) ? format(d, "d MMM yyyy, HH:mm", { locale: es }) : null;
        } catch { return null; }
      })()
    : null;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-medium">Client Success Log</CardTitle>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground ml-2">Actualizado {lastUpdated}</span>
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
          <Button variant="outline" size="sm" onClick={handleUploadClick} disabled={uploading}>
            {uploading
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5 mr-1.5" />
            }
            Subir CSL
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Drive alternativo ── */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Alternativa: Google Drive
          </h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label>ID o URL del CSL en Google Drive</Label>
              <Input
                value={driveId}
                onChange={e => { setDriveId(e.target.value); setDriveDirty(true); }}
                className="bg-secondary/50 mt-1 font-mono text-sm"
                placeholder="https://docs.google.com/... o ID del documento"
              />
            </div>
            {driveId && (
              <Button
                variant="outline"
                onClick={() => window.open(
                  driveId.startsWith('http') ? driveId : `https://docs.google.com/document/d/${driveId}`,
                  '_blank',
                  'noopener,noreferrer',
                )}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />Abrir en Drive
              </Button>
            )}
            <Button size="sm" onClick={handleSaveDrive} disabled={!driveDirty || savingDrive}>
              {savingDrive ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Guardar
            </Button>
          </div>
          {extractGoogleDocId(driveId) && (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <iframe
                src={`https://docs.google.com/document/d/${extractGoogleDocId(driveId)}/preview`}
                className="w-full h-[500px]"
                title="Previsualización CSL (Drive)"
              />
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
