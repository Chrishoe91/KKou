import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Trash2, Edit2, X, Check, Zap } from 'lucide-react'

const DEFAULT_CATEGORY_ICONS = {
  飲食: '🍽️', 交通: '🚗', 購物: '🛍️', 娛樂: '🎬',
  醫療: '💊', 住房: '🏠', 教育: '📚', 其他支出: '💸',
  薪資: '💼', 獎金: '🎁', 副業: '💻', 其他收入: '💰',
}
const DEFAULT_EXPENSE = [
  { name: '飲食', emoji: '🍽️' }, { name: '交通', emoji: '🚗' },
  { name: '購物', emoji: '🛍️' }, { name: '娛樂', emoji: '🎬' },
  { name: '醫療', emoji: '💊' }, { name: '住房', emoji: '🏠' },
  { name: '教育', emoji: '📚' }, { name: '其他支出', emoji: '💸' },
]
const DEFAULT_INCOME = [
  { name: '薪資', emoji: '💼' }, { name: '獎金', emoji: '🎁' },
  { name: '副業', emoji: '💻' }, { name: '其他收入', emoji: '💰' },
]

function fmt(amount, currency) {
  return currency === 'TWD' ? `NT$${amount.toLocaleString()}` : `RM ${amount.toFixed(2)}`
}

