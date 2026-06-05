import { useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ArrowLeft } from 'lucide-react'

const EXPENSE_CATS = ['飲食', '交通', '購物', '娛樂', '醫療', '住房', '教育', '其他支出']
const INCOME_CATS = ['薪資', '獎金', '副業', '其他收入']
const CATEGORY_ICONS = {
  飲食: '🍽️', 交通: '🚗', 購物: '🛍️', 娛樂: '🎬',
  醫療: '💊', 住房: '🏠', 教育: '📚', 其他支出: '💸',
  薪資: '💼', 獎金: '🎁', 副業: '💻', 其他收入: '💰',
}

export default function AddTransaction({ user, setTab }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('MYR')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const cats = type === 'expense' ? EXPENSE_CATS : INCOME_CATS

  async function submit(e) {
    e.preventDefault()
    if (!amount || !category) return
    setLoading(true)
    await addDoc(collection(db, 'transactions'), {
      type,
      amount: parseFloat(amount),
      currency,
      category,
      note,
      userId: user.uid,
      userName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    })
    setLoading(false)
    setTab('home')
  }

  return (
    <div className="page" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setTab('home')} style={{ background: 'none', color: '#94a3b8', padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>新增記錄</h1>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Type toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#1e293b', borderRadius: 10, padding: 4 }}>
          {['expense', 'income'].map(t => (
            <button key={t} type="button" onClick={() => { setType(t); setCategory('') }}
              style={{ padding: '10px', borderRadius: 8, fontWeight: 600, fontSize: 15,
                background: type === t ? (t === 'expense' ? '#ef4444' : '#10b981') : 'transparent',
                color: type === t ? 'white' : '#94a3b8' }}>
              {t === 'expense' ? '支出' : '收入'}
            </button>
          ))}
        </div>

        {/* Amount + Currency */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input className="input-field" type="number" inputMode="decimal" placeholder="金額" value={amount} onChange={e => setAmount(e.target.value)} required />
          <select className="input-field" value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: 80 }}>
            <option value="MYR">RM</option>
            <option value="TWD">NT$</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <label style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8, display: 'block' }}>分類</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {cats.map(cat => (
              <button key={cat} type="button" onClick={() => setCategory(cat)}
                style={{ padding: '10px 4px', borderRadius: 10, fontSize: 12, fontWeight: 500,
                  background: category === cat ? '#1d4ed8' : '#1e293b',
                  color: category === cat ? 'white' : '#cbd5e1',
                  border: category === cat ? '2px solid #3b82f6' : '2px solid transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[cat]}</span>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <input className="input-field" placeholder="備註（選填）" value={note} onChange={e => setNote(e.target.value)} />

        <button type="submit" className="btn-primary" disabled={loading || !amount || !category}
          style={{ opacity: (!amount || !category) ? 0.5 : 1 }}>
          {loading ? '儲存中...' : '儲存'}
        </button>
      </form>
    </div>
  )
}
