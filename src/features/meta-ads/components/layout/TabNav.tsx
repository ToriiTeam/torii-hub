interface TabNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const TABS = [
  { id: 'metricsbar', label: 'Resumen' },
  { id: 'campaigns',  label: 'Campañas' },
  { id: 'adsets',     label: 'Conjuntos' },
  { id: 'ads',        label: 'Anuncios' },
]

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="tab-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
