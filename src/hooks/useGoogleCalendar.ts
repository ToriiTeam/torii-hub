import { useState, useCallback, useMemo } from 'react';
import { useStore } from './useStore';
import { CalendarEvent, CalendarStatus, CalendarConnectionStatus } from '@/types/integrations';
import { toast } from 'sonner';

// Mock calendar events for demo
const generateMockEvents = (): CalendarEvent[] => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  return [
    {
      id: 'cal-1',
      summary: 'Daily Standup',
      start: { dateTime: `${today}T09:00:00` },
      end: { dateTime: `${today}T09:30:00` },
    },
    {
      id: 'cal-2',
      summary: 'Reunión con Cliente TechStart',
      start: { dateTime: `${today}T11:00:00` },
      end: { dateTime: `${today}T12:00:00` },
      description: 'Revisión de proyecto Q1',
    },
    {
      id: 'cal-3',
      summary: 'Call de Seguimiento',
      start: { dateTime: `${today}T14:00:00` },
      end: { dateTime: `${today}T14:30:00` },
    },
    {
      id: 'cal-4',
      summary: 'Demo Propuesta MegaCorp',
      start: { dateTime: `${today}T16:00:00` },
      end: { dateTime: `${today}T17:00:00` },
      description: 'Presentación de servicios',
    },
    {
      id: 'cal-5',
      summary: 'Revisión Semanal',
      start: { dateTime: new Date(now.getTime() + 86400000).toISOString().split('.')[0] },
      end: { dateTime: new Date(now.getTime() + 86400000 + 3600000).toISOString().split('.')[0] },
    },
  ];
};

export function useGoogleCalendar() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarToken, setCalendarToken] = useStore<string | null>('google:calendar_token', null);
  const [calendarEvents, setCalendarEvents] = useStore<CalendarEvent[]>('google:calendar_events', []);

  const connectionStatus: CalendarConnectionStatus = {
    connected: !!calendarToken,
    lastSync: calendarEvents.length > 0 ? new Date().toISOString() : undefined,
  };

  const getCurrentStatus = useCallback((events: CalendarEvent[], userId: string): CalendarStatus => {
    const now = new Date();
    
    // Find current event
    const currentEvent = events.find(event => {
      const start = new Date(event.start.dateTime || event.start.date || '');
      const end = new Date(event.end.dateTime || event.end.date || '');
      return now >= start && now <= end;
    });

    if (currentEvent) {
      const end = new Date(currentEvent.end.dateTime || currentEvent.end.date || '');
      const minutesLeft = Math.round((end.getTime() - now.getTime()) / 60000);
      return {
        status: 'en_reunion',
        currentEvent,
        minutesUntilNext: minutesLeft,
      };
    }

    // Find next event within 15 minutes
    const upcomingEvents = events
      .filter(event => {
        const start = new Date(event.start.dateTime || event.start.date || '');
        return start > now;
      })
      .sort((a, b) => {
        const aStart = new Date(a.start.dateTime || a.start.date || '');
        const bStart = new Date(b.start.dateTime || b.start.date || '');
        return aStart.getTime() - bStart.getTime();
      });

    const nextEvent = upcomingEvents[0];
    
    if (nextEvent) {
      const nextStart = new Date(nextEvent.start.dateTime || nextEvent.start.date || '');
      const minutesUntil = Math.round((nextStart.getTime() - now.getTime()) / 60000);
      
      if (minutesUntil <= 15) {
        return {
          status: 'proximo_ocupado',
          nextEvent,
          minutesUntilNext: minutesUntil,
        };
      }

      return {
        status: 'disponible',
        nextEvent,
        minutesUntilNext: minutesUntil,
      };
    }

    return { status: 'disponible' };
  }, []);

  // Calculate statuses for all users (mocked for demo)
  const userStatuses = useMemo(() => {
    if (!calendarToken || calendarEvents.length === 0) {
      return {};
    }

    // In real app, each user would have their own calendar
    // For demo, we'll create slightly different statuses
    return {
      '1': getCurrentStatus(calendarEvents, '1'),
      '2': getCurrentStatus(calendarEvents.slice(1), '2'), // Different events for variety
      '3': getCurrentStatus(calendarEvents.slice(2), '3'),
    };
  }, [calendarToken, calendarEvents, getCurrentStatus]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockToken = `mock_calendar_token_${Date.now()}`;
      setCalendarToken(mockToken);
      setCalendarEvents(generateMockEvents());
      
      toast.success('Google Calendar conectado exitosamente');
      return true;
    } catch (error) {
      console.error('Error connecting to Calendar:', error);
      toast.error('Error al conectar con Google Calendar');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [setCalendarToken, setCalendarEvents]);

  const disconnect = useCallback(() => {
    setCalendarToken(null);
    setCalendarEvents([]);
    toast.success('Google Calendar desconectado');
  }, [setCalendarToken, setCalendarEvents]);

  const refreshEvents = useCallback(async () => {
    if (!calendarToken) {
      toast.error('Conecta Google Calendar primero');
      return;
    }
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCalendarEvents(generateMockEvents());
      toast.success('Eventos actualizados');
    } catch (error) {
      console.error('Error refreshing events:', error);
      toast.error('Error al actualizar eventos');
    } finally {
      setIsLoading(false);
    }
  }, [calendarToken, setCalendarEvents]);

  return {
    connectionStatus,
    calendarEvents,
    userStatuses,
    isConnecting,
    isLoading,
    connect,
    disconnect,
    refreshEvents,
    getCurrentStatus,
  };
}
