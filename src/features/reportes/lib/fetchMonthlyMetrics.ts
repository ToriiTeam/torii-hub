import { supabase } from '@/integrations/supabase/client';
import { EMPTY_METRICS, type ReportMetrics, type TrendPoint } from '../types';

// client_metrics is a WEEKLY table (one row per client per ISO week), not
// daily — there's no populated daily table for this, so the monthly report
// aggregates whichever weeks overlap the target month. A week is included
// if it overlaps at all (week_start <= monthEnd && week_end >= monthStart);
// its whole week is counted rather than pro-rating days that spill into the
// neighboring month, since these are pre-aggregated weekly totals/rates that
// can't be split by day.
export async function fetchMonthlyMetrics(
  clientId: string,
  year: number,
  month: number, // 1-12
): Promise<{ metrics: ReportMetrics; trend: TrendPoint[] }> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const since = monthStart.toISOString().slice(0, 10);
  const until = monthEnd.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('client_metrics')
    .select('week_start, week_end, ads_investment, ads_leads, ads_bookings, ads_show_rate, ads_close_rate')
    .eq('client_id', clientId)
    .lte('week_start', until)
    .gte('week_end', since)
    .order('week_start', { ascending: true });

  if (error || !data || data.length === 0) {
    return { metrics: EMPTY_METRICS, trend: [] };
  }

  let inversionTotal = 0;
  let leads = 0;
  let bookingsWeighted = 0; // sum of ads_bookings, used both as "reuniones" and as the weight for show/close rate
  let showRateWeighted = 0; // sum(ads_show_rate * ads_bookings)
  let closeRateWeighted = 0; // sum(ads_close_rate * ads_bookings)
  const trend: TrendPoint[] = [];

  for (const row of data) {
    const inv = row.ads_investment ? parseFloat(String(row.ads_investment)) : 0;
    const rowLeads = row.ads_leads ?? 0;
    const bookings = row.ads_bookings ?? 0;
    const showRate = row.ads_show_rate ? parseFloat(String(row.ads_show_rate)) : 0;
    const closeRate = row.ads_close_rate ? parseFloat(String(row.ads_close_rate)) : 0;

    inversionTotal += inv;
    leads += rowLeads;
    bookingsWeighted += bookings;
    showRateWeighted += showRate * bookings;
    closeRateWeighted += closeRate * bookings;

    trend.push({ fecha: row.week_start, inversion: inv, leads: rowLeads });
  }

  const reuniones = bookingsWeighted;
  // close_rate is a percentage of reuniones — back out an absolute count
  // since that's what the report shows ("Cierres"), not a rate.
  const cierres = reuniones > 0 ? Math.round((closeRateWeighted / reuniones / 100) * reuniones) : 0;

  const metrics: ReportMetrics = {
    inversionTotal,
    leads,
    cpl: leads > 0 ? inversionTotal / leads : null,
    reuniones,
    cpbc: reuniones > 0 ? inversionTotal / reuniones : null,
    conversionLeadReunion: leads > 0 ? (reuniones / leads) * 100 : null,
    showRate: reuniones > 0 ? showRateWeighted / reuniones : null,
    cierres,
  };

  return { metrics, trend };
}
