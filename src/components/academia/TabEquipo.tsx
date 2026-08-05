import { Fragment, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronDown, ChevronRight, Camera } from 'lucide-react';
import { initials } from '@/lib/academia';

// Ported from torii-portal's TeamManagement.tsx (pages/academia/) — the
// admin side of the academy.* roster moved here entirely. The client in
// the Portal only reads their roster now (RLS on team_members/
// formacion_access/module_access/avatars went from FOR ALL to FOR SELECT
// for is_own_client() — see supabase/migrations/
// 20260805120000_academy_admin_only_roster_writes.sql); admin already had
// FOR ALL via is_portal_admin() on all four, so no new policies were needed.
// Scoped by an explicit client selector (same local pattern as
// ExecutiveDashboard/ContenidoOrganico) instead of the Portal's implicit
// "whoever is logged in" scoping.

interface ClientOption { id: string; name: string }

interface TeamMember {
  id: string;
  client_id: string;
  full_name: string;
  role: 'admin' | 'setter' | 'closer' | 'manager' | null;
  status: 'capacitacion' | 'fase_de_prueba' | 'setter_oficial' | 'activo' | 'inactivo';
  active: boolean;
  avatar_url: string | null;
}

interface Formacion { id: string; title: string; order_index: number }
interface AcademyModule { id: string; formacion_id: string | null; title: string; order_index: number }
interface AccessRow { id: string; team_member_id: string; formacion_id?: string; module_id?: string; is_unlocked: boolean }
interface VideoRow { id: string; module_id: string }
interface VideoProgressRow { team_member_id: string; video_id: string; completed: boolean }

const ROLE_LABELS: Record<string, string> = { setter: 'Setter', closer: 'Closer', manager: 'Manager', admin: 'Admin' };
const STATUS_LABELS: Record<string, string> = {
  capacitacion: 'Capacitación', fase_de_prueba: 'Fase de prueba',
  setter_oficial: 'Oficial', activo: 'Activo', inactivo: 'Inactivo',
};

