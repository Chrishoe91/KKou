import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'

const CATEGORY_ICONS = {
  飲食: '🍽️', 交通: '🚗', 購物: '🛍️', 娛樂: '🎬',
  醫療: '💊', 住房: '🏠', 教育: '📚', 其他支出: '💸',
  薪資: '💼', 獎金: '🎁', 副業: '💻', 其他收入: '💰',
}

export default function Stats({ user }) {
  const [transactions, setTransactions] = useState([])
  const [customCats, setCustomCats] = useState([])
  const [currency, setCurrency] = useState('MYR')
  const [monthOffset, setMonthOffset] = useState(0)

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'categories'), snap => setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthLabel = `${target.getFullYear()}年${target.getMonth() + 1}月`

  const filtered = transactions.filter(t => {
    const d = t.createdAt?.toDate?.() || new Date(t.createdAt)
    return d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear() && t.currency === currency
  })

  const expenses = filtered.filter(t => t.type === 'expense')
  const incomes = filtered.filter(t => t.type === 'income')
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpense

  const catMap = {}
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
  const catList = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  function fmt(n) {
    return currency === 'TWD' ? `NT$${n.toLocaleString()}` : `RM ${n.toFixed(2)}`
  }

  function getIcon(cat) {
    const custom = customCats.find(c => c.name === cat)
    return custom?.emoji || CATEGORY_ICONS[cat] || '💸'
  }

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '20px 20px 48px', paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 16 }}>統計報表</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setMonthOffset(o => o - 1)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: 18 }}>‹</button>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{monthLabel}</span>
          <button onClick={() => setMonthOffset(o => Math.min(o + 1, 0))} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: 18 }}>›</button>
        </div>
      </div>

      <div style={{ padding: '0 16px 90px', marginTop: -28 }}>
        {/* Currency toggle */}
        <div style={{ background: 'white', borderRadius: 14, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {['MYR', 'TWD'].map(c => (
            <button key={c} onClick={() => setCurrency(c)}
              style={{ padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: currency === c ? '#0070ba' : 'transparent',
                color: currency === c ? 'white' : '#a0aab0' }}>
              {c === 'MYR' ? '🇲🇾 馬幣' : '🇹🇼 台幣'}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#a0aab0', marginBottom: 6, fontWeight: 600 }}>收入</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#00a650' }}>{fmt(totalIncome)}</p>
          </div>
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, color: '#a0aab0', marginBottom: 6, fontWeight: 600 }}>支出</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#d0021b' }}>{fmt(totalExpense)}</p>
          </div>
        </div>

        {/* Net */}
        <div style={{ background: net >= 0 ? '#f0faf4' : '#fff5f5', borderRadius: 14, padding: 16, marginBottom: 20, border: `1px solid ${net >= 0 ? '#bbf7d0' : '#fecaca'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 13, color: '#6c7378', marginBottom: 4, fontWeight: 600 }}>本月結餘</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: net >= 0 ? '#00a650' : '#d0021b' }}>
            {net >= 0 ? '+' : ''}{fmt(net)}
          </p>
        </div>

        {/* Category breakdown */}
        {catList.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#2c2e2f', marginBottom: 12 }}>支出分類</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {catList.map(([cat, amount]) => {
                const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
                return (
                  <div key={cat} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{getIcon(cat)}</span>
                        <span style={{ fontWeight: 600, color: '#2c2e2f' }}>{cat}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#d0021b', fontWeight: 700, fontSize: 15 }}>{fmt(amount)}</div>
                        <div style={{ fontSize: 11, color: '#a0aab0' }}>{pct.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div style={{ background: '#f0f4f8', borderRadius: 6, height: 6 }}>
                      <div style={{ background: 'linear-gradient(90deg, #003087, #0070ba)', height: 6, borderRadius: 6, width: `${pct}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#a0aab0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <p style={{ fontWeight: 600, color: '#6c7378' }}>本月 {currency} 尚無記錄</p>
          </div>
        )}
      </div>
    </div>
  )
}
