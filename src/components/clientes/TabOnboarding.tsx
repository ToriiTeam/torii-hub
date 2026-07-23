import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Loader2, Plus } from 'lucide-react';

interface OnboardingResponse {
  id: string;
  fuente: string;
  campo: string;
  valor: string | null;
  synced_at: string;
  // Sync-time order from GHL (not the real questionnaire sequence — see
  // sync-ghl-onboarding/index.ts). Null for manually-loaded rows, which
  // sort after everything else via nullsFirst: false.
  orden: number | null;
}

const FUENTE_BADGE: Record<string, string> = {
  GHL: 'bg-info/20 text-info',
  'Google Forms': 'bg-warning/20 text-warning',
  Manual: 'bg-secondary text-muted-foreground',
};

const MANUAL_FUENTE_OPTIONS = ['Google Forms', 'Manual'] as const;

interface Props {
  clientId: string;
}

export default function TabOnboarding({ clientId }: Props) {
  const [responses, setResponses] = useState<OnboardingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  // Shown only after an automatic sync finds no GHL contact — lets the
  // user override with the contact's real email/phone in GHL, since
  // clients.email/phone in the Hub is sometimes a placeholder that
  // doesn't match (confirmed case: Raúl Galindo).
  const [showOverride, setShowOverride] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overridePhone, setOverridePhone] = useState('');

  const [manualOpen, setManualOpen] = useState(false);
  const [manualFuente, setManualFuente] = useState<string>('Google Forms');
  const [manualCampo, setManualCampo] = useState('');
  const [manualValor, setManualValor] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_onboarding_responses')
      .select('id, fuente, campo, valor, synced_at, orden')
      .eq('client_id', clientId)
      .order('orden', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    setResponses(data ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  async function runSync(overrides?: { ghl_email?: string; ghl_phone?: string }) {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-ghl-onboarding', {
        body: { client_id: clientId, ...overrides },
      });
      if (error) throw error;
      if (!data.success) {
        setSyncMessage(data.message ?? 'No se pudo sincronizar.');
        setShowOverride(true);
      } else if (data.syncedCount === 0) {
        setSyncMessage(data.message ?? 'Este cliente no completó el formulario todavía.');
        setShowOverride(false);
      } else {
        toast.success(`Se sincronizaron ${data.syncedCount} respuestas de GHL`);
        setSyncMessage(null);
        setShowOverride(false);
        fetchResponses();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveManual() {
    if (!manualCampo.trim()) { toast.error('La pregunta no puede estar vacía'); return; }
    setSavingManual(true);
    const { error } = await supabase
      .from('client_onboarding_responses')
      .upsert(
        { client_id: clientId, fuente: manualFuente, campo: manualCampo.trim(), valor: manualValor || null, synced_at: new Date().toISOString() },
        { onConflict: 'client_id,fuente,campo' },
      );
    setSavingManual(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Respuesta guardada');
    setManualOpen(false);
    setManualCampo('');
    setManualValor('');
    fetchResponses();
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/50">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Formulario de onboarding
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Cargar manualmente
            </Button>
            <Button size="sm" onClick={() => runSync()} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Sincronizar onboarding (GHL)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {syncMessage && (
            <p className="text-sm text-muted-foreground mb-3">{syncMessage}</p>
          )}
          {showOverride && (
            <div className="flex items-end gap-2 mb-4 p-3 rounded-lg bg-secondary/40">
              <div className="space-y-1">
                <Label className="text-xs">Email en GHL</Label>
                <Input value={overrideEmail} onChange={(e) => setOverrideEmail(e.target.value)} className="h-8 text-sm w-56" placeholder="email@real-en-ghl.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Teléfono en GHL</Label>
                <Input value={overridePhone} onChange={(e) => setOverridePhone(e.target.value)} className="h-8 text-sm w-40" placeholder="+52..." />
              </div>
              <Button
                size="sm"
                disabled={syncing || (!overrideEmail && !overridePhone)}
                onClick={() => runSync({ ghl_email: overrideEmail || undefined, ghl_phone: overridePhone || undefined })}
              >
                Reintentar
              </Button>
            </div>
          )}

          {loading ? (
            <div className="h-24 rounded-lg bg-secondary/40 animate-pulse" />
          ) : responses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin respuestas de onboarding todavía.</p>
          ) : (
            <div className="space-y-3">
              {responses.map((r) => (
                <div key={r.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{r.campo}</p>
                    <Badge className={`text-xs border-0 shrink-0 ${FUENTE_BADGE[r.fuente] ?? ''}`}>{r.fuente}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{r.valor || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargar respuesta manualmente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Fuente</Label>
              <Select value={manualFuente} onValueChange={setManualFuente}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MANUAL_FUENTE_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pregunta</Label>
              <Input value={manualCampo} onChange={(e) => setManualCampo(e.target.value)} placeholder="¿Qué productos vendes?" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Respuesta</Label>
              <Textarea value={manualValor} onChange={(e) => setManualValor(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManualOpen(false)} disabled={savingManual}>Cancelar</Button>
            <Button onClick={handleSaveManual} disabled={savingManual}>
              {savingManual ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
