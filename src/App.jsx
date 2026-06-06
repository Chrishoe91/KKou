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
import FixedExpenses from './pages/FixedExpenses'
import CreditCards from './pages/CreditCards'
import TabBar from './components/TabBar'

const NO_TABBAR = ['categories', 'fixed', 'creditcards']

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f7fa' }}>
      <div style={{ color: '#0070ba', fontSize: 32, fontWeight: 700 }}>扣扣 💰</div>
    </div>
  )

  if (!user) return <AuthPage />

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {tab === 'home'       && <Dashboard user={user} setTab={setTab} />}
      {tab === 'add'        && <AddTransaction user={user} setTab={setTab} />}
      {tab === 'ai'         && <AIChat user={user} />}
      {tab === 'stats'      && <Stats user={user} />}
      {tab === 'settings'   && <Settings user={user} setTab={setTab} />}
      {tab === 'categories' && <Categories setTab={setTab} />}
      {tab === 'fixed'        && <FixedExpenses user={user} setTab={setTab} />}
      {tab === 'creditcards'  && <CreditCards setTab={setTab} />}
      {!NO_TABBAR.includes(tab) && <TabBar tab={tab} setTab={setTab} />}
    </div>
  )
}
