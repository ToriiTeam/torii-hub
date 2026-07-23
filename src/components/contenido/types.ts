import type { Database } from '@/integrations/supabase/types';

// Same "alias straight from Database[...]['Row']" convention as
// features/finanzas/lib/types.ts and components/finanzas/types.ts.
export type ContentPillar = Database['public']['Tables']['content_pillars']['Row'];
export type ContentMechanism = Database['public']['Tables']['content_mechanisms']['Row'];
export type ContentHypothesis = Database['public']['Tables']['content_hypotheses']['Row'];
export type ContentCalendarItem = Database['public']['Tables']['content_calendar']['Row'];
export type ContentPhaseStatusRow = Database['public']['Tables']['content_phase_status']['Row'];
export type ContentPhaseGate = Database['public']['Tables']['content_phase_gates']['Row'];
export type ContentMetricsTanda = Database['public']['Tables']['content_metrics_tanda']['Row'];

export type Channel = 'youtube' | 'instagram' | 'linkedin';
export const CHANNELS: Channel[] = ['youtube', 'instagram', 'linkedin'];
export const CHANNEL_LABELS: Record<Channel, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

// Sentinel used only by the channel <Select> — "Todos" isn't a real
// `channel` value in the DB, so it never leaks past the filter into a
// query or payload.
export const ALL_CHANNELS = 'all';
export type ChannelFilter = Channel | typeof ALL_CHANNELS;

// Shared prop contract for all 5 Contenido Orgánico tabs. ContenidoOrganico.tsx
// owns every fetch; tabs only ever read from these props — same pattern as
// FinanzasTabProps in components/finanzas/types.ts.
export interface ContenidoTabProps {
  clientId: string | null; // null = Torii
  channelFilter: ChannelFilter;

  pillars: ContentPillar[];
  mechanisms: ContentMechanism[];
  hypotheses: ContentHypothesis[];
  calendar: ContentCalendarItem[];
  phaseStatus: ContentPhaseStatusRow[];
  phaseGates: ContentPhaseGate[];
  metricsTanda: ContentMetricsTanda[];

  loading: boolean;
  refetch: () => Promise<void>;
}
