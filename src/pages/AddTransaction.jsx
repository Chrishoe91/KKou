import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore'
import { ArrowLeft } from 'lucide-react'

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

export default function AddTransaction({ user, setTab }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('MYR')
  const [category, setCategory] = useState('')
  const [categoryEmoji, setCategoryEmoji] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [customCats, setCustomCats] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const defaultCats = type === 'expense' ? DEFAULT_EXPENSE : DEFAULT_INCOME
  const customFiltered = customCats.filter(c => c.type === type)
  const allCats = [...defaultCats, ...customFiltered]

  function selectCategory(name, emoji) {
    setCategory(name)
    setCategoryEmoji(emoji)
  }

  async function submit(e) {
    e.preventDefault()
    if (!amount || !category) return
    setLoading(true)
    await addDoc(collection(db, 'transactions'), {
      type,
      amount: parseFloat(amount),
      currency,
      category,
      categoryEmoji,
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
            <button key={t} type="button" onClick={() => { setType(t); setCategory(''); setCategoryEmoji('') }}
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
            {allCats.map(cat => (
              <button key={cat.name} type="button" onClick={() => selectCategory(cat.name, cat.emoji)}
                style={{ padding: '10px 4px', borderRadius: 10, fontSize: 12, fontWeight: 500,
                  background: category === cat.name ? '#1d4ed8' : '#1e293b',
                  color: category === cat.name ? 'white' : '#cbd5e1',
                  border: category === cat.name ? '2px solid #3b82f6' : '2px solid transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{cat.name}</span>
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
