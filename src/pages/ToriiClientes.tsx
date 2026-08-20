import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NuevoClienteDialog } from '@/features/clientes/components/NuevoClienteDialog';

// Fila devuelta por get_situacion_clientes() — ver migración
// create_get_situacion_clientes. Ya excluye el cliente-casillero interno de
// Torii (filtra es_interno = false server-side).
interface SituacionRow {
  client_id: string;
  client_name: string;
  fecha_primer_pago: string | null;
  fecha_inicio_campana: string | null;
  fecha_proximo_pago: string | null;
  ingresos: number;
  inversion_ads: number;
  roas: number | null;
  roi: number | null;
  cierres: number;
  agendas_efectivas: number;
  agendas_totales: number;
  close_rate: number | null;
  show_up_rate: number | null;
  dias_efectivos_ads: number | null;
  cuello_botella_activo: string | null;
  dias_cuello_botella_activo: number | null;
}

function fmtDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtPct(v: number | null): string {
  if (v == null) return '-';
  return `${(v * 100).toFixed(0)}%`;
}

function fmtMoney(v: number): string {
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function ToriiClientes() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SituacionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_situacion_clientes');
    if (error) {
      console.error('[ToriiClientes] get_situacion_clientes failed:', error.message);
    } else {
      setRows((data ?? []) as SituacionRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <NuevoClienteDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchData} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Situación de cartera — pagos, campaña, ROAS/ROI, cierres y cuellos de botella</p>
        </div>
        <Button className="bg-primary" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Cliente
        </Button>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Cargando…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Sin clientes cargados.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="p-3">Cliente</th>
                  <th className="p-3">1er pago</th>
                  <th className="p-3">Inicio campaña</th>
                  <th className="p-3">Próx. pago</th>
                  <th className="p-3">ROAS</th>
                  <th className="p-3">ROI</th>
                  <th className="p-3">Cierres</th>
                  <th className="p-3">Agendas efect.</th>
                  <th className="p-3">Agendas tot.</th>
                  <th className="p-3">Close rate</th>
                  <th className="p-3">Show up</th>
                  <th className="p-3">Inversión ads</th>
                  <th className="p-3">Días ads</th>
                  <th className="p-3">Cuello activo</th>
                  <th className="p-3">Días cuello</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.client_id}
                    className="border-b border-border/30 hover:bg-secondary/30 cursor-pointer"
                    onClick={() => navigate(`/c/${r.client_id}`)}
                  >
                    <td className="p-3 font-medium">{r.client_name}</td>
                    <td className="p-3">{fmtDate(r.fecha_primer_pago)}</td>
                    <td className="p-3">{fmtDate(r.fecha_inicio_campana)}</td>
                    <td className="p-3">{fmtDate(r.fecha_proximo_pago)}</td>
                    <td className="p-3">{r.roas == null ? '-' : `${r.roas.toFixed(2)}x`}</td>
                    <td className="p-3">{r.roi == null ? '-' : `${r.roi.toFixed(2)}x`}</td>
                    <td className="p-3">{r.cierres}</td>
                    <td className="p-3">{r.agendas_efectivas}</td>
                    <td className="p-3">{r.agendas_totales}</td>
                    <td className="p-3">{fmtPct(r.close_rate)}</td>
                    <td className="p-3">{fmtPct(r.show_up_rate)}</td>
                    <td className="p-3">{fmtMoney(r.inversion_ads)}</td>
                    <td className="p-3">{r.dias_efectivos_ads ?? '-'}</td>
                    <td className="p-3">{r.cuello_botella_activo ?? '-'}</td>
                    <td className="p-3">{r.dias_cuello_botella_activo ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
