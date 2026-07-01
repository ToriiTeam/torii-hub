import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { METRIC_OPTIONS } from '../../config/metrics'

interface MetricSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function MetricSelector({ value, onChange, label = 'Métrica' }: MetricSelectorProps) {
  return (
    <div className="metric-selector">
      {label && <label className="metric-selector-label">{label}</label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="select-trigger-sm">
          <SelectValue placeholder="Seleccionar métrica" />
        </SelectTrigger>
        <SelectContent>
          {METRIC_OPTIONS.map((opt) => (
            <SelectItem key={opt.key} value={opt.key}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