async function uploadAvatar(teamMemberId: string, file: File): Promise<string | null> {
  const filePath = `${teamMemberId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
  if (uploadError) { toast.error('Error al subir la foto: ' + uploadError.message); return null; }
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const { error: updateError } = await supabase.schema('academy').from('team_members').update({ avatar_url: publicUrl } as any).eq('id', teamMemberId);
  if (updateError) { toast.error('Error al guardar la foto: ' + updateError.message); return null; }
  return publicUrl;
}

export default function TabEquipo() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [formaciones, setFormaciones] = useState<Formacion[]>([]);
  const [formacionAccess, setFormacionAccess] = useState<AccessRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [addingRow, setAddingRow] = useState(false);
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('clients').select('id, name').eq('status', 'active').order('name')
      .then(({ data }) => setClients(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setMembers([]); return; }
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  async function loadMembers() {
    setLoading(true);
    const { data } = await supabase.schema('academy').from('team_members')
      .select('*').eq('client_id', selectedClientId).order('full_name');
    const rows = (data ?? []) as TeamMember[];
    setMembers(rows);
    await loadAccessSummary(rows);
    setLoading(false);
  }

  async function loadAccessSummary(rows: TeamMember[]) {
    if (rows.length === 0) { setFormaciones([]); setFormacionAccess([]); return; }
    const ids = rows.map((m) => m.id);
    const schema = supabase.schema('academy');
    const [{ data: f }, { data: fa }] = await Promise.all([
      schema.from('formaciones').select('id, title, order_index').order('order_index'),
      schema.from('formacion_access').select('*').in('team_member_id', ids),
    ]);
    setFormaciones((f ?? []) as Formacion[]);
    setFormacionAccess((fa ?? []) as AccessRow[]);
  }

  async function handleAddMember() {
    if (!selectedClientId || addingRow) return;
    setAddingRow(true);
    const { error } = await supabase.schema('academy').from('team_members').insert({
      client_id: selectedClientId, full_name: 'Nueva persona', status: 'capacitacion', active: true,
    } as any);
    setAddingRow(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Persona agregada');
    loadMembers();
  }

  async function handleUpdateMember(id: string, patch: Partial<TeamMember>) {
    const { error } = await supabase.schema('academy').from('team_members').update(patch as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    loadMembers();
  }

  async function handleDeleteMember(id: string) {
    setDeleteTarget(null);
    const { error } = await supabase.schema('academy').from('team_members').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Persona eliminada');
    loadMembers();
  }

  async function handleAvatarChange(teamMemberId: string, file: File) {
    setUploadingAvatarId(teamMemberId);
    const url = await uploadAvatar(teamMemberId, file);
    setUploadingAvatarId(null);
    if (url) loadMembers();
  }

  const unlockedCount = (teamMemberId: string) =>
    formacionAccess.filter((a) => a.team_member_id === teamMemberId && a.is_unlocked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Gestionando equipo de</span>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Elegí un cliente" /></SelectTrigger>
          <SelectContent>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedClientId && (
          <Button size="sm" onClick={handleAddMember} disabled={addingRow} className="ml-auto">
            <Plus className="h-4 w-4 mr-2" /> Agregar persona
          </Button>
        )}
      </div>

      {!selectedClientId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Elegí un cliente para ver y gestionar su equipo.</CardContent></Card>
      ) : loading ? (
        <div className="h-32 rounded-lg bg-secondary/40 animate-pulse" />
      ) : members.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Este cliente todavía no tiene personas cargadas.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Activo</TableHead>
                  <TableHead>Formaciones</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((tm) => {
                  const isExpanded = expandedId === tm.id;
                  const isUploading = uploadingAvatarId === tm.id;
                  return (
                    <Fragment key={tm.id}>
                        <TableRow className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : tm.id)}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <label className="relative inline-block cursor-pointer group">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={tm.avatar_url ?? undefined} alt={tm.full_name} />
                                <AvatarFallback className="text-[10px]">{initials(tm.full_name)}</AvatarFallback>
                              </Avatar>
                              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Camera className="h-3.5 w-3.5 text-white" />
                              </div>
                              <input
                                type="file" accept="image/*" className="hidden" disabled={isUploading}
                                onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) handleAvatarChange(tm.id, file); }}
                              />
                            </label>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Input
                              defaultValue={tm.full_name}
                              className="h-8"
                              onBlur={(e) => { const val = e.target.value.trim(); if (val && val !== tm.full_name) handleUpdateMember(tm.id, { full_name: val }); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select value={tm.role ?? '__none'} onValueChange={(v) => handleUpdateMember(tm.id, { role: (v === '__none' ? null : v) as TeamMember['role'] })}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none">—</SelectItem>
                                {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'admin').map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select value={tm.status} onValueChange={(v) => handleUpdateMember(tm.id, { status: v as TeamMember['status'] })}>
                              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Switch checked={tm.active} onCheckedChange={(v) => handleUpdateMember(tm.id, { active: v })} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <Badge variant="outline">{unlockedCount(tm.id)} formaciones</Badge>
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(tm)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-secondary/20 p-4">
                              <TeamMemberAccessControl teamMemberId={tm.id} onAccessChanged={loadMembers} />
                            </TableCell>
                          </TableRow>
                        )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {deleteTarget?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>Se borra el roster, su progreso, accesos y avatar. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDeleteMember(deleteTarget.id)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Control de acceso por formación/módulo ─────────────────────────────
// Fetch propio por team_member (se dispara al expandir la fila), separado
// del resumen de la tabla principal (que solo necesita el conteo para el
// badge de la fila colapsada). Mismo mecanismo que torii-portal.

function TeamMemberAccessControl({ teamMemberId, onAccessChanged }: { teamMemberId: string; onAccessChanged: () => void }) {
  const [loading, setLoading] = useState(true);
  const [formaciones, setFormaciones] = useState<Formacion[]>([]);
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [formacionAccess, setFormacionAccess] = useState<AccessRow[]>([]);
  const [moduleAccess, setModuleAccess] = useState<AccessRow[]>([]);
  const [videoProgress, setVideoProgress] = useState<VideoProgressRow[]>([]);
  const [openFormaciones, setOpenFormaciones] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberId]);

  async function loadData() {
    setLoading(true);
    const schema = supabase.schema('academy');
    const [{ data: f }, { data: m }, { data: v }, { data: fa }, { data: ma }, { data: vp }] = await Promise.all([
      schema.from('formaciones').select('id, title, order_index').order('order_index'),
      schema.from('modules').select('id, formacion_id, title, order_index').order('order_index'),
      schema.from('videos').select('id, module_id'),
      schema.from('formacion_access').select('*').eq('team_member_id', teamMemberId),
      schema.from('module_access').select('*').eq('team_member_id', teamMemberId),
      schema.from('video_progress').select('team_member_id, video_id, completed').eq('team_member_id', teamMemberId),
    ]);
    setFormaciones((f ?? []) as Formacion[]);
    setModules((m ?? []) as AcademyModule[]);
    setVideos((v ?? []) as VideoRow[]);
    setFormacionAccess((fa ?? []) as AccessRow[]);
    setModuleAccess((ma ?? []) as AccessRow[]);
    setVideoProgress((vp ?? []) as VideoProgressRow[]);
    setLoading(false);
  }

  async function toggleFormacion(formacionId: string, next: boolean) {
    const schema = supabase.schema('academy');
    const existing = formacionAccess.find((a) => a.formacion_id === formacionId);
    const payload = { is_unlocked: next, unlocked_at: next ? new Date().toISOString() : null };
    if (existing) await schema.from('formacion_access').update(payload).eq('id', existing.id);
    else await schema.from('formacion_access').insert({ formacion_id: formacionId, team_member_id: teamMemberId, ...payload } as any);
    await loadData();
    onAccessChanged();
  }

  async function toggleModule(moduleId: string, next: boolean) {
    const schema = supabase.schema('academy');
    const existing = moduleAccess.find((a) => a.module_id === moduleId);
    const payload = { is_unlocked: next, unlocked_at: next ? new Date().toISOString() : null };
    if (existing) await schema.from('module_access').update(payload).eq('id', existing.id);
    else await schema.from('module_access').insert({ module_id: moduleId, team_member_id: teamMemberId, ...payload } as any);
    await loadData();
  }

  function moduleProgressPct(moduleId: string): number {
    const videoIds = videos.filter((v) => v.module_id === moduleId).map((v) => v.id);
    if (videoIds.length === 0) return 0;
    const completed = videoProgress.filter((p) => videoIds.includes(p.video_id) && p.completed).length;
    return Math.round((completed / videoIds.length) * 100);
  }

  if (loading) return <div className="h-16 rounded-lg bg-secondary/40 animate-pulse" />;
  if (formaciones.length === 0) return <p className="text-sm text-muted-foreground">No hay formaciones cargadas todavía.</p>;

  return (
    <div className="flex flex-col gap-2">
      {formaciones.map((formacion) => {
        const formacionModules = modules.filter((m) => m.formacion_id === formacion.id);
        const unlocked = formacionAccess.find((a) => a.formacion_id === formacion.id)?.is_unlocked ?? false;
        const isOpen = openFormaciones[formacion.id] ?? false;
        return (
          <div key={formacion.id} className="border border-border rounded-lg">
            <div className="flex items-center justify-between px-3 py-2">
              <button type="button" className="flex items-center gap-2 flex-1 text-left" onClick={() => setOpenFormaciones((p) => ({ ...p, [formacion.id]: !isOpen }))}>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-sm font-semibold">{formacion.title}</span>
              </button>
              <Switch checked={unlocked} onCheckedChange={(v) => toggleFormacion(formacion.id, v)} />
            </div>
            {isOpen && (
              <div className="px-3 pb-3 pl-9 flex flex-col gap-2">
                {formacionModules.length === 0 && <p className="text-xs text-muted-foreground">Sin módulos.</p>}
                {formacionModules.map((mod) => {
                  const modUnlocked = moduleAccess.find((a) => a.module_id === mod.id)?.is_unlocked ?? false;
                  return (
                    <div key={mod.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{mod.title}</span>
                        <Badge variant="outline" className="text-xs">{moduleProgressPct(mod.id)}%</Badge>
                      </div>
                      <Switch checked={modUnlocked} onCheckedChange={(v) => toggleModule(mod.id, v)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
