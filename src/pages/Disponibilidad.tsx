import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { userNames } from '@/data/initialData';
import { toast } from 'sonner';
import { Circle, Send, Calendar, Video, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type AvailabilityStatus = 'disponible' | 'ocupado' | 'ausente' | 'vacaciones';

interface TeamMember {
  id: string;
  user_id: string;
  status: AvailabilityStatus;
  work_schedule_start: string;
  work_schedule_end: string;
}

interface TeamUser {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  important: boolean;
}

interface CalendarEvent {
  id: string;
  google_event_id: string;
  team_user_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  attendees: unknown;
  calendar_email: string | null;
}

const statusConfig: Record<AvailabilityStatus, { label: string; color: string }> = {
  disponible: { label: 'Disponible', color: 'bg-success' },
  ocupado: { label: 'Ocupado', color: 'bg-warning' },
  ausente: { label: 'Ausente', color: 'bg-destructive' },
  vacaciones: { label: 'Vacaciones', color: 'bg-muted-foreground' }
};

export default function Disponibilidad() {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    
    const [availabilityRes, usersRes, announcementsRes, eventsRes] = await Promise.all([
      supabase.from('team_availability').select('*'),
      supabase.from('team_users').select('id, name'),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('calendar_events').select('*').gte('end_time', now).order('start_time', { ascending: true })
    ]);
    
    if (availabilityRes.data) setTeam(availabilityRes.data as TeamMember[]);
    if (usersRes.data) setTeamUsers(usersRes.data as TeamUser[]);
    if (announcementsRes.data) setAnnouncements(announcementsRes.data as Announcement[]);
    if (eventsRes.data) setCalendarEvents(eventsRes.data as CalendarEvent[]);
    setLoading(false);
  };

  const updateStatus = async (userId: string, status: AvailabilityStatus) => {
    const existingRecord = team.find(m => m.user_id === userId);
    
    if (existingRecord) {
      const { error } = await supabase
        .from('team_availability')
        .update({ status })
        .eq('user_id', userId);
      if (error) { toast.error('Error al actualizar'); return; }
    } else {
      const { error } = await supabase
        .from('team_availability')
        .insert({ user_id: userId, status });
      if (error) { toast.error('Error al crear'); return; }
    }
    
    toast.success('Estado actualizado');
    fetchData();
  };

  const assignEventToUser = async (eventId: string, userId: string | null) => {
    const { error } = await supabase
      .from('calendar_events')
      .update({ team_user_id: userId })
      .eq('id', eventId);
    
    if (error) {
      toast.error('Error al asignar evento');
      return;
    }
    
    toast.success('Evento asignado');
    fetchData();
  };

  const addAnnouncement = async () => {
    if (!newMessage.trim()) return;
    
    const { error } = await supabase.from('announcements').insert({
      title: 'Mensaje',
      content: newMessage,
      author_id: user?.id || null,
      important: false
    });
    
    if (error) { toast.error('Error al publicar'); return; }
    setNewMessage('');
    toast.success('Mensaje publicado');
    fetchData();
  };

  const formatEventTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatEventDate = (dateTime: string) => {
    const date = new Date(dateTime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getUserName = (userId: string) => {
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || userNames[userId] || 'Usuario';
  };

  // Get events for current user
  const myEvents = calendarEvents.filter(e => e.team_user_id === user?.id);
  
  // Get unassigned events
  const unassignedEvents = calendarEvents.filter(e => !e.team_user_id);

  // Check if event is happening now
  const isEventNow = (start: string, end: string) => {
    const now = new Date();
    return new Date(start) <= now && new Date(end) >= now;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Disponibilidad</h1>
        <p className="text-muted-foreground">Estado del equipo y eventos del calendario</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Events */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Mis Llamadas
              {myEvents.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{myEvents.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tienes llamadas asignadas</p>
            ) : (
              myEvents.map(event => (
                <div 
                  key={event.id} 
                  className={cn(
                    "p-3 rounded-lg border",
                    isEventNow(event.start_time, event.end_time) 
                      ? "border-primary bg-primary/10" 
                      : "border-border/50 bg-secondary/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                      isEventNow(event.start_time, event.end_time) ? "bg-primary text-primary-foreground" : "bg-primary/10"
                    )}>
                      <Video className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatEventDate(event.start_time)}</span>
                        <span>•</span>
                        <span>{formatEventTime(event.start_time)} - {formatEventTime(event.end_time)}</span>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                    {isEventNow(event.start_time, event.end_time) && (
                      <Badge className="bg-primary text-primary-foreground shrink-0">EN VIVO</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Unassigned Events */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-warning" />
              Llamadas sin Asignar
              {unassignedEvents.length > 0 && (
                <Badge variant="outline" className="ml-auto border-warning text-warning">{unassignedEvents.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unassignedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Todas las llamadas están asignadas</p>
            ) : (
              unassignedEvents.map(event => (
                <div key={event.id} className="p-3 rounded-lg border border-border/50 bg-secondary/30">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatEventDate(event.start_time)}</span>
                        <span>•</span>
                        <span>{formatEventTime(event.start_time)} - {formatEventTime(event.end_time)}</span>
                      </div>
                    </div>
                    <Select onValueChange={(value) => assignEventToUser(event.id, value)}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Asignar a..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teamUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Team Status */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Estado del Equipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamUsers.map(teamUser => {
              const member = team.find(m => m.user_id === teamUser.id);
              const isCurrentUser = teamUser.id === user?.id;
              const memberStatus = member?.status || 'disponible';
              const displayStatus = statusConfig[memberStatus];
              const userEventCount = calendarEvents.filter(e => e.team_user_id === teamUser.id).length;

              return (
                <div key={teamUser.id} className="p-4 rounded-lg bg-secondary/30 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-lg">
                        {teamUser.name?.charAt(0)}
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card",
                        displayStatus.color
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{teamUser.name}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={cn("flex items-center gap-1", displayStatus.color.replace('bg-', 'text-'))}>
                          {displayStatus.label}
                        </span>
                        {userEventCount > 0 && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{userEventCount} llamadas asignadas</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Manual status controls for current user */}
                  {isCurrentUser && (
                    <div className="pl-16 flex gap-1 flex-wrap">
                      {(['disponible', 'ocupado', 'ausente'] as AvailabilityStatus[]).map(status => (
                        <Button 
                          key={status} 
                          variant="ghost" 
                          size="sm" 
                          className={cn(
                            "h-7 px-2", 
                            memberStatus === status && statusConfig[status].color + '/20'
                          )} 
                          onClick={() => updateStatus(teamUser.id, status)}
                        >
                          <Circle className={cn(
                            "h-2 w-2 mr-1", 
                            statusConfig[status].color.replace('bg-', 'fill-')
                          )} />
                          <span className="text-xs">{statusConfig[status].label}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Tablón de Anuncios</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className="bg-secondary/50 min-h-[60px]" />
              <Button onClick={addAnnouncement} className="bg-primary"><Send className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {announcements.map(a => (
                <div key={a.id} className={cn("p-3 rounded-lg border", a.important ? "border-primary/50 bg-primary/5" : "border-border/50")}>
                  {a.important && <Badge className="bg-primary/20 text-primary border-0 text-xs mb-2">Importante</Badge>}
                  <p className="text-sm">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">— {getUserName(a.author_id || '')} • {new Date(a.created_at).toLocaleDateString('es-ES')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
