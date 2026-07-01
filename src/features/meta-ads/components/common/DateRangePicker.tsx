import { useState } from 'react'
import { useDateRange } from '../../context/DateRangeContext'
import type { DatePreset } from '../../types/meta'

const presets: { value: DatePreset | 'custom'; label: string }[] = [
  { value: 'today',      label: 'Hoy' },
  { value: 'yesterday',  label: 'Ayer' },
  { value: 'last_7d',   label: 'Últimos 7 días' },
  { value: 'last_14d',  label: 'Últimos 14 días' },
  { value: 'last_30d',  label: 'Últimos 30 días' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: 'custom',    label: 'Personalizado' },
]

export function DateRangePicker() {
  const { datePreset, customRange, setDatePreset, setCustomRange } = useDateRange()
  const [mode, setMode] = useState<'preset' | 'custom'>(customRange ? 'custom' : 'preset')
  const [since, setSince] = useState(customRange?.since || '')
  const [until, setUntil] = useState(customRange?.until || '')

  const handleChange = (value: string) => {
    if (value === 'custom') {
      setMode('custom')
    } else {
      setMode('preset')
      setDatePreset(value as DatePreset)
    }
  }

  const handleApplyCustom = () => {
    if (since && until) setCustomRange({ since, until })
  }

  return (
    <div className="date-picker">
      <div className="select-wrapper">
        <select
          className="select"
          value={mode === 'custom' ? 'custom' : datePreset}
          onChange={(e) => handleChange(e.target.value)}
        >
          {presets.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {mode === 'custom' && (
        <>
          <input type="date" className="date-input" value={since} onChange={(e) => setSince(e.target.value)} />
          <span style={{ color: 'var(--text-secondary)' }}>a</span>
          <input type="date" className="date-input" value={until} onChange={(e) => setUntil(e.target.value)} />
          <button className="toggle-btn" onClick={handleApplyCustom}>Aplicar</button>
        </>
      )}
    </div>
  )
}
