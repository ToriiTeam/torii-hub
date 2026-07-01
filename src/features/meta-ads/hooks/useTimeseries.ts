import { useState, useEffect } from 'react'
import { supabase } from '../../../integrations/supabase/client'
import { useDateRange } from '../context/DateRangeContext'
import type { TimeseriesInsightRow } from '../types/meta'

// Called from two places:
//
//   MetricsBar  → useTimeseries(accountId, 'account', null, compareMode)
//     entityId is null → falls back to accountId (act_XXX)
//     Meta accepts /{act_XXX}/insights, giving account-level daily breakdown.
//     When compare='previous', returns both data and compareData.
//
//   DetailPanel → useTimeseries(accountId, 'campaign'|'adset'|'ad', entityId)
//     entityId is the specific numeric ID (campaign_id / adset_id / ad_id).
//     Meta accepts /{numeric_id}/insights for entity-level breakdown.

export function useTimeseries(
  accountId:  string | null,
  level:      string,
  entityId:   string | null,
  compare?:   'previous' | 'none',
) {
  const { datePreset, customRange } = useDateRange()

  const [data,        setData]        = useState<TimeseriesInsightRow[]>([])
  const [compareData, setCompareData] = useState<TimeseriesInsightRow[]>([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // Account-level: entityId is null → use accountId as the target.
  // Entity-level: entityId is the campaign/adset/ad ID.
  const effectiveId = entityId ?? accountId

  useEffect(() => {
    // Account-level uses accountId as the entity (act_XXX).
    // Campaign/adset/ad-level require a real entityId — skip if none provided
    // (e.g. DetailPanel mounted but no row selected yet).
    if (!effectiveId || (level !== 'account' && !entityId)) {
      setLoading(false)
      setData([])
      setCompareData([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const body: Record<string, string> = {
      type:      'timeseries',
      entity_id: effectiveId,
      level,
    }

    if (customRange) {
      body.since = customRange.since
      body.until = customRange.until
    } else {
      body.date_preset = datePreset
    }

    if (compare === 'previous') {
      body.compare = 'previous'
    }

    supabase.functions
      .invoke('meta-ads-proxy', { body })
      .then(({ data: res, error: fnErr }) => {
        if (cancelled) return
        if (fnErr) {
          console.error('[useTimeseries] error:', fnErr, '| body:', body)
          setError(fnErr.message)
          setLoading(false)
          return
        }
        setData((res?.data        ?? []) as TimeseriesInsightRow[])
        setCompareData((res?.compareData ?? []) as TimeseriesInsightRow[])
        setLoading(false)
      })
      .catch((err: Error) => {
        if (cancelled) return
        console.error('[useTimeseries] threw:', err, '| body:', body)
        setError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [effectiveId, level, datePreset, customRange, compare])

  return { data, compareData, loading, error }
}
