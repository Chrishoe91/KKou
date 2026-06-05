import { Home, Plus, MessageCircle, BarChart2, Settings } from 'lucide-react'

export default function TabBar({ tab, setTab }) {
  const items = [
    { id: 'home', icon: Home, label: '首頁' },
    { id: 'stats', icon: BarChart2, label: '統計' },
    { id: 'add', icon: Plus, label: '記帳' },
    { id: 'ai', icon: MessageCircle, label: 'AI' },
    { id: 'settings', icon: Settings, label: '設定' },
  ]

  return (
    <div className="tab-bar">
      {items.map(({ id, icon: Icon, label }) => (
        <button key={id} className={`tab-item${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
          {id === 'add' ? (
            <div style={{
              background: tab === 'add' ? '#059669' : '#10b981',
              borderRadius: '50%', width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: -20, boxShadow: '0 4px 12px rgba(16,185,129,0.4)'
            }}>
              <Icon size={22} color="white" />
            </div>
          ) : (
            <Icon size={22} />
          )}
          {id !== 'add' && <span>{label}</span>}
        </button>
      ))}
    </div>
  )
}
