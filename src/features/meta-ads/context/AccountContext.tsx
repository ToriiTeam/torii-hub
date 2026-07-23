import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../../../integrations/supabase/client'
import type { AdAccount } from '../types/meta'
import type { Market } from '../types/audit'

interface AccountContextType {
  accounts:           AdAccount[]
  selectedAccount:    AdAccount | null
  setSelectedAccount: (account: AdAccount | null) => void
  loading: boolean
  error:   string | null
  market:  Market
  // The clients.id matched to the selected account, or null for Torii's own
  // house accounts / unmatched accounts. Used to stamp ads_campanas.client_id
  // when syncing — separate from `market`, which only cares about country.
  clientId: string | null
}

const AccountContext = createContext<AccountContextType>({
  accounts:           [],
  selectedAccount:    null,
  setSelectedAccount: () => {},
  loading:            true,
  error:              null,
  market:             'latam',
  clientId:           null,
})

// The Meta ad account name is whatever the business typed into Business
// Manager — it won't equal clients.name exactly, so match loosely in both
// directions (case-insensitive substring) rather than requiring an exact
// match. Only clients.country === 'Spain' maps to the 'spain' market;
// everything else (Mexico, Colombia, unmatched, or null) defaults to LATAM,
// per spec.
export function matchClientToAccount(accountName: string, clients: { id: string; name: string | null; country: string | null }[]) {
  const normalizedAccount = accountName.trim().toLowerCase()
  return clients.filter((c) => {
    const clientName = (c.name || '').trim().toLowerCase()
    if (!clientName) return false
    return normalizedAccount.includes(clientName) || clientName.includes(normalizedAccount)
  })
}

// Torii's own ad accounts (not client accounts, so they have no row in
// `clients` at all) — checked before the dynamic clients match, and always
// wins over it. Keys are lowercased/trimmed for the same loose comparison
// used against clients.name.
export const HARDCODED_ACCOUNT_MARKETS: Record<string, Market> = {
  'benjamin rivero': 'latam',
  'lm social constructions': 'latam',
  'cafepatrimonial': 'latam',
  'bxc bo': 'latam',
  'nutrición agustina rivero': 'latam',
}

export function matchHardcodedAccount(accountName: string): Market | null {
  return HARDCODED_ACCOUNT_MARKETS[accountName.trim().toLowerCase()] ?? null
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts,        setAccounts]        = useState<AdAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState<string | null>(null)
  const [market,          setMarket]          = useState<Market>('latam')
  const [clientId,        setClientId]        = useState<string | null>(null)

  useEffect(() => {
    supabase.functions
      .invoke('meta-ads-proxy', { body: { type: 'accounts' } })
      .then(({ data: res, error: fnErr }) => {
        if (fnErr) {
          console.error('[AccountContext] edge function error:', fnErr)
          setError(fnErr.message)
          setLoading(false)
          return
        }
        const list: AdAccount[] = res?.data ?? []
        console.log('[AccountContext] accounts loaded:', list.length, list)
        setAccounts(list)
        // account_status can arrive as number or string from Meta — normalize.
        const active = list.find((a) => Number(a.account_status) === 1) ?? list[0] ?? null
        setSelectedAccount(active)
        setLoading(false)
      })
      .catch((err: Error) => {
        console.error('[AccountContext] fetch threw:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Resolve which pricing market the selected account's client belongs to.
  // clients is a handful of rows, so fetching the whole table per account
  // switch is cheap — no need for a server-side filter.
  useEffect(() => {
    if (!selectedAccount) {
      setMarket('latam')
      setClientId(null)
      return
    }

    const hardcoded = matchHardcodedAccount(selectedAccount.name)
    if (hardcoded) {
      setMarket(hardcoded)
      setClientId(null) // house account — no clients row to attribute spend to
      return
    }

    let cancelled = false
    supabase
      .from('clients')
      .select('id, name, country')
      .then(({ data, error: fetchErr }) => {
        if (cancelled) return
        if (fetchErr || !data) {
          console.warn('[AccountContext] could not load clients for market match:', fetchErr?.message)
          setMarket('latam')
          setClientId(null)
          return
        }
        const matches = matchClientToAccount(selectedAccount.name, data)
        if (matches.length > 1) {
          console.warn(
            `[AccountContext] ambiguous client match for account "${selectedAccount.name}":`,
            matches.map((m) => m.name),
            '— defaulting to LATAM thresholds',
          )
          setMarket('latam')
          setClientId(null)
          return
        }
        if (matches.length === 0) {
          // No client row and not in the hardcoded Torii list either — a
          // new account, not an error. Default quietly, no console.warn.
          setMarket('latam')
          setClientId(null)
          return
        }
        setMarket(matches[0].country === 'Spain' ? 'spain' : 'latam')
        setClientId(matches[0].id)
      })
    return () => {
      cancelled = true
    }
  }, [selectedAccount])

  return (
    <AccountContext.Provider value={{ accounts, selectedAccount, setSelectedAccount, loading, error, market, clientId }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  return useContext(AccountContext)
}
