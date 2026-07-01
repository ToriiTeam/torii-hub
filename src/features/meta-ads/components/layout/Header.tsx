import { useAccount } from '../../context/AccountContext'
import { useSensitiveData } from '../../context/SensitiveDataContext'
import { useDateRange } from '../../context/DateRangeContext'
import { DateRangePicker } from '../common/DateRangePicker'
import { CompareSelector } from '../common/CompareSelector'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export function Header() {
  const { accounts, selectedAccount, setSelectedAccount, loading, error } = useAccount()
  const { isHidden, toggle } = useSensitiveData()
  const { datePreset } = useDateRange()
  void datePreset

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1 className="header-title">Meta Ads</h1>
        <div className="header-account-selector">
          {loading ? (
            <div className="skeleton-cell" style={{ width: 180, height: 32 }} />
          ) : error ? (
            <span style={{ fontSize: 12, color: '#fc8181' }} title={error}>
              Error al cargar cuentas
            </span>
          ) : (
            <Select
              value={selectedAccount?.account_id ?? ''}
              onValueChange={(val) => {
                const found = accounts.find(a => a.account_id === val)
                if (found) setSelectedAccount(found)
              }}
            >
              <SelectTrigger className="account-select-trigger">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.account_id} value={acc.account_id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="header-right">
        <CompareSelector />
        <DateRangePicker />
        <button className="toggle-btn" onClick={toggle} title={isHidden ? 'Mostrar datos sensibles' : 'Ocultar datos sensibles'}>
          {isHidden ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
          {isHidden ? 'Mostrar' : 'Ocultar'}
        </button>
      </div>
    </header>
  )
}
