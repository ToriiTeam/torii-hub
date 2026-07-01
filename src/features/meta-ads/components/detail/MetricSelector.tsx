import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { METRIC_OPTIONS, type MetricConfig } from '../../config/metrics'

export const NONE_METRIC = 'none'

interface MetricSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  options?: MetricConfig[]
  includeNone?: boolean
}

export function MetricSelector({
  value, onChange, label = 'Métrica', options = METRIC_OPTIONS, includeNone = false,
}: MetricSelectorProps) {
  return (
    <div className="metric-selector">
      {label && <label className="metric-selector-label">{label}</label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="select-trigger-sm">
          <SelectValue placeholder="Seleccionar métrica" />
        </SelectTrigger>
        <SelectContent>
          {includeNone && (
            <SelectItem value={NONE_METRIC}>Ninguna</SelectItem>
          )}
          {options.map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
