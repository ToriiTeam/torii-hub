import { useState, useEffect } from 'react'
import { supabase } from '../../../integrations/supabase/client'

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
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [endpoint, enabled])

  return { data, loading, error, refetch: () => {} }
}
