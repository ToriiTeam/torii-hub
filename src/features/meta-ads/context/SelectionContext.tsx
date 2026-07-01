import { createContext, useContext, useState, type ReactNode } from 'react'
import type { InsightRow, TabLevel } from '../types/meta'

export interface SelectedEntity {
  level: TabLevel
  id: string
  name: string
  row: InsightRow
}

interface SelectionContextType {
  selectedEntity: SelectedEntity | null
  selectEntity: (entity: SelectedEntity) => void
  clearSelection: () => void
  // aliases used by components
  selectedRow: InsightRow | null
  selectedLevel: TabLevel | null
  setSelectedRow: (row: InsightRow, level: TabLevel) => void
}

const SelectionContext = createContext<SelectionContextType>({
  selectedEntity: null,
  selectEntity: () => {},
  clearSelection: () => {},
  selectedRow: null,
  selectedLevel: null,
  setSelectedRow: () => {},
})

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null)

  const selectEntity = (entity: SelectedEntity) => {
    if (selectedEntity?.id === entity.id && selectedEntity?.level === entity.level) {
      setSelectedEntity(null)
    } else {
      setSelectedEntity(entity)
    }
  }

  const clearSelection = () => setSelectedEntity(null)

  const setSelectedRow = (row: InsightRow, level: TabLevel) => {
    const id = level === 'campaign'
      ? (row as InsightRow & { campaign_id?: string }).campaign_id ?? ''
      : level === 'adset'
      ? (row as InsightRow & { adset_id?: string }).adset_id ?? ''
      : (row as InsightRow & { ad_id?: string }).ad_id ?? ''

    const name = level === 'campaign'
      ? row.campaign_name ?? ''
      : level === 'adset'
      ? row.adset_name ?? ''
      : row.ad_name ?? ''

    setSelectedEntity({ level, id, name, row })
  }

  return (
    <SelectionContext.Provider value={{
      selectedEntity,
      selectEntity,
      clearSelection,
      selectedRow: selectedEntity?.row ?? null,
      selectedLevel: selectedEntity?.level ?? null,
      setSelectedRow,
    }}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  return useContext(SelectionContext)
}
