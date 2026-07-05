import { useState, useEffect } from 'react'
import { supabase } from '../../../integrations/supabase/client'
import { useAccount } from '../context/AccountContext'
import { syncMetaAccountDaily } from '../lib/syncMetaToSupabase'

// ─── URL parser ───────────────────────────────────────────────────────────────
// Tabs build endpoints like: /accounts/act_123/campaigns?date_preset=last_14d
// or: /accounts/act_123/campaigns?since=2025-01-01&until=2025-03-31
// This extracts the fields the edge function expects.

interface ParsedEndpoint {
  type: string
  account_id: string
  date_preset?: string
  since?: string
  until?: string
}

function parseEndpoint(endpoint: string): ParsedEndpoint | null {
  if (!endpoint) return null
  try {
    const [path, qs] = endpoint.replace(/^\//, '').split('?')
    const parts = path.split('/')
    // Expected shape: accounts / {account_id} / {type}
    if (parts.length < 3 || parts[0] !== 'accounts') return null
    const [, account_id, type] = parts
    const params = Object.fromEntries(new URLSearchParams(qs ?? ''))
    return {
      type,
      account_id,
      date_preset: params.date_preset,
      since:       params.since,
      until:       params.until,
    }
  } catch {
    return null
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMetaApi<T>(endpoint: string, enabled = true) {
  const { clientId } = useAccount()
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !endpoint) {
      setLoading(false)
      setData(null)
      return
    }

    const parsed = parseEndpoint(endpoint)
    if (!parsed) {
      setError(`Endpoint inválido: ${endpoint}`)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase.functions
      .invoke('meta-ads-proxy', { body: parsed })
      .then(({ data: res, error: fnErr }) => {
        if (cancelled) return
        if (fnErr) {
          setError(fnErr.message)
          setLoading(false)
          return
        }
        setData((res?.data ?? []) as T)
        setLoading(false)

        // Background sync to Supabase — only from the 'campaigns' fetch
        // (adsets/ads tabs would otherwise re-trigger the same campaign-
        // level sync every time the user switches tabs). Fire-and-forget:
        // syncMetaAccountDaily never throws, and this must not block or
        // delay the UI that already rendered from `res`.
        if (parsed.type === 'campaigns') {
          syncMetaAccountDaily(parsed.account_id, clientId, {
            date_preset: parsed.date_preset,
            since: parsed.since,
            until: parsed.until,
          })
        }
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [endpoint, enabled, clientId])

  return { data, loading, error, refetch: () => {} }
}
