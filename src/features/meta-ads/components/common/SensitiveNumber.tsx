import { useSensitiveData } from '../../context/SensitiveDataContext'

interface SensitiveNumberProps {
  value: number
  format?: 'currency' | 'number' | 'compact'
  currency?: string
}

export function formatNumber(value: number, format: string = 'number', currency: string = 'MXN'): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency,
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(value)
  }
  if (format === 'compact') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`
    return value.toLocaleString('es-MX')
  }
  return value.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}

export function SensitiveNumber({ value, format = 'number', currency = 'MXN' }: SensitiveNumberProps) {
  const { isHidden } = useSensitiveData()
  const formatted = formatNumber(value, format, currency)
  return <span className={isHidden ? 'sensitive-hidden' : 'sensitive-visible'}>{formatted}</span>
}
