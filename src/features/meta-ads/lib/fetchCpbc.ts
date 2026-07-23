import { supabase } from '../../../integrations/supabase/client'
import { calcCostoPorLlamadaCalificada } from '@/features/executive-dashboard/lib/businessHealth'
import { matchHardcodedAccount, matchClientToAccount } from '../context/AccountContext'

// CPBC (Costo por Llamada Calificada) is an account-level aggregate —
// client_closer_calls has no campaign_id, so unlike "Resultados" there's no
// meaningful per-campaign/adset/ad CPBC. Only shown in SummaryKPIs (the
// account/period summary), never as a table column.
//
// Same account→client matching AccountContext.tsx already does for market
// lookup, reused here (not duplicated) so a "LM Social Constructions" here
// and a "LM Social Constructions" there can never silently diverge.
export async function fetchCpbc(accountName: string, adsInversion: string | number, since: string, until: string): Promise<number | null> {
  const inversion = typeof adsInversion === 'string' ? parseFloat(adsInversion) || 0 : adsInversion

  const isHouseAccount = matchHardcodedAccount(accountName) !== null

  let qualifiedCallsQuery = supabase
    .from('client_closer_calls')
    .select('id', { count: 'exact', head: true })
    .eq('se_presento', true)
    .eq('califico', true)
    .gte('fecha_llamada', since)
    .lte('fecha_llamada', until)

  if (isHouseAccount) {
    qualifiedCallsQuery = qualifiedCallsQuery.eq('owner_type', 'torii').eq('fuente', 'ADS')
  } else {
    const { data: clients, error: clientsErr } = await supabase.from('clients').select('id, name, country')
    if (clientsErr) throw clientsErr
    const matches = matchClientToAccount(accountName, clients ?? [])
    if (matches.length !== 1) return null // no match, or ambiguous — CPBC undefined for this account
    qualifiedCallsQuery = qualifiedCallsQuery.eq('owner_type', 'client').eq('client_id', matches[0].id)
  }

  const { count, error } = await qualifiedCallsQuery
  if (error) throw error

  return calcCostoPorLlamadaCalificada(inversion, count ?? 0)
}
