import { useState, useCallback, useMemo, useEffect } from 'react';
import { useStore } from './useStore';
import { CalendarEvent, CalendarStatus, CalendarConnectionStatus } from '@/types/integrations';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GoogleCalendarTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export function useGoogleCalendar() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokens, setTokens] = useStore<GoogleCalendarTokens | null>('google:calendar_tokens', null);
  const [calendarEvents, setCalendarEvents] = useStore<CalendarEvent[]>('google:calendar_events', []);
  const [lastSync, setLastSync] = useStore<string | null>('google:calendar_last_sync', null);

  const connectionStatus: CalendarConnectionStatus = {
    connected: !!tokens?.access_token,
    lastSync: lastSync || undefined,
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

  // Calculate statuses for all users
  const userStatuses = useMemo(() => {
    if (!tokens || calendarEvents.length === 0) {
      return {};
    }

    return {
      '1': getCurrentStatus(calendarEvents, '1'),
      '2': getCurrentStatus(calendarEvents.slice(1), '2'),
      '3': getCurrentStatus(calendarEvents.slice(2), '3'),
    };
  }, [tokens, calendarEvents, getCurrentStatus]);

  // Check if token needs refresh
  const isTokenExpired = useCallback(() => {
    if (!tokens) return true;
    return Date.now() >= tokens.expires_at - 60000; // 1 minute buffer
  }, [tokens]);

  // Refresh access token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens?.refresh_token) return null;

    try {
      console.log('Refreshing Google Calendar access token...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {
          action: 'refresh-token',
          refreshToken: tokens.refresh_token,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const newTokens: GoogleCalendarTokens = {
        access_token: data.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
      };

      setTokens(newTokens);
      console.log('Token refreshed successfully');
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Token refresh failed, need to re-authenticate
      setTokens(null);
      setCalendarEvents([]);
      toast.error('Sesión expirada. Reconecta Google Calendar.');
      return null;
    }
  }, [tokens, setTokens, setCalendarEvents]);

  // Get valid access token (refresh if needed)
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) return null;
    
    if (isTokenExpired()) {
      return await refreshAccessToken();
    }
    
    return tokens.access_token;
  }, [tokens, isTokenExpired, refreshAccessToken]);

  // Start OAuth flow
  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/disponibilidad`;
      
      console.log('Starting Google Calendar OAuth flow...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {
          action: 'get-auth-url',
          redirectUri,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Store redirect URI for callback
      localStorage.setItem('google_calendar_redirect_uri', redirectUri);
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
      
    } catch (error) {
      console.error('Error connecting to Calendar:', error);
      toast.error('Error al conectar con Google Calendar');
      setIsConnecting(false);
    }
  }, []);

  // Handle OAuth callback
  const handleOAuthCallback = useCallback(async (code: string) => {
    setIsConnecting(true);
    try {
      const redirectUri = localStorage.getItem('google_calendar_redirect_uri') || `${window.location.origin}/disponibilidad`;
      
      console.log('Exchanging OAuth code for tokens...');
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: {
          action: 'exchange-code',
          code,
          redirectUri,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const newTokens: GoogleCalendarTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
      };

      setTokens(newTokens);
      localStorage.removeItem('google_calendar_redirect_uri');
      
      toast.success('Google Calendar conectado exitosamente');
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Fetch events immediately
      await fetchEvents(data.access_token);
      
      return true;
    } catch (error) {
      console.error('Error completing OAuth:', error);
      toast.error('Error al completar la conexión');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [setTokens]);

  // Fetch events from Google Calendar
  const fetchEvents = useCallback(async (accessToken?: string) => {
    const token = accessToken || await getValidAccessToken();
    if (!token) {
      toast.error('Conecta Google Calendar primero');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Fetching Google Calendar events...');
      
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase.functions.invoke('google-calendar-events', {
        body: {
          accessToken: token,
          timeMin,
          timeMax,
        },
      });

      if (error) throw error;
      
      if (data.needsRefresh) {
        // Token expired, try to refresh
        const newToken = await refreshAccessToken();
        if (newToken) {
          return await fetchEvents(newToken);
        }
        return;
      }
      
      if (data.error) throw new Error(data.error);

      setCalendarEvents(data.events || []);
      setLastSync(new Date().toISOString());
      
      console.log(`Fetched ${data.events?.length || 0} events`);
      toast.success('Eventos actualizados');
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Error al obtener eventos');
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken, refreshAccessToken, setCalendarEvents, setLastSync]);

  const disconnect = useCallback(() => {
    setTokens(null);
    setCalendarEvents([]);
    setLastSync(null);
    localStorage.removeItem('google_calendar_redirect_uri');
    toast.success('Google Calendar desconectado');
  }, [setTokens, setCalendarEvents, setLastSync]);

  // Check for OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
      toast.error('Error en la autenticación de Google');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (code && !tokens) {
      handleOAuthCallback(code);
    }
  }, []);

  // Auto-refresh events periodically when connected
  useEffect(() => {
    if (!tokens) return;

    // Refresh events every 5 minutes
    const interval = setInterval(() => {
      fetchEvents();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [tokens, fetchEvents]);

  return {
    connectionStatus,
    calendarEvents,
    userStatuses,
    isConnecting,
    isLoading,
    connect,
    disconnect,
    refreshEvents: fetchEvents,
    getCurrentStatus,
    handleOAuthCallback,
  };
}
