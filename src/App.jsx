import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import AddTransaction from './pages/AddTransaction'
import AIChat from './pages/AIChat'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import Categories from './pages/Categories'
import TabBar from './components/TabBar'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('home')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a' }}>
      <div style={{ color: '#10b981', fontSize: 32 }}>扣扣</div>
    </div>
  )

  if (!user) return <AuthPage />

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh' }}>
      {tab === 'home' && <Dashboard user={user} setTab={setTab} />}
      {tab === 'add' && <AddTransaction user={user} setTab={setTab} />}
      {tab === 'ai' && <AIChat user={user} />}
      {tab === 'stats' && <Stats user={user} />}
      {tab === 'settings' && <Settings user={user} setTab={setTab} />}
      {tab === 'categories' && <Categories setTab={setTab} />}
      {tab !== 'categories' && <TabBar tab={tab} setTab={setTab} />}
    </div>
  )
}