function groupByDate(transactions) {
  const groups = {}
  transactions.forEach(t => {
    const d = t.createdAt?.toDate?.() || new Date(t.createdAt)
    const key = format(d, 'yyyy-MM-dd')
    if (!groups[key]) groups[key] = { date: d, items: [] }
    groups[key].items.push(t)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function EditModal({ t, customCats, onClose }) {
  const [amount, setAmount] = useState(String(t.amount))
  const [currency, setCurrency] = useState(t.currency)
  const [category, setCategory] = useState(t.category)
  const [categoryEmoji, setCategoryEmoji] = useState(t.categoryEmoji || DEFAULT_CATEGORY_ICONS[t.category] || '💸')
  const [note, setNote] = useState(t.note || '')
  const [type, setType] = useState(t.type)
  const allCats = [...(type === 'expense' ? DEFAULT_EXPENSE : DEFAULT_INCOME), ...customCats.filter(c => c.type === type)]

  async function save() {
    await updateDoc(doc(db, 'transactions', t.id), { amount: parseFloat(amount), currency, category, categoryEmoji, note, type })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'white', width: '100%', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2c2e2f' }}>編輯記錄</h2>
          <button onClick={onClose} style={{ background: '#f5f7fa', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7378' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f5f7fa', borderRadius: 12, padding: 4 }}>
            {['expense', 'income'].map(tp => (
              <button key={tp} onClick={() => { setType(tp); setCategory(''); setCategoryEmoji('') }}
                style={{ padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                  background: type === tp ? (tp === 'expense' ? '#d0021b' : '#00a650') : 'transparent',
                  color: type === tp ? 'white' : '#6c7378' }}>
                {tp === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input className="input-field" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
            <select className="input-field" value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: 80 }}>
              <option value="MYR">RM</option>
              <option value="TWD">NT$</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {allCats.map(cat => (
              <button key={cat.name} onClick={() => { setCategory(cat.name); setCategoryEmoji(cat.emoji) }}
                style={{ padding: '10px 4px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: category === cat.name ? '#e8f0fe' : '#f5f7fa',
                  color: category === cat.name ? '#0070ba' : '#6c7378',
                  border: category === cat.name ? '2px solid #0070ba' : '2px solid transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{cat.name}</span>
              </button>
            ))}
          </div>
          <input className="input-field" placeholder="備註（選填）" value={note} onChange={e => setNote(e.target.value)} />
          <button onClick={save} className="btn-primary" disabled={!amount || !category} style={{ opacity: (!amount || !category) ? 0.5 : 1 }}>儲存變更</button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ user, setTab }) {
  const [transactions, setTransactions] = useState([])
  const [customCats, setCustomCats] = useState([])
  const [summary, setSummary] = useState({ income: { TWD: 0, MYR: 0 }, expense: { TWD: 0, MYR: 0 } })
  const [todayExpense, setTodayExpense] = useState({ TWD: 0, MYR: 0 })
  const [editTx, setEditTx] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(100))
    return onSnapshot(q, snap => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setTransactions(txs)
      const now = new Date()

      // This month summary
      const thisMonth = txs.filter(t => {
        const d = t.createdAt?.toDate?.() || new Date(t.createdAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      const s = { income: { TWD: 0, MYR: 0 }, expense: { TWD: 0, MYR: 0 } }
      thisMonth.forEach(t => { s[t.type][t.currency] = (s[t.type][t.currency] || 0) + t.amount })
      setSummary(s)

      // Today's expense
      const today = txs.filter(t => {
        const d = t.createdAt?.toDate?.() || new Date(t.createdAt)
        return d.toDateString() === now.toDateString() && t.type === 'expense'
      })
      const te = { TWD: 0, MYR: 0 }
      today.forEach(t => { te[t.currency] = (te[t.currency] || 0) + t.amount })
      setTodayExpense(te)
    })
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'categories'), snap => {
      setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  async function confirmDelete(id) {
    await deleteDoc(doc(db, 'transactions', id))
    setDeleteId(null)
  }

  const now = new Date()
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`
  const grouped = groupByDate(transactions)

  const todayStr = []
  if (todayExpense.MYR > 0) todayStr.push(`RM ${todayExpense.MYR.toFixed(2)}`)
  if (todayExpense.TWD > 0) todayStr.push(`NT$${todayExpense.TWD.toLocaleString()}`)
  const todayLabel = todayStr.length > 0 ? todayStr.join(' + ') : '--'

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '20px 20px 48px', paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 2 }}>{monthLabel}概覽</p>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1.4, maxWidth: 200 }}>讓每一塊錢，都帶我靠近理想生活。</h1>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 10 }}>今日支出</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: todayExpense.MYR > 0 || todayExpense.TWD > 0 ? '#fca5a5' : 'rgba(255,255,255,0.5)' }}>{todayLabel}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
              {(user.displayName || user.email)[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* Monthly summary */}
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '16px 20px', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 6 }}>本月收入</p>
              {summary.income.MYR > 0 && <p style={{ color: '#4ade80', fontWeight: 700, fontSize: 17 }}>+RM {summary.income.MYR.toFixed(2)}</p>}
              {summary.income.TWD > 0 && <p style={{ color: '#4ade80', fontWeight: 700, fontSize: 17 }}>+NT${summary.income.TWD.toLocaleString()}</p>}
              {summary.income.TWD === 0 && summary.income.MYR === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 17 }}>--</p>}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', width: 1 }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 6 }}>本月支出</p>
              {summary.expense.MYR > 0 && <p style={{ color: '#fca5a5', fontWeight: 700, fontSize: 17 }}>-RM {summary.expense.MYR.toFixed(2)}</p>}
              {summary.expense.TWD > 0 && <p style={{ color: '#fca5a5', fontWeight: 700, fontSize: 17 }}>-NT${summary.expense.TWD.toLocaleString()}</p>}
              {summary.expense.TWD === 0 && summary.expense.MYR === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 17 }}>--</p>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', paddingBottom: 90, marginTop: -4 }}>
        {/* Fixed expenses shortcut */}
        <button onClick={() => setTab('fixed')}
          style={{ width: '100%', background: 'white', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1.5px solid #e8f0fe' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={18} color="#0070ba" />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontWeight: 700, color: '#2c2e2f', fontSize: 14 }}>固定開銷</p>
            <p style={{ fontSize: 12, color: '#a0aab0', marginTop: 1 }}>保險、電費等每月固定費用</p>
          </div>
          <span style={{ color: '#0070ba', fontSize: 18 }}>›</span>
        </button>

        {/* Transactions grouped by date */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2c2e2f', marginBottom: 12 }}>帳目記錄</h2>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#a0aab0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 600, color: '#6c7378' }}>還沒有任何記錄</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>點下方 + 開始記帳</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {grouped.map(([dateKey, { date, items }]) => {
              const dayTotal = { MYR: 0, TWD: 0 }
              items.filter(t => t.type === 'expense').forEach(t => { dayTotal[t.currency] = (dayTotal[t.currency] || 0) + t.amount })
              const dayTotalStr = []
              if (dayTotal.MYR > 0) dayTotalStr.push(`-RM ${dayTotal.MYR.toFixed(2)}`)
              if (dayTotal.TWD > 0) dayTotalStr.push(`-NT$${dayTotal.TWD.toLocaleString()}`)

              return (
                <div key={dateKey}>
                  {/* Date header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2e2f' }}>
                        {format(date, 'M月d日', { locale: zhTW })}
                      </span>
                      <span style={{ fontSize: 12, color: '#a0aab0' }}>
                        {format(date, 'EEEE', { locale: zhTW })}
                      </span>
                    </div>
                    {dayTotalStr.length > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#d0021b' }}>{dayTotalStr.join(' ')}</span>
                    )}
                  </div>

                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(t => {
                      const icon = t.categoryEmoji || DEFAULT_CATEGORY_ICONS[t.category] || '💸'
                      const tDate = t.createdAt?.toDate?.() || new Date(t.createdAt)
                      return (
                        <div key={t.id} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: t.type === 'income' ? '#f0faf4' : '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                            {icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: '#2c2e2f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.note || t.category}
                            </div>
                            <div style={{ fontSize: 12, color: '#a0aab0', marginTop: 3 }}>
                              {t.userName} · {t.category} · {format(tDate, 'HH:mm')}
                              {t.isFixed && <span style={{ marginLeft: 6, background: '#e8f0fe', color: '#0070ba', padding: '1px 6px', borderRadius: 8, fontSize: 11 }}>固定</span>}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: t.type === 'income' ? '#00a650' : '#d0021b', flexShrink: 0, marginRight: 4 }}>
                            {t.type === 'income' ? '+' : '-'}{fmt(t.amount, t.currency)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => setEditTx(t)} style={{ background: 'none', color: '#a0aab0', padding: 2 }}><Edit2 size={14} /></button>
                            <button onClick={() => setDeleteId(t.id)} style={{ background: 'none', color: '#fca5a5', padding: 2 }}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editTx && <EditModal t={editTx} customCats={customCats} onClose={() => setEditTx(null)} />}

      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff0f0', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={24} color="#d0021b" />
            </div>
            <p style={{ color: '#2c2e2f', fontWeight: 700, fontSize: 17, marginBottom: 8 }}>確定要刪除？</p>
            <p style={{ color: '#a0aab0', fontSize: 14, marginBottom: 24 }}>刪除後無法復原</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ background: '#f5f7fa', color: '#6c7378', padding: '12px', borderRadius: 25, fontWeight: 700 }}>取消</button>
              <button onClick={() => confirmDelete(deleteId)} style={{ background: '#d0021b', color: 'white', padding: '12px', borderRadius: 25, fontWeight: 700 }}>刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
