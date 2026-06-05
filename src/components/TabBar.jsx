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
              background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)',
              borderRadius: '50%', width: 46, height: 46,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: -22, boxShadow: '0 4px 14px rgba(0,112,186,0.45)'
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
