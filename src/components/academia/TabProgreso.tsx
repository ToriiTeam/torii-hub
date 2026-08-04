import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// New — not part of the 3 ported files. Basic per-team-member progress
// table, built from academy.video_progress/exam_submissions/reflection_tasks
// (found while auditing the real schema, not in the original torii-academy
// admin screens since that app didn't have a cross-client "who's doing
// what" view).
interface ProgressRow {
  teamMemberId: string;
  fullName: string;
  clientName: string;
  active: boolean;
  videosCompleted: number;
  totalVideos: number;
  examsGraded: number;
  totalExams: number;
  reflectionsReviewed: number;
  totalReflections: number;
}

export default function TabProgreso() {
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: tm }, { data: videos }, { data: progress }, { data: submissions }, { data: reflections }] = await Promise.all([
      supabase.schema('academy').from('team_members').select('*'),
      supabase.schema('academy').from('videos').select('id'),
      supabase.schema('academy').from('video_progress').select('team_member_id, completed'),
      supabase.schema('academy').from('exam_submissions').select('team_member_id, is_graded'),
      supabase.schema('academy').from('reflection_tasks').select('team_member_id, is_reviewed'),
    ]);

    const teamMembers = tm || [];
    const totalVideos = (videos || []).length;

    const clientIds = Array.from(new Set(teamMembers.map(t => t.client_id).filter(Boolean)));
    const clientMap: Record<string, string> = {};
    if (clientIds.length > 0) {
      const { data: c } = await supabase.from('clients').select('id, name').in('id', clientIds);
      (c || []).forEach(cl => { clientMap[cl.id] = cl.name; });
    }

    const builtRows: ProgressRow[] = teamMembers.map(t => {
      const memberProgress = (progress || []).filter(p => p.team_member_id === t.id);
      const memberSubmissions = (submissions || []).filter(s => s.team_member_id === t.id);
      const memberReflections = (reflections || []).filter(r => r.team_member_id === t.id);
      return {
        teamMemberId: t.id,
        fullName: t.full_name,
        clientName: clientMap[t.client_id] || 'Sin cliente',
        active: t.active,
        videosCompleted: memberProgress.filter(p => p.completed).length,
        totalVideos,
        examsGraded: memberSubmissions.filter(s => s.is_graded).length,
        totalExams: memberSubmissions.length,
        reflectionsReviewed: memberReflections.filter(r => r.is_reviewed).length,
        totalReflections: memberReflections.length,
      };
    }).sort((a, b) => a.clientName.localeCompare(b.clientName) || a.fullName.localeCompare(b.fullName));

    setRows(builtRows);
    setLoading(false);
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Progreso por team member ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-32 rounded-lg bg-secondary/40 animate-pulse" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin team members cargados todavía.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team member</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Videos</TableHead>
                <TableHead className="text-right">Exámenes calificados</TableHead>
                <TableHead className="text-right">Reflexiones revisadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.teamMemberId}>
                  <TableCell className="font-medium">{row.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.clientName}</TableCell>
                  <TableCell>
                    <Badge className={row.active ? 'bg-success/20 text-success border-0' : 'bg-secondary text-muted-foreground border-0'}>
                      {row.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{row.videosCompleted}/{row.totalVideos}</TableCell>
                  <TableCell className="text-right">{row.examsGraded}/{row.totalExams}</TableCell>
                  <TableCell className="text-right">{row.reflectionsReviewed}/{row.totalReflections}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
