import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, KeyRound } from 'lucide-react';
import type { Client } from '@/pages/ClienteDetalle';

// Fixed shared password for every Portal client account — see
// create-portal-user/index.ts for the same constant server-side.
const PORTAL_PASSWORD = '234567';

interface ClientPhase {
  id: string;
  phase_order: number;
  phase_name: string;
  phase_description: string | null;
  video_url: string | null;
}

const DEFAULT_PHASES = [
  { phase_order: 1, phase_name: 'Activación de mercado', phase_description: 'Estamos configurando tu sistema y lanzando las primeras acciones hacia tu mercado objetivo.' },
  { phase_order: 2, phase_name: 'Activación del sistema', phase_description: 'Tu sistema está en marcha. Las primeras agendas calificadas están comenzando a llegar.' },
  { phase_order: 3, phase_name: 'Activación de ventas', phase_description: 'El mercado responde. Ahora el foco es convertir esas agendas en clientes reales para tu negocio.' },
  { phase_order: 4, phase_name: 'Activación de economía', phase_description: 'Tu inversión está generando retorno real. Optimizamos para maximizar cada peso invertido.' },
  { phase_order: 5, phase_name: 'Escalado', phase_description: 'El sistema es predecible y rentable. Preparamos la siguiente etapa de crecimiento contigo.' },
];

interface Props {
  client: Client;
  onClientUpdate: () => void;
}

export default function TabPortalCliente({ client, onClientUpdate }: Props) {
  const [phases, setPhases] = useState<ClientPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [cpbcObjective, setCpbcObjective] = useState('');
  const [seeding, setSeeding] = useState(false);

  const [accessEmail, setAccessEmail] = useState(client.email || '');
  const [creatingAccess, setCreatingAccess] = useState(false);
  const [accessCreated, setAccessCreated] = useState(false);

  const fetchPhases = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_phases')
      .select('id, phase_order, phase_name, phase_description, video_url')
      .eq('client_id', client.id)
      .order('phase_order', { ascending: true });
    setPhases(data ?? []);
    setLoading(false);
  }, [client.id]);

  useEffect(() => { fetchPhases(); }, [fetchPhases]);

  async function handleSeedPhases() {
    setSeeding(true);
    const { error: phasesErr } = await supabase
      .from('client_phases')
      .insert(DEFAULT_PHASES.map(p => ({ ...p, client_id: client.id })));
    if (phasesErr) {
      toast.error('Error al sembrar las fases');
      setSeeding(false);
      return;
    }
    if (cpbcObjective.trim()) {
      const { error: statusErr } = await supabase
        .from('client_portal_status')
        .insert({ client_id: client.id, cpbc_objective: parseFloat(cpbcObjective) });
      if (statusErr) toast.error('Fases sembradas, pero error al guardar el objetivo CPBC');
    }
    toast.success('Fases del Portal sembradas');
    setSeeding(false);
    fetchPhases();
  }

  async function handleCreateAccess() {
    if (!accessEmail.trim()) { toast.error('El email es requerido'); return; }
    setCreatingAccess(true);
    const { data, error } = await supabase.functions.invoke('create-portal-user', {
      body: { clientId: client.id, email: accessEmail.trim() },
    });
    setCreatingAccess(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Error al crear el acceso');
      return;
    }
    setAccessCreated(true);
    toast.success('Acceso creado');
    onClientUpdate();
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Fases del Portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 rounded-lg bg-secondary/40 animate-pulse" />
          ) : phases.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Este cliente todavía no tiene las 5 fases del journey map. Sembralas para habilitar su Portal.
              </p>
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Objetivo CPBC (opcional)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={cpbcObjective}
                    onChange={e => setCpbcObjective(e.target.value)}
                    className="h-9 text-sm w-40 bg-secondary/50"
                    placeholder="0"
                  />
                </div>
                <Button size="sm" onClick={handleSeedPhases} disabled={seeding}>
                  {seeding ? 'Sembrando…' : 'Sembrar fases default'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {phases.map(p => (
                <div key={p.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{p.phase_order}. {p.phase_name}</p>
                    <Badge className={`text-xs border-0 shrink-0 ${p.video_url ? 'bg-success/20 text-success' : 'bg-secondary text-muted-foreground'}`}>
                      {p.video_url ? 'Con video' : 'Sin video'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{p.phase_description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Acceso al Portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.profile_id ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="h-4 w-4" />Este cliente ya tiene acceso al Portal creado.
            </div>
          ) : accessCreated ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Comunicá esta contraseña al cliente:
              </p>
              <code className="block text-sm bg-secondary/50 rounded-md px-3 py-2 font-mono">{PORTAL_PASSWORD}</code>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Email del cliente</Label>
                <Input
                  type="email"
                  value={accessEmail}
                  onChange={e => setAccessEmail(e.target.value)}
                  className="h-9 text-sm bg-secondary/50"
                />
              </div>
              <Button size="sm" onClick={handleCreateAccess} disabled={creatingAccess}>
                <KeyRound className="h-4 w-4 mr-1.5" />
                {creatingAccess ? 'Creando…' : 'Crear acceso'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
