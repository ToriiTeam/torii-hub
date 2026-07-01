import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export const NONE_ENTITY = 'none'

export interface EntityOption {
  id: string
  name: string
}

interface EntitySelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  options: EntityOption[]
}

export function EntitySelector({ value, onChange, label = 'Comparar con', options }: EntitySelectorProps) {
  return (
    <div className="metric-selector">
      {label && <label className="metric-selector-label">{label}</label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="select-trigger-sm">
          <SelectValue placeholder="Seleccionar entidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_ENTITY}>Ninguna</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
