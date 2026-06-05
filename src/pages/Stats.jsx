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
  const [currency, setCurrency] = useState('MYR')
  const [monthOffset, setMonthOffset] = useState(0)

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
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

  const catMap = {}
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
  const catList = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  function fmt(n) {
    return currency === 'TWD' ? `NT$${n.toLocaleString()}` : `RM${n.toFixed(2)}`
  }

  return (
    <div className="page" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#f1f5f9' }}>統計</h1>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setMonthOffset(o => o - 1)} style={{ background: '#1e293b', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8 }}>‹</button>
        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{monthLabel}</span>
        <button onClick={() => setMonthOffset(o => Math.min(o + 1, 0))} style={{ background: '#1e293b', color: '#f1f5f9', padding: '8px 16px', borderRadius: 8 }}>›</button>
      </div>

      {/* Currency toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#1e293b', borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {['MYR', 'TWD'].map(c => (
          <button key={c} onClick={() => setCurrency(c)}
            style={{ padding: '8px', borderRadius: 8, fontWeight: 600, fontSize: 14,
              background: currency === c ? '#334155' : 'transparent',
              color: currency === c ? '#f1f5f9' : '#94a3b8' }}>
            {c === 'MYR' ? '🇲🇾 馬幣' : '🇹🇼 台幣'}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>收入</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{fmt(totalIncome)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>支出</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{fmt(totalExpense)}</div>
        </div>
      </div>

      {/* Category breakdown */}
      {catList.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>支出分類</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {catList.map(([cat, amount]) => {
              const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
              return (
                <div key={cat} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#f1f5f9' }}>{CATEGORY_ICONS[cat]} {cat}</span>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmt(amount)}</span>
                  </div>
                  <div style={{ background: '#334155', borderRadius: 4, height: 6 }}>
                    <div style={{ background: '#ef4444', height: 6, borderRadius: 4, width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{pct.toFixed(1)}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p>本月 {currency} 尚無記錄</p>
        </div>
      )}
    </div>
  )
}
