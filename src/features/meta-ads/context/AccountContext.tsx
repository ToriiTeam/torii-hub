import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../../../integrations/supabase/client'
import type { AdAccount } from '../types/meta'

interface AccountContextType {
  accounts:           AdAccount[]
  selectedAccount:    AdAccount | null
  setSelectedAccount: (account: AdAccount | null) => void
  loading: boolean
  error:   string | null
}

const AccountContext = createContext<AccountContextType>({
  accounts:           [],
  selectedAccount:    null,
  setSelectedAccount: () => {},
  loading:            true,
  error:              null,
})

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts,        setAccounts]        = useState<AdAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState<string | null>(null)

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

  return (
    <AccountContext.Provider value={{ accounts, selectedAccount, setSelectedAccount, loading, error }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  return useContext(AccountContext)
}
