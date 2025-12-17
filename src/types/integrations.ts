// Google Drive types
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

export interface DriveConnectionStatus {
  connected: boolean;
  lastSync?: string;
  error?: string;
}

// Google Calendar types
export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  attendees?: { email: string }[];
}

export interface CalendarStatus {
  status: 'disponible' | 'en_reunion' | 'proximo_ocupado' | 'ocupado' | 'ausente';
  currentEvent?: CalendarEvent;
  nextEvent?: CalendarEvent;
  minutesUntilNext?: number;
}

export interface CalendarConnectionStatus {
  connected: boolean;
  lastSync?: string;
  error?: string;
}

// N8N types
export type ReportType = 'daily_metrics' | 'weekly_summary' | 'monthly_report' | 'financial' | 'custom';

export interface ReportConfig {
  type: ReportType;
  startDate?: string;
  endDate?: string;
  includeSetters?: boolean;
  includeClosers?: boolean;
  includeFinances?: boolean;
  includeTasks?: boolean;
}

export interface ReportHistory {
  id: string;
  type: ReportType;
  date: string;
  status: 'enviado' | 'fallido' | 'pendiente';
  recipients?: string[];
}

export interface N8NConnectionStatus {
  connected: boolean;
  webhookUrl?: string;
  lastTest?: string;
  error?: string;
}

// Integration storage keys
export const INTEGRATION_KEYS = {
  DRIVE_TOKEN: 'torii:google:drive_token',
  DRIVE_FILES: 'torii:google:drive_files',
  CALENDAR_TOKEN: 'torii:google:calendar_token',
  CALENDAR_EVENTS: 'torii:google:calendar_events',
  N8N_WEBHOOK: 'torii:n8n:webhook_url',
  REPORTS_HISTORY: 'torii:reports:history',
} as const;
