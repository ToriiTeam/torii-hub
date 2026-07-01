import { createContext, useContext, useState, type ReactNode } from 'react'
import type { DatePreset } from '../types/meta'

export type CompareMode = 'previous' | 'year' | 'none'

interface DateRangeContextType {
  datePreset: DatePreset
  customRange: { since: string; until: string } | null
  compareMode: CompareMode
  setDatePreset: (preset: DatePreset) => void
  setCustomRange: (range: { since: string; until: string }) => void
  setCompareMode: (mode: CompareMode) => void
  getQueryParams: () => string
  buildParams: () => string
}

const DateRangeContext = createContext<DateRangeContextType>({
  datePreset: 'last_7d',
  customRange: null,
  compareMode: 'previous',
  setDatePreset: () => {},
  setCustomRange: () => {},
  setCompareMode: () => {},
  getQueryParams: () => '',
  buildParams: () => '',
})

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [datePreset, setDatePreset] = useState<DatePreset>('last_7d')
  const [customRange, setCustomRange] = useState<{ since: string; until: string } | null>(null)
  const [compareMode, setCompareMode] = useState<CompareMode>('previous')

  const handleSetPreset = (preset: DatePreset) => {
    setDatePreset(preset)
    setCustomRange(null)
  }

  const handleSetCustomRange = (range: { since: string; until: string }) => {
    setCustomRange(range)
  }

  const getQueryParams = () => {
    if (customRange) {
      return `since=${customRange.since}&until=${customRange.until}`
    }
    return `date_preset=${datePreset}`
  }

  return (
    <DateRangeContext.Provider
      value={{
        datePreset,
        customRange,
        compareMode,
        setDatePreset: handleSetPreset,
        setCustomRange: handleSetCustomRange,
        setCompareMode,
        getQueryParams,
        buildParams: getQueryParams,
      }}
    >
      {children}
    </DateRangeContext.Provider>
  )
}

export function useDateRange() {
  return useContext(DateRangeContext)
}
