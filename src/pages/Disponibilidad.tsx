import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { initialTeamMembers, initialAnnouncements, userNames } from '@/data/initialData';
import { AvailabilityStatus, Announcement } from '@/types/torii';
import { toast } from 'sonner';
import { Circle, Plus, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<AvailabilityStatus, { label: string; color: string }> = {
  disponible: { label: 'Disponible', color: 'bg-success' },
  ocupado: { label: 'Ocupado', color: 'bg-warning' },
  ausente: { label: 'Ausente', color: 'bg-destructive' },
  vacaciones: { label: 'Vacaciones', color: 'bg-muted-foreground' }
};

export default function Disponibilidad() {
  const { user } = useAuth();
  const [team, setTeam] = useStore('equipo', initialTeamMembers);
  const [announcements, setAnnouncements] = useStore('anuncios', initialAnnouncements);
  const [newMessage, setNewMessage] = useState('');

  const updateStatus = (userId: string, status: AvailabilityStatus) => {
    setTeam(prev => prev.map(m => m.userId === userId ? { ...m, status } : m));
    toast.success('Estado actualizado');
  };

  const addAnnouncement = () => {
    if (!newMessage.trim()) return;
    const announcement: Announcement = {
      id: Date.now().toString(), title: 'Mensaje', content: newMessage,
      authorId: user?.id || '1', date: new Date().toISOString().split('T')[0], important: false
    };
    setAnnouncements(prev => [announcement, ...prev]);
    setNewMessage('');
    toast.success('Mensaje publicado');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Disponibilidad</h1>
        <p className="text-muted-foreground">Estado del equipo y comunicación</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Estado del Equipo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {team.map(member => (
              <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                    {userNames[member.userId]?.charAt(0)}
                  </div>
                  <div className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card", statusConfig[member.status].color)} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{userNames[member.userId]}</p>
                  <p className="text-xs text-muted-foreground">{member.workSchedule.start} - {member.workSchedule.end}</p>
                </div>
                {member.userId === user?.id && (
                  <div className="flex gap-1">
                    {(['disponible', 'ocupado', 'ausente'] as AvailabilityStatus[]).map(status => (
                      <Button key={status} variant="ghost" size="sm" className={cn("h-7 px-2", member.status === status && statusConfig[status].color.replace('bg-', 'bg-') + '/20')} onClick={() => updateStatus(member.userId, status)}>
                        <Circle className={cn("h-2 w-2 mr-1", statusConfig[status].color.replace('bg-', 'fill-'))} />
                        <span className="text-xs">{statusConfig[status].label}</span>
                      </Button>
                    ))}
                  </div>
                )}
                {member.userId !== user?.id && (
                  <Badge className={cn('text-xs border-0', statusConfig[member.status].color + '/20', 'text-foreground')}>
                    {statusConfig[member.status].label}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Tablón de Anuncios</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className="bg-secondary/50 min-h-[60px]" />
              <Button onClick={addAnnouncement} className="bg-primary"><Send className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {announcements.map(a => (
                <div key={a.id} className={cn("p-3 rounded-lg border", a.important ? "border-primary/50 bg-primary/5" : "border-border/50")}>
                  {a.important && <Badge className="bg-primary/20 text-primary border-0 text-xs mb-2">Importante</Badge>}
                  <p className="text-sm">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">— {userNames[a.authorId]} • {a.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
