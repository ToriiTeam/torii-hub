import { supabase } from '../../../integrations/supabase/client';
import { extractLeads, getPrimaryResult, type InsightRow } from '../types/meta';

// Shape of each row returned by meta-ads-proxy's 'campaigns_daily' type —
// same base metrics as InsightRow, plus date_start/date_stop since this is
// the one call that requests daily granularity (time_increment=1).
interface DailyCampaignRow {
  campaign_id: string;
  campaign_name: string;
  effective_status?: string;
  status?: string;
  campaign_objective?: string;
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  reach: string;
  frequency: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  actions?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
}

// ads_campanas.estado has a CHECK constraint allowing only these 4 Spanish
// values — Meta's effective_status/status come back as English constants
// (ACTIVE, PAUSED, CAMPAIGN_PAUSED, ARCHIVED, PENDING_REVIEW, etc.), so they
// need mapping, not just .toLowerCase(). Anything not clearly active/paused/
// finished falls back to 'borrador' rather than guessing.
function mapMetaStatusToEstado(metaStatus: string): string {
  const s = metaStatus.toUpperCase();
  if (s === 'ACTIVE') return 'activa';
  if (s === 'PAUSED' || s === 'CAMPAIGN_PAUSED' || s === 'ADSET_PAUSED') return 'pausada';
  if (s === 'DELETED' || s === 'ARCHIVED') return 'finalizada';
  return 'borrador';
}

// Upserts campaigns (deduped, one row per campaign_id even though the input
// has one row per campaign PER DAY) then the daily metrics, in exactly 2
// batched requests regardless of how many days/campaigns are involved —
// not one request per row, which would be hundreds of round-trips for a
// month of data across a real account.
async function upsertCampaignsDaily(rows: DailyCampaignRow[], clientId: string | null, accountId: string): Promise<void> {
  if (rows.length === 0) return;

  const campaignsByCampaignId = new Map<string, { campaign_id: string; nombre: string; estado: string }>();
  for (const row of rows) {
    campaignsByCampaignId.set(row.campaign_id, {
      campaign_id: row.campaign_id,
      nombre: row.campaign_name,
      estado: mapMetaStatusToEstado(row.effective_status || row.status || ''),
    });
  }
  const campaignsPayload = Array.from(campaignsByCampaignId.values()).map((c) => ({
    ...c,
    client_id: clientId,
    ad_account_id: accountId,
  }));

  const { data: upserted, error: campErr } = await supabase
    .from('ads_campanas')
    .upsert(campaignsPayload, { onConflict: 'campaign_id' })
    .select('id, campaign_id');
  if (campErr) throw campErr;

  const campanaIdByCampaignId = new Map<string, string>(
    (upserted ?? []).map((c) => [c.campaign_id as string, c.id]),
  );

  const metricsPayload = rows
    .map((row) => {
      const campanaId = campanaIdByCampaignId.get(row.campaign_id);
      if (!campanaId) return null;
      // extractLeads/getPrimaryResult only read the base-metric fields
      // (actions, cost_per_action_type, campaign_objective, etc.) that this
      // row shape already has — safe to treat as an InsightRow for this.
      const insightRow = row as unknown as InsightRow;
      const leads = extractLeads(insightRow);
      const result = getPrimaryResult(insightRow);
      return {
        campana_id: campanaId,
        fecha: row.date_start,
        inversion: parseFloat(row.spend) || 0,
        impresiones: parseInt(row.impressions, 10) || 0,
        alcance: parseInt(row.reach, 10) || 0,
        clics: parseInt(row.clicks, 10) || 0,
        ctr: parseFloat(row.ctr) || 0,
        cpc: parseFloat(row.cpc) || 0,
        cpm: parseFloat(row.cpm) || 0,
        leads,
        conversiones: Math.round(result.value),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (metricsPayload.length === 0) return;

  const { error: metricsErr } = await supabase
    .from('ads_metricas_diarias')
    .upsert(metricsPayload, { onConflict: 'campana_id,fecha' });
  if (metricsErr) throw metricsErr;
}

interface SyncDateParams {
  date_preset?: string;
  since?: string;
  until?: string;
}

// Fire-and-forget: fetches daily campaign insights (a separate Meta call
// from whatever the tabs already fetched — see meta-ads-proxy's
// 'campaigns_daily' case) and upserts them into ads_campanas /
// ads_metricas_diarias. Never throws — this runs in the background after a
// tab's own data has already rendered, so a sync failure shouldn't surface
// as a UI error; it's logged and dropped.
export async function syncMetaAccountDaily(
  accountId: string,
  clientId: string | null,
  dateParams: SyncDateParams,
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('meta-ads-proxy', {
      body: { type: 'campaigns_daily', account_id: accountId, ...dateParams },
    });
    if (error) throw error;
    const rows: DailyCampaignRow[] = data?.data ?? [];
    await upsertCampaignsDaily(rows, clientId, accountId);
    console.log(`[metaSync] synced ${rows.length} daily campaign row(s) for account ${accountId}`);
  } catch (err) {
    console.error('[metaSync] background sync failed:', err);
  }
}
