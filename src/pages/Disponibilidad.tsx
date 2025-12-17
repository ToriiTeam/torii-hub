import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { initialTeamMembers, initialAnnouncements, userNames } from '@/data/initialData';
import { AvailabilityStatus, Announcement } from '@/types/torii';
import { CalendarStatus } from '@/types/integrations';
import { toast } from 'sonner';
import { Circle, Send, Calendar, CalendarCheck, RefreshCw, Loader2, Clock, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<AvailabilityStatus, { label: string; color: string }> = {
  disponible: { label: 'Disponible', color: 'bg-success' },
  ocupado: { label: 'Ocupado', color: 'bg-warning' },
  ausente: { label: 'Ausente', color: 'bg-destructive' },
  vacaciones: { label: 'Vacaciones', color: 'bg-muted-foreground' }
};

const calendarStatusConfig: Record<CalendarStatus['status'], { label: string; color: string; icon: typeof Circle }> = {
  disponible: { label: 'Disponible', color: 'bg-success', icon: Circle },
  en_reunion: { label: 'En reunión', color: 'bg-warning', icon: Video },
  proximo_ocupado: { label: 'Próximamente ocupado', color: 'bg-orange-500', icon: Clock },
  ocupado: { label: 'Ocupado', color: 'bg-destructive', icon: Circle },
  ausente: { label: 'Ausente', color: 'bg-muted-foreground', icon: Circle },
};

export default function Disponibilidad() {
  const { user } = useAuth();
  const [team, setTeam] = useStore('equipo', initialTeamMembers);
  const [announcements, setAnnouncements] = useStore('anuncios', initialAnnouncements);
  const [newMessage, setNewMessage] = useState('');

  const {
    connectionStatus,
    calendarEvents,
    userStatuses,
    isConnecting,
    isLoading,
    connect,
    disconnect,
    refreshEvents,
  } = useGoogleCalendar();

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

  const formatEventTime = (dateTime?: string, date?: string) => {
    if (dateTime) {
      return new Date(dateTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    if (date) {
      return 'Todo el día';
    }
    return '';
  };

  // Get next 5 events across all users
  const upcomingEvents = calendarEvents
    .filter(e => new Date(e.start.dateTime || e.start.date || '') > new Date())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Disponibilidad</h1>
          <p className="text-muted-foreground">Estado del equipo y comunicación</p>
        </div>
        
        {/* Calendar Connection */}
        <div className="flex items-center gap-2">
          {connectionStatus.connected ? (
            <>
              <Badge className="bg-success/20 text-success border-0 gap-1">
                <CalendarCheck className="h-3 w-3" />
                Calendar Conectado
              </Badge>
              <Button variant="outline" size="sm" onClick={refreshEvents} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="sm" onClick={disconnect} className="text-muted-foreground">
                Desconectar
              </Button>
            </>
          ) : (
            <Button onClick={connect} disabled={isConnecting} className="gap-2">
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Conectar Google Calendar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Status */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Estado del Equipo
              {connectionStatus.connected && (
                <Badge variant="outline" className="font-normal text-xs">
                  Actualización automática
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {team.map(member => {
              const calendarStatus = userStatuses[member.userId];
              const isCurrentUser = member.userId === user?.id;
              
              // Use calendar status if connected, otherwise use manual status
              const displayStatus = connectionStatus.connected && calendarStatus 
                ? calendarStatusConfig[calendarStatus.status]
                : statusConfig[member.status];

              return (
                <div key={member.id} className="p-4 rounded-lg bg-secondary/30 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-lg">
                        {userNames[member.userId]?.charAt(0)}
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card",
                        displayStatus.color
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{userNames[member.userId]}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={cn("flex items-center gap-1", displayStatus.color.replace('bg-', 'text-'))}>
                          {displayStatus.label}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{member.workSchedule.start} - {member.workSchedule.end}</span>
                      </div>
                    </div>
                  </div>

                  {/* Calendar event info when connected */}
                  {connectionStatus.connected && calendarStatus && (
                    <div className="pl-16 space-y-1">
                      {calendarStatus.currentEvent && (
                        <div className="flex items-center gap-2 text-sm">
                          <Video className="h-3 w-3 text-warning" />
                          <span className="text-muted-foreground">Actual:</span>
                          <span className="font-medium">{calendarStatus.currentEvent.summary}</span>
                          {calendarStatus.minutesUntilNext && (
                            <span className="text-xs text-muted-foreground">
                              (termina en {calendarStatus.minutesUntilNext} min)
                            </span>
                          )}
                        </div>
                      )}
                      {calendarStatus.nextEvent && !calendarStatus.currentEvent && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3 w-3 text-info" />
                          <span className="text-muted-foreground">Próximo:</span>
                          <span className="font-medium">{calendarStatus.nextEvent.summary}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatEventTime(calendarStatus.nextEvent.start.dateTime, calendarStatus.nextEvent.start.date)}
                            {calendarStatus.minutesUntilNext && ` (en ${calendarStatus.minutesUntilNext} min)`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

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
                            member.status === status && statusConfig[status].color + '/20'
                          )} 
                          onClick={() => updateStatus(member.userId, status)}
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

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Events (when calendar connected) */}
          {connectionStatus.connected && upcomingEvents.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Próximos Eventos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Video className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventTime(event.start.dateTime, event.start.date)} - {formatEventTime(event.end.dateTime, event.end.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Fallback message when not connected */}
          {!connectionStatus.connected && (
            <Card className="bg-card border-border/50">
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">Conecta Calendar</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ver eventos y estados automáticamente desde Google Calendar.
                </p>
                <Button onClick={connect} disabled={isConnecting} variant="outline" size="sm" className="gap-2">
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Conectar
                </Button>
              </CardContent>
            </Card>
          )}

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
                    <p className="text-xs text-muted-foreground mt-2">— {userNames[a.authorId]} • {a.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
