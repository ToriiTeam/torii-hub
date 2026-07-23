import type { DatePreset } from '../types/meta'

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Mirrors presetToRange() in supabase/functions/meta-ads-proxy/index.ts —
// kept in sync manually since one runs in Deno and the other in the browser.
export function presetToRange(preset: DatePreset): { since: string; until: string } {
  const today = new Date()
  const d = (n: number) => { const r = new Date(today); r.setDate(today.getDate() - n); return r }
  switch (preset) {
    case 'today':      return { since: fmtDate(today), until: fmtDate(today) }
    case 'yesterday':  return { since: fmtDate(d(1)),  until: fmtDate(d(1)) }
    case 'last_7d':    return { since: fmtDate(d(6)),  until: fmtDate(today) }
    case 'last_14d':   return { since: fmtDate(d(13)), until: fmtDate(today) }
    case 'last_30d':   return { since: fmtDate(d(29)), until: fmtDate(today) }
    case 'this_month': return {
      since: fmtDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      until: fmtDate(today),
    }
    case 'last_month': return {
      since: fmtDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      until: fmtDate(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
    default: return { since: fmtDate(d(6)), until: fmtDate(today) }
  }
}

// Resolves the currently-selected range to concrete (since, until) dates —
// custom range wins when set, otherwise the preset is expanded.
export function currentPeriodRange(
  preset: DatePreset,
  customRange: { since: string; until: string } | null,
): { since: string; until: string } {
  return customRange ?? presetToRange(preset)
}

// Computes the previous period of equal duration, ending the day before the
// current period starts. Works for both presets and custom ranges.
export function previousPeriod(
  preset: DatePreset,
  customRange: { since: string; until: string } | null,
): { since: string; until: string } {
  const curr = customRange ?? presetToRange(preset)
  const s = new Date(curr.since)
  const e = new Date(curr.until)
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  const prevUntil = new Date(s)
  prevUntil.setDate(s.getDate() - 1)
  const prevSince = new Date(prevUntil)
  prevSince.setDate(prevUntil.getDate() - days + 1)
  return { since: fmtDate(prevSince), until: fmtDate(prevUntil) }
}
