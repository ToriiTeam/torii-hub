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
        {/* All Calendar Events */}
        <Card className="bg-card border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Llamadas del Calendario
              {calendarEvents.length > 0 && (
                <Badge variant="secondary" className="ml-auto">{calendarEvents.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calendarEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay llamadas próximas</p>
            ) : (
              <div className="space-y-3">
                {calendarEvents.map(event => (
                  <div 
                    key={event.id} 
                    className={cn(
                      "p-3 rounded-lg border",
                      isEventNow(event.start_time, event.end_time) 
                        ? "border-primary bg-primary/10" 
                        : "border-border/50 bg-secondary/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
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
                      </div>
                      {isEventNow(event.start_time, event.end_time) && (
                        <Badge className="bg-primary text-primary-foreground shrink-0">EN VIVO</Badge>
                      )}
                      <Select 
                        value={event.team_user_id || "unassigned"} 
                        onValueChange={(value) => assignEventToUser(event.id, value === "unassigned" ? null : value)}
                      >
                        <SelectTrigger className={cn(
                          "w-[160px] h-9",
                          !event.team_user_id && "border-warning text-warning"
                        )}>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sin asignar</SelectItem>
                          {teamUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
