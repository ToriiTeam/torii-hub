import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { fetchGhlClients } from '../lib/ghlClients';
import { listClientOps, upsertClientOps } from '../lib/mcClientOpsRepo';
import { mergeClientRows } from '../lib/clientStatus';
import type { McClientRow, McClientStatus } from '../types';

const STATUS_CONFIG: Record<McClientStatus, { label: string; className: string }> = {
  activo: { label: 'Activo', className: 'bg-success/20 text-success border-0' },
  por_vencer: { label: 'Por vencer', className: 'bg-warning/20 text-warning border-0' },
  vencido: { label: 'Vencido', className: 'bg-destructive/20 text-destructive border-0' },
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return '—'; }
}

// Hoisted to module scope (not declared inside ClientesGestionView) — a
// component defined inline in a parent's render body gets a new identity
// every render and loses input focus/local state on each keystroke. See the
// same fix applied in Closers.tsx earlier in this project.
function NotesCell({ row, onSave }: { row: McClientRow; onSave: (ghlContactId: string, notes: string) => void }) {
  const [value, setValue] = useState(row.ops?.notes ?? '');
  useEffect(() => { setValue(row.ops?.notes ?? ''); }, [row.ops?.notes]);

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value !== (row.ops?.notes ?? '')) onSave(row.ghl_contact_id, value); }}
      placeholder="Notas…"
      className="bg-secondary/50 h-8 text-sm min-w-[160px]"
    />
  );
}

export function ClientesGestionView() {
  const [rows, setRows] = useState<McClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<McClientStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [{ contacts, warning: ghlWarning }, ops] = await Promise.all([
        fetchGhlClients(),
        listClientOps(),
      ]);
      setRows(mergeClientRows(contacts, ops));
      setWarning(ghlWarning);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al cargar los clientes de GHL');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleToggle(ghlContactId: string, field: 'academia_access_granted' | 'whatsapp_group_added', value: boolean) {
    // Optimistic update — the checkbox should feel instant, not wait on a round-trip.
    setRows((prev) => prev.map((r) => (
      r.ghl_contact_id === ghlContactId
        ? { ...r, ops: { ...(r.ops ?? { id: '', ghl_contact_id: ghlContactId, academia_access_granted: false, whatsapp_group_added: false, notes: null, updated_at: '' }), [field]: value } }
        : r
    )));
    try {
      await upsertClientOps(ghlContactId, { [field]: value });
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar — refrescá la página');
    }
  }

  async function handleSaveNotes(ghlContactId: string, notes: string) {
    setRows((prev) => prev.map((r) => (
      r.ghl_contact_id === ghlContactId
        ? { ...r, ops: { ...(r.ops ?? { id: '', ghl_contact_id: ghlContactId, academia_access_granted: false, whatsapp_group_added: false, notes: null, updated_at: '' }), notes } }
        : r
    )));
    try {
      await upsertClientOps(ghlContactId, { notes });
      toast.success('Nota guardada');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar la nota');
    }
  }

  const porVencerCount = useMemo(() => rows.filter((r) => r.status === 'por_vencer').length, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (q && !r.name.toLowerCase().includes(q) && !(r.email ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filterStatus, search]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (error) return (
    <Card className="bg-card border-destructive/30">
      <CardContent className="p-6 text-center">
        <p className="text-sm text-destructive">Error al conectar con GHL: {error}</p>
        <p className="text-xs text-muted-foreground mt-1">Verificá que GHL_API_KEY y GHL_LOCATION_ID estén configuradas.</p>
      </CardContent>
    </Card>
  );

  if (rows.length === 0) return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Todavía no hay clientes con el tag <code>sv-cliente-activo</code> — verificá que la automatización de GHL esté configurada.
        </p>
        {warning && <p className="text-xs text-warning mt-2">{warning}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {porVencerCount > 0 && (
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <p className="text-sm">
              <span className="font-bold text-warning">{porVencerCount} cliente{porVencerCount > 1 ? 's' : ''}</span>
              {' '}por vencer en los próximos 7 días — actuá antes de perder la renovación.
            </p>
          </CardContent>
        </Card>
      )}

      {warning && (
        <p className="text-xs text-warning">{warning}</p>
      )}

      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base font-medium">Clientes activos ({filteredRows.length})</CardTitle>
            <CardDescription>Identidad leída en vivo desde GHL — solo el estado operativo se guarda acá</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email…"
                className="bg-secondary/50 h-8 pl-8 w-56 text-sm"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as McClientStatus | 'all')}>
              <SelectTrigger className="w-36 h-8 bg-secondary/50 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="por_vencer">Por vencer</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Última compra</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Academia</TableHead>
                <TableHead className="text-center">Grupo WhatsApp</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.ghl_contact_id}>
                  <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.email ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{row.phone ?? '—'}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmtDate(row.fecha_ultima_compra)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{fmtDate(row.fechaVencimiento)}</TableCell>
                  <TableCell>
                    {row.status
                      ? <Badge className={STATUS_CONFIG[row.status].className}>{STATUS_CONFIG[row.status].label}</Badge>
                      : <span className="text-xs text-muted-foreground">Sin fecha de compra</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={row.ops?.academia_access_granted ?? false}
                      onCheckedChange={(v) => handleToggle(row.ghl_contact_id, 'academia_access_granted', !!v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={row.ops?.whatsapp_group_added ?? false}
                      onCheckedChange={(v) => handleToggle(row.ghl_contact_id, 'whatsapp_group_added', !!v)}
                    />
                  </TableCell>
                  <TableCell>
                    <NotesCell row={row} onSave={handleSaveNotes} />
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Sin clientes para este filtro
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
