import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, timeMin, timeMax } = await req.json();

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    console.log('Fetching calendar events...');
    console.log('Time range:', timeMin, 'to', timeMax);

    // Fetch events from Google Calendar API
    const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    calendarUrl.searchParams.set('timeMin', timeMin || new Date().toISOString());
    calendarUrl.searchParams.set('timeMax', timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
    calendarUrl.searchParams.set('singleEvents', 'true');
    calendarUrl.searchParams.set('orderBy', 'startTime');
    calendarUrl.searchParams.set('maxResults', '50');

    const eventsResponse = await fetch(calendarUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error('Calendar API error:', eventsResponse.status, errorText);
      
      if (eventsResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'Token expired',
          needsRefresh: true 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Calendar API error: ${eventsResponse.status}`);
    }

    const data = await eventsResponse.json();
    
    console.log(`Fetched ${data.items?.length || 0} events`);

    // Transform events to our format
    const events = (data.items || []).map((event: any) => ({
      id: event.id,
      summary: event.summary || 'Sin título',
      description: event.description,
      start: {
        dateTime: event.start?.dateTime,
        date: event.start?.date,
      },
      end: {
        dateTime: event.end?.dateTime,
        date: event.end?.date,
      },
      location: event.location,
      attendees: event.attendees?.map((a: any) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
      })),
    }));

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-calendar-events:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
