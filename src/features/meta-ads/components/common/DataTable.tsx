import { useState, useMemo, useCallback } from 'react'
import type { InsightRow } from '../../types/meta'
import { extractRoas } from '../../types/meta'
import { getRowHealth } from '../../lib/auditEngine'
import type { HealthStatus, Market } from '../../types/audit'
import { useAccount } from '../../context/AccountContext'

export interface Column<T> {
  key: string
  label: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => number | string
  priority?: 'high' | 'low'
}

export interface FilterConfig<T> {
  key: string
  label: string
  getOptions: (data: T[]) => string[]
  matches: (row: T, value: string) => boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  onRowClick?: (row: T, index: number) => void
  selectedRowIndex?: number | null
  searchPlaceholder?: string
  searchField?: (row: T) => string
  filters?: FilterConfig<T>[]
}

const HEALTH_STYLES: Record<HealthStatus, { border: string; bg: string; dot: string; icon: string }> = {
  excellent: { border: 'var(--accent-green)', bg: 'rgba(52, 211, 153, 0.04)', dot: 'var(--accent-green)', icon: '✓' },
  good:      { border: 'transparent',         bg: 'transparent',               dot: 'var(--accent-blue)', icon: '●' },
  warning:   { border: 'var(--accent-yellow)', bg: 'rgba(251, 191, 36, 0.04)', dot: 'var(--accent-yellow)', icon: '⚠' },
  critical:  { border: 'var(--accent-red)',    bg: 'rgba(248, 113, 113, 0.05)', dot: 'var(--accent-red)',   icon: '!' },
}

function getRowAlertStyle(row: unknown, market: Market): { style: React.CSSProperties; health: HealthStatus } {
  const r = row as InsightRow
  // Suppress unused import warning
  void extractRoas
  const health = getRowHealth(r, market)
  const config = HEALTH_STYLES[health]
  return {
    style: config.border !== 'transparent'
      ? { borderLeft: `3px solid ${config.border}`, background: config.bg }
      : {},
    health,
  }
}

function exportCSV<T>(columns: Column<T>[], data: T[]) {
  const headerRow = columns.map(c => c.label).join(',')
  const rows = data.map(row =>
    columns.map(col => {
      const val = col.sortValue ? col.sortValue(row) : ''
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }).join(',')
  )
  const csv = [headerRow, ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `meta-ads-export-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function DataTable<T>({
  columns,
  data,
  pageSize = 25,
  onRowClick,
  selectedRowIndex,
  searchPlaceholder = 'Buscar...',
  searchField,
  filters,
}: DataTableProps<T>) {
  const { market } = useAccount()
  const [sortKey, setSortKey] = useState<string>('spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(0)
  }

  const toggleColumn = useCallback((key: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const filteredData = useMemo(() => {
    let result = data
    if (filters) {
      for (const filter of filters) {
        const val = activeFilters[filter.key]
        if (val) {
          result = result.filter(row => filter.matches(row, val))
        }
      }
    }
    if (searchQuery.trim() && searchField) {
      const q = searchQuery.toLowerCase()
      result = result.filter(row => searchField(row).toLowerCase().includes(q))
    }
    return result
  }, [data, searchQuery, searchField, filters, activeFilters])

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return filteredData
    return [...filteredData].sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredData, sortKey, sortDir, columns])

  const visibleColumns = columns.filter(c => !hiddenColumns.has(c.key))
  const lowPriorityCols = columns.filter(c => c.priority === 'low')
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const pageData = sortedData.slice(page * pageSize, (page + 1) * pageSize)

  if (data.length === 0) {
    return (
      <div className="table-container">
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">No hay datos para el periodo seleccionado</div>
        </div>
      </div>
    )
  }

  return (
    <div className="table-container">
      <div className="table-toolbar">
        <div className="table-search-wrapper">
          <svg className="table-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="table-search"
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0) }}
          />
          {searchQuery && (
            <button className="table-search-clear" onClick={() => setSearchQuery('')}>&times;</button>
          )}
        </div>
        {filters && filters.map(filter => {
          const options = filter.getOptions(data)
          if (options.length <= 1) return null
          return (
            <div key={filter.key} className="select-wrapper">
              <select
                className="select"
                style={{ minWidth: 140, fontSize: 12, padding: '5px 28px 5px 8px' }}
                value={activeFilters[filter.key] || ''}
                onChange={(e) => {
                  setActiveFilters(prev => ({ ...prev, [filter.key]: e.target.value }))
                  setPage(0)
                }}
              >
                <option value="">{filter.label}: Todas</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )
        })}

        <div className="table-toolbar-actions">
          {(searchQuery || Object.values(activeFilters).some(v => v)) && (
            <span className="table-result-count">{filteredData.length} resultados</span>
          )}
          {lowPriorityCols.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button className="table-toolbar-btn" onClick={() => setShowColumnPicker(!showColumnPicker)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
                Columnas
              </button>
              {showColumnPicker && (
                <div className="column-picker">
                  {columns.map(col => (
                    <label key={col.key} className="column-picker-item">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        disabled={col.priority === 'high'}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className="table-toolbar-btn" onClick={() => exportCSV(visibleColumns, sortedData)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th className="health-header" style={{ width: 28, minWidth: 28, padding: '8px 4px' }}></th>
              {visibleColumns.map((col) => (
                <th key={col.key} className={sortKey === col.key ? 'sorted' : ''} onClick={() => handleSort(col.key)}>
                  <span className="th-content">
                    {col.label}
                    {sortKey === col.key
                      ? <span className="sort-indicator">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                      : <span className="sort-indicator-idle"> ↕</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => {
              const actualIndex = page * pageSize + i
              const isSelected = selectedRowIndex === actualIndex
              const { style: alertStyle, health } = getRowAlertStyle(row, market)
              const healthConfig = HEALTH_STYLES[health]
              return (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row, actualIndex)}
                  className={isSelected ? 'row-selected' : ''}
                  style={{
                    cursor: onRowClick ? 'pointer' : undefined,
                    ...(isSelected ? { borderLeft: '3px solid var(--accent-blue)', background: 'var(--bg-hover)' } : alertStyle),
                  }}
                >
                  <td className="health-cell">
                    <span
                      className={`health-dot health-${health}`}
                      title={health === 'excellent' ? 'Excelente' : health === 'good' ? 'Bueno' : health === 'warning' ? 'Atención' : 'Crítico'}
                    >
                      {healthConfig.icon}
                    </span>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>
          {sortedData.length > 0
            ? `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, sortedData.length)} de ${sortedData.length}`
            : '0 resultados'}
        </span>
        {totalPages > 1 && (
          <div className="pagination-btns">
            <button className="pagination-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <button className="pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        )}
      </div>
    </div>
  )
}
