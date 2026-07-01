import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface SensitiveDataContextType {
  isHidden: boolean
  toggle: () => void
}

const SensitiveDataContext = createContext<SensitiveDataContextType>({
  isHidden: false,
  toggle: () => {},
})

export function SensitiveDataProvider({ children }: { children: ReactNode }) {
  const [isHidden, setIsHidden] = useState(() => {
    const stored = localStorage.getItem('hidesSensitiveData')
    return stored === 'true'
  })

  useEffect(() => {
    localStorage.setItem('hidesSensitiveData', String(isHidden))
  }, [isHidden])

  const toggle = () => setIsHidden((prev) => !prev)

  return (
    <SensitiveDataContext.Provider value={{ isHidden, toggle }}>
      {children}
    </SensitiveDataContext.Provider>
  )
}

export function useSensitiveData() {
  return useContext(SensitiveDataContext)
}
