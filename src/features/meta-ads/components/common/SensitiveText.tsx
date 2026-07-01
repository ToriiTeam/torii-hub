import { useSensitiveData } from '../../context/SensitiveDataContext'

interface SensitiveTextProps {
  children: string
}

export function SensitiveText({ children }: SensitiveTextProps) {
  const { isHidden } = useSensitiveData()
  return <span className={isHidden ? 'sensitive-hidden' : 'sensitive-visible'}>{children}</span>
}
