import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/academia';

// Ported from torii-academy's ReflectionsReview.tsx — same client-name
// addition as TabExamenes.tsx, for the same reason (team_member_id can
// belong to any Torii client's team here, unlike the single-tenant original).
export default function TabReflexiones() {
  const [reflections, setReflections] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, any>>({});
  const [clients, setClients] = useState<Record<string, any>>({});
  const [modules, setModules] = useState<Record<string, any>>({});
  const [formaciones, setFormaciones] = useState<Record<string, any>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: r }, { data: tm }, { data: m }, { data: f }] = await Promise.all([
      supabase.schema('academy').from('reflection_tasks').select('*').order('submitted_at', { ascending: false }),
      supabase.schema('academy').from('team_members').select('*'),
      supabase.schema('academy').from('modules').select('*'),
      supabase.schema('academy').from('formaciones').select('*'),
    ]);
    setReflections(r || []);

    const tmMap: Record<string, any> = {};
    (tm || []).forEach(t => tmMap[t.id] = t);
    setTeamMembers(tmMap);

    const clientIds = Array.from(new Set((tm || []).map(t => t.client_id).filter(Boolean)));
    if (clientIds.length > 0) {
      const { data: c } = await supabase.from('clients').select('id, name').in('id', clientIds);
      const clientMap: Record<string, any> = {};
      (c || []).forEach(cl => clientMap[cl.id] = cl);
      setClients(clientMap);
    } else {
      setClients({});
    }

    const modMap: Record<string, any> = {};
    (m || []).forEach(mo => modMap[mo.id] = mo);
    setModules(modMap);
    const formMap: Record<string, any> = {};
    (f || []).forEach(fo => formMap[fo.id] = fo);
    setFormaciones(formMap);
  };

  const markReviewed = async (id: string) => {
    await supabase.schema('academy').from('reflection_tasks').update({ is_reviewed: true }).eq('id', id);
    toast.success('Marcada como revisada');
    loadData();
  };

  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const buildHierarchy = () => {
    const tree: Record<string, Record<string, any[]>> = {};
    reflections.forEach(ref => {
      const mod = modules[ref.module_id];
      if (!mod) return;
      const formId = mod.formacion_id || 'sin-formacion';
      if (!tree[formId]) tree[formId] = {};
      if (!tree[formId][mod.id]) tree[formId][mod.id] = [];
      tree[formId][mod.id].push(ref);
    });
    return tree;
  };

  const tree = buildHierarchy();
  const formList = Object.values(formaciones).sort((a: any, b: any) => a.order_index - b.order_index);

  const renderReflection = (r: any) => {
    const teamMember = teamMembers[r.team_member_id];
    const client = teamMember ? clients[teamMember.client_id] : null;
    return (
      <Card key={r.id} className="ml-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={teamMember?.avatar_url ?? undefined} alt={teamMember?.full_name} />
                <AvatarFallback className="text-xs">{initials(teamMember?.full_name || '?')}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">
                  {teamMember?.full_name || 'Desconocido'}
                  {client && <span className="text-sm font-normal text-muted-foreground"> — {client.name}</span>}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleDateString()}</p>
              </div>
            </div>
            {r.is_reviewed ? (
              <Badge className="bg-primary/20 text-primary border-primary">Revisada</Badge>
            ) : (
              <Button size="sm" onClick={() => markReviewed(r.id)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar Revisada
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{r.content}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {reflections.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay reflexiones todavía.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {formList.map((form: any) => {
            const formModules = tree[form.id];
            if (!formModules) return null;
            const formKey = `f-${form.id}`;
            const formCount = Object.values(formModules).reduce((acc: number, refs: any) => acc + refs.length, 0);
            return (
              <Collapsible key={form.id} open={openSections[formKey]} onOpenChange={() => toggle(formKey)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-lg font-semibold p-4 h-auto">
                    <span>{form.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{formCount}</Badge>
                      {openSections[formKey] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pl-4">
                  {Object.entries(formModules).map(([modId, modRefs]: [string, any]) => {
                    const mod = modules[modId];
                    if (!mod) return null;
                    const modKey = `m-${modId}`;
                    return (
                      <Collapsible key={modId} open={openSections[modKey]} onOpenChange={() => toggle(modKey)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between text-base font-medium p-3 h-auto">
                            <span>{mod.title}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{modRefs.length}</Badge>
                              {openSections[modKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 py-2">
                          {modRefs.map(renderReflection)}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
