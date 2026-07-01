import { useDateRange, type CompareMode } from '../../context/DateRangeContext'

const OPTIONS: { value: CompareMode; label: string }[] = [
  { value: 'none',     label: 'Sin comparar' },
  { value: 'previous', label: 'vs Período anterior' },
]

export function CompareSelector() {
  const { compareMode, setCompareMode } = useDateRange()
  return (
    <div className="select-wrapper">
      <select
        className="select"
        value={compareMode}
        onChange={(e) => setCompareMode(e.target.value as CompareMode)}
        style={{ minWidth: 160 }}
      >
        {OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
