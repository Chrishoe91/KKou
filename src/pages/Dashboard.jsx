import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Plus } from 'lucide-react'

const CATEGORY_ICONS = {
  飲食: '🍽️', 交通: '🚗', 購物: '🛍️', 娛樂: '🎬',
  醫療: '💊', 住房: '🏠', 教育: '📚', 其他支出: '💸',
  薪資: '💼', 獎金: '🎁', 副業: '💻', 其他收入: '💰',
}

function fmt(amount, currency) {
  return currency === 'TWD'
    ? `NT$${amount.toLocaleString()}`
    : `RM${amount.toFixed(2)}`
}

export default function Dashboard({ user, setTab }) {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ income: { TWD: 0, MYR: 0 }, expense: { TWD: 0, MYR: 0 } })

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(50))
    const unsub = onSnapshot(q, snap => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setTransactions(txs)

      const now = new Date()
      const thisMonth = txs.filter(t => {
        const d = t.createdAt?.toDate?.() || new Date(t.createdAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })

      const s = { income: { TWD: 0, MYR: 0 }, expense: { TWD: 0, MYR: 0 } }
      thisMonth.forEach(t => {
        s[t.type][t.currency] = (s[t.type][t.currency] || 0) + t.amount
      })
      setSummary(s)
    })
    return unsub
  }, [])

  const now = new Date()
  const monthLabel = format(now, 'yyyy年M月', { locale: zhTW })

  return (
    <div className="page" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>扣扣 💰</h1>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>{monthLabel}概覽</p>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: 700 }}>
          {(user.displayName || user.email)[0].toUpperCase()}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TrendingUp size={14} color="#10b981" />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>本月收入</span>
          </div>
          {summary.income.TWD > 0 && <div className="income" style={{ fontSize: 16, fontWeight: 700 }}>NT${summary.income.TWD.toLocaleString()}</div>}
          {summary.income.MYR > 0 && <div className="income" style={{ fontSize: 16, fontWeight: 700 }}>RM{summary.income.MYR.toFixed(2)}</div>}
          {summary.income.TWD === 0 && summary.income.MYR === 0 && <div style={{ color: '#64748b', fontSize: 16 }}>--</div>}
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TrendingDown size={14} color="#ef4444" />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>本月支出</span>
          </div>
          {summary.expense.TWD > 0 && <div className="expense" style={{ fontSize: 16, fontWeight: 700 }}>NT${summary.expense.TWD.toLocaleString()}</div>}
          {summary.expense.MYR > 0 && <div className="expense" style={{ fontSize: 16, fontWeight: 700 }}>RM{summary.expense.MYR.toFixed(2)}</div>}
          {summary.expense.TWD === 0 && summary.expense.MYR === 0 && <div style={{ color: '#64748b', fontSize: 16 }}>--</div>}
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>最近記錄</h2>
      </div>

      {transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <p>還沒有任何記錄</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>點下方 + 開始記帳</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transactions.map(t => {
            const date = t.createdAt?.toDate?.() || new Date(t.createdAt)
            return (
              <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {CATEGORY_ICONS[t.category] || '💸'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.note || t.category}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {t.userName} · {t.category} · {format(date, 'M/d HH:mm')}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: t.type === 'income' ? '#10b981' : '#ef4444', flexShrink: 0 }}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount, t.currency)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
