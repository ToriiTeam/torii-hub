import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

// Listado simple, sin KPIs ni gráficos: todo roadmap_processes en estado
// 'bloqueado' de todos los clientes, agrupado por cliente. JOIN directo —
// roadmap_processes.client_id → clients(id) es una FK simple, sin pasar
// por roadmap_phases.
interface BlockedProcess {
  id: string;
  nombre: string;
  updated_at: string;
  client_id: string;
  clients: { name: string } | null;
}

interface ClientGroup {
  clientId: string;
  clientName: string;
  processes: BlockedProcess[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ClientesGlobalDashboard() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('roadmap_processes')
        .select('id, nombre, updated_at, client_id, clients(name)')
        .eq('status', 'bloqueado');

      if (error) {
        console.error('[ClientesGlobalDashboard] load failed:', error.message);
        setGroups([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as BlockedProcess[];
      const byClient = new Map<string, ClientGroup>();
      for (const row of rows) {
        const clientName = row.clients?.name ?? 'Sin cliente';
        const existing = byClient.get(row.client_id);
        if (existing) existing.processes.push(row);
        else byClient.set(row.client_id, { clientId: row.client_id, clientName, processes: [row] });
      }

      const sorted = Array.from(byClient.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
      for (const group of sorted) {
        group.processes.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      }
      setGroups(sorted);
      setLoading(false);
    }
    load();
  }, []);

  const totalBlocked = groups.reduce((sum, g) => sum + g.processes.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Global — Procesos bloqueados</h1>
        <p className="text-sm text-muted-foreground">
          {totalBlocked} proceso{totalBlocked === 1 ? '' : 's'} en estado "bloqueado" en {groups.length} cliente{groups.length === 1 ? '' : 's'}
        </p>
      </div>

      {loading ? (
        <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />
      ) : groups.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            No hay procesos bloqueados en ningún cliente.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.clientId} className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <Link to={`/clientes/${group.clientId}`} className="hover:underline">
                    {group.clientName}
                  </Link>
                  <span className="text-sm font-normal text-muted-foreground">
                    ({group.processes.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proceso</TableHead>
                      <TableHead className="text-right">Última actualización</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.processes.map((proc) => (
                      <TableRow key={proc.id}>
                        <TableCell className="font-medium">{proc.nombre}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatDate(proc.updated_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
