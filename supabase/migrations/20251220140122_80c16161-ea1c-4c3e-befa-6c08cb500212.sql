-- Create table for calendar events synced from Google Calendar via n8n
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  google_event_id text UNIQUE NOT NULL,
  team_user_id uuid REFERENCES public.team_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  location text,
  attendees jsonb,
  calendar_email text,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read events
CREATE POLICY "Authenticated users can view calendar events"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (true);

-- Allow service role to manage events (for n8n webhook)
CREATE POLICY "Service role can manage calendar events"
ON public.calendar_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_team_user ON public.calendar_events(team_user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();