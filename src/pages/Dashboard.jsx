import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Trash2, Edit2, Check, X } from 'lucide-react'

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
  return currency === 'TWD' ? `NT$${amount.toLocaleString()}` : `RM${amount.toFixed(2)}`
}

function EditModal({ t, customCats, onSave, onClose }) {
  const [amount, setAmount] = useState(String(t.amount))
  const [currency, setCurrency] = useState(t.currency)
  const [category, setCategory] = useState(t.category)
  const [categoryEmoji, setCategoryEmoji] = useState(t.categoryEmoji || DEFAULT_CATEGORY_ICONS[t.category] || '💸')
  const [note, setNote] = useState(t.note || '')
  const [type, setType] = useState(t.type)

  const defaultCats = type === 'expense' ? DEFAULT_EXPENSE : DEFAULT_INCOME
  const customFiltered = customCats.filter(c => c.type === type)
  const allCats = [...defaultCats, ...customFiltered]

  async function save() {
    await updateDoc(doc(db, 'transactions', t.id), {
      amount: parseFloat(amount),
      currency,
      category,
      categoryEmoji,
      note,
      type,
    })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#1e293b', width: '100%', borderRadius: '20px 20px 0 0', padding: 20, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>編輯記錄</h2>
          <button onClick={onClose} style={{ background: 'none', color: '#94a3b8' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#0f172a', borderRadius: 10, padding: 4 }}>
            {['expense', 'income'].map(tp => (
              <button key={tp} onClick={() => { setType(tp); setCategory(''); setCategoryEmoji('') }}
                style={{ padding: '8px', borderRadius: 8, fontWeight: 600,
                  background: type === tp ? (tp === 'expense' ? '#ef4444' : '#10b981') : 'transparent',
                  color: type === tp ? 'white' : '#94a3b8' }}>
                {tp === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>

          {/* Amount + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input className="input-field" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
            <select className="input-field" value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: 80 }}>
              <option value="MYR">RM</option>
              <option value="TWD">NT$</option>
            </select>
          </div>

          {/* Category */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {allCats.map(cat => (
              <button key={cat.name} onClick={() => { setCategory(cat.name); setCategoryEmoji(cat.emoji) }}
                style={{ padding: '8px 4px', borderRadius: 10, fontSize: 12, fontWeight: 500,
                  background: category === cat.name ? '#1d4ed8' : '#334155',
                  color: category === cat.name ? 'white' : '#cbd5e1',
                  border: category === cat.name ? '2px solid #3b82f6' : '2px solid transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Note */}
          <input className="input-field" placeholder="備註（選填）" value={note} onChange={e => setNote(e.target.value)} />

          <button onClick={save} className="btn-primary" disabled={!amount || !category} style={{ opacity: (!amount || !category) ? 0.5 : 1 }}>
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ user, setTab }) {
  const [transactions, setTransactions] = useState([])
  const [customCats, setCustomCats] = useState([])
  const [summary, setSummary] = useState({ income: { TWD: 0, MYR: 0 }, expense: { TWD: 0, MYR: 0 } })
  const [editTx, setEditTx] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

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
      thisMonth.forEach(t => { s[t.type][t.currency] = (s[t.type][t.currency] || 0) + t.amount })
      setSummary(s)
    })
    return unsub
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
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>最近記錄</h2>

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
            const icon = t.categoryEmoji || DEFAULT_CATEGORY_ICONS[t.category] || '💸'
            return (
              <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {icon}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setEditTx(t)} style={{ background: 'none', color: '#94a3b8', padding: 4 }}>
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => setDeleteId(t.id)} style={{ background: 'none', color: '#ef4444', padding: 4 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editTx && <EditModal t={editTx} customCats={customCats} onSave={() => setEditTx(null)} onClose={() => setEditTx(null)} />}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <p style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: 8 }}>確定要刪除這筆記錄？</p>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>刪除後無法復原</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ background: '#334155', color: '#f1f5f9', padding: '12px', borderRadius: 10, fontWeight: 600 }}>取消</button>
              <button onClick={() => confirmDelete(deleteId)} style={{ background: '#ef4444', color: 'white', padding: '12px', borderRadius: 10, fontWeight: 600 }}>刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
