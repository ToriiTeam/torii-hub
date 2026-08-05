import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/academia';

// Ported from torii-academy's ExamSubmissions.tsx. torii-academy was
// single-tenant (one team), so submissions only ever needed to show a
// name. Here team_member_id can belong to ANY Torii client's team, so each
// card also shows the client name (public.clients, joined by
// team_members.client_id) — without it there's no way to tell whose team
// member is being graded.
export default function TabExamenes() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, any>>({});
  const [clients, setClients] = useState<Record<string, any>>({});
  const [exams, setExams] = useState<Record<string, any>>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [videos, setVideos] = useState<Record<string, any>>({});
  const [modules, setModules] = useState<Record<string, any>>({});
  const [formaciones, setFormaciones] = useState<Record<string, any>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [{ data: subs }, { data: tm }, { data: e }, { data: q }, { data: v }, { data: m }, { data: f }] = await Promise.all([
      supabase.schema('academy').from('exam_submissions').select('*').order('submitted_at', { ascending: false }),
      supabase.schema('academy').from('team_members').select('*'),
      supabase.schema('academy').from('exams').select('*'),
      supabase.schema('academy').from('exam_questions').select('*'),
      supabase.schema('academy').from('videos').select('*'),
      supabase.schema('academy').from('modules').select('*'),
      supabase.schema('academy').from('formaciones').select('*'),
    ]);
    setSubmissions(subs || []);
    setQuestions(q || []);

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

    const examMap: Record<string, any> = {};
    (e || []).forEach(ex => examMap[ex.id] = ex);
    setExams(examMap);

    const vidMap: Record<string, any> = {};
    (v || []).forEach(vi => vidMap[vi.id] = vi);
    setVideos(vidMap);

    const modMap: Record<string, any> = {};
    (m || []).forEach(mo => modMap[mo.id] = mo);
    setModules(modMap);

    const formMap: Record<string, any> = {};
    (f || []).forEach(fo => formMap[fo.id] = fo);
    setFormaciones(formMap);
  };

  const gradeSubmission = async (subId: string, score: number) => {
    await supabase.schema('academy').from('exam_submissions').update({ score, is_graded: true }).eq('id', subId);
    toast.success('Examen calificado');
    loadData();
  };

  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const buildHierarchy = () => {
    const tree: Record<string, Record<string, Record<string, any[]>>> = {};
    submissions.forEach(sub => {
      const exam = exams[sub.exam_id];
      if (!exam) return;
      const video = videos[exam.video_id];
      if (!video) return;
      const mod = modules[video.module_id];
      if (!mod) return;
      const formId = mod.formacion_id || 'sin-formacion';
      if (!tree[formId]) tree[formId] = {};
      if (!tree[formId][mod.id]) tree[formId][mod.id] = {};
      if (!tree[formId][mod.id][video.id]) tree[formId][mod.id][video.id] = [];
      tree[formId][mod.id][video.id].push(sub);
    });
    return tree;
  };

  const tree = buildHierarchy();
  const formList = Object.values(formaciones).sort((a: any, b: any) => a.order_index - b.order_index);

  const renderSubmission = (sub: any) => {
    const exam = exams[sub.exam_id];
    const examQs = questions.filter(q => q.exam_id === sub.exam_id);
    const teamMember = teamMembers[sub.team_member_id];
    const client = teamMember ? clients[teamMember.client_id] : null;
    return (
      <Card key={sub.id} className="ml-8">
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
                <p className="text-xs text-muted-foreground">{new Date(sub.submitted_at).toLocaleDateString()}</p>
              </div>
            </div>
            {sub.is_graded ? (
              <Badge className="bg-primary/20 text-primary border-primary">{sub.score}/{sub.total_questions}</Badge>
            ) : (
              <Badge variant="outline">Pendiente</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {examQs.map((q, i) => {
            const answer = sub.answers?.[q.id];
            const isCorrect = q.question_type === 'multiple_choice' && answer === q.correct_answer;
            return (
              <div key={q.id} className="space-y-1">
                <p className="text-sm font-medium">{i + 1}. {q.question_text} <span className="text-muted-foreground text-xs">({q.question_type === 'multiple_choice' ? 'Opción múltiple' : 'Abierta'})</span></p>
                <p className={`text-sm ${q.question_type === 'multiple_choice' ? (isCorrect ? 'text-green-500' : 'text-red-400') : 'text-foreground'}`}>Respuesta: {answer || 'Sin respuesta'}</p>
                {q.question_type === 'multiple_choice' && !isCorrect && <p className="text-sm text-green-500">Correcta: {q.correct_answer}</p>}
              </div>
            );
          })}
          {!sub.is_graded && (
            <div className="flex items-end gap-4 pt-2 border-t border-border">
              <div className="space-y-2"><Label>Puntuación</Label><Input type="number" min={0} max={sub.total_questions} defaultValue={0} className="w-24" id={`score-${sub.id}`} /></div>
              <Button size="sm" onClick={() => { const input = document.getElementById(`score-${sub.id}`) as HTMLInputElement; gradeSubmission(sub.id, parseInt(input.value) || 0); }}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Calificar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {submissions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay exámenes enviados.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {formList.map((form: any) => {
            const formModules = tree[form.id];
            if (!formModules) return null;
            const formKey = `f-${form.id}`;
            const formCount = Object.values(formModules).reduce((acc: number, mods: any) => acc + Object.values(mods).reduce((a: number, subs: any) => a + subs.length, 0), 0);
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
                  {Object.entries(formModules).map(([modId, modVideos]: [string, any]) => {
                    const mod = modules[modId];
                    if (!mod) return null;
                    const modKey = `m-${modId}`;
                    const modCount = Object.values(modVideos).reduce((a: number, subs: any) => a + subs.length, 0);
                    return (
                      <Collapsible key={modId} open={openSections[modKey]} onOpenChange={() => toggle(modKey)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between text-base font-medium p-3 h-auto">
                            <span>{mod.title}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{modCount}</Badge>
                              {openSections[modKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pl-4">
                          {Object.entries(modVideos).map(([vidId, vidSubs]: [string, any]) => {
                            const video = videos[vidId];
                            if (!video) return null;
                            const vidKey = `v-${vidId}`;
                            return (
                              <Collapsible key={vidId} open={openSections[vidKey]} onOpenChange={() => toggle(vidKey)}>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" className="w-full justify-between text-sm p-2 h-auto">
                                    <span>{video.title}</span>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{vidSubs.length}</Badge>
                                      {openSections[vidKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </div>
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-3 py-2">
                                  {vidSubs.map(renderSubmission)}
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
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
