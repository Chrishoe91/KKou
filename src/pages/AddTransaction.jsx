import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore'
import { ArrowLeft, CreditCard, Banknote } from 'lucide-react'

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
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [customCats, setCustomCats] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const allCats = [...(type === 'expense' ? DEFAULT_EXPENSE : DEFAULT_INCOME), ...customCats.filter(c => c.type === type)]

  async function submit(e) {
    e.preventDefault()
    if (!amount || !category) return
    setLoading(true)
    await addDoc(collection(db, 'transactions'), {
      type, amount: parseFloat(amount), currency, category, categoryEmoji,
      paymentMethod: type === 'expense' ? paymentMethod : null,
      note, userId: user.uid, userName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    })
    setLoading(false)
    setTab('home')
  }

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '16px 20px 28px', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setTab('home')} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>新增記錄</h1>
        </div>
      </div>

      <div style={{ padding: '16px', paddingBottom: 90 }}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type toggle */}
          <div style={{ background: 'white', borderRadius: 14, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {['expense', 'income'].map(t => (
              <button key={t} type="button" onClick={() => { setType(t); setCategory(''); setCategoryEmoji('') }}
                style={{ padding: '11px', borderRadius: 10, fontWeight: 700, fontSize: 15,
                  background: type === t ? (t === 'expense' ? '#d0021b' : '#00a650') : 'transparent',
                  color: type === t ? 'white' : '#a0aab0' }}>
                {t === 'expense' ? '💸 支出' : '💰 收入'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 10, display: 'block' }}>金額</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <input className="input-field" type="number" inputMode="decimal" placeholder="0.00" value={amount}
                onChange={e => setAmount(e.target.value)} required
                style={{ fontSize: 22, fontWeight: 700, color: '#2c2e2f' }} />
              <select className="input-field" value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: 82, fontWeight: 700 }}>
                <option value="MYR">RM</option>
                <option value="TWD">NT$</option>
              </select>
            </div>
          </div>

          {/* Payment Method (expense only) */}
          {type === 'expense' && (
            <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 10, display: 'block' }}>支付方式</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button type="button" onClick={() => setPaymentMethod('cash')}
                  style={{ padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: paymentMethod === 'cash' ? '#e8f0fe' : '#f5f7fa',
                    color: paymentMethod === 'cash' ? '#0070ba' : '#6c7378',
                    border: paymentMethod === 'cash' ? '2px solid #0070ba' : '2px solid transparent' }}>
                  <Banknote size={18} /> 現金
                </button>
                <button type="button" onClick={() => setPaymentMethod('card')}
                  style={{ padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: paymentMethod === 'card' ? '#e8f0fe' : '#f5f7fa',
                    color: paymentMethod === 'card' ? '#0070ba' : '#6c7378',
                    border: paymentMethod === 'card' ? '2px solid #0070ba' : '2px solid transparent' }}>
                  <CreditCard size={18} /> 刷卡
                </button>
              </div>
            </div>
          )}

          {/* Category */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 12, display: 'block' }}>分類</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {allCats.map(cat => (
                <button key={cat.name} type="button" onClick={() => { setCategory(cat.name); setCategoryEmoji(cat.emoji) }}
                  style={{ padding: '10px 4px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: category === cat.name ? '#e8f0fe' : '#f5f7fa',
                    color: category === cat.name ? '#0070ba' : '#6c7378',
                    border: category === cat.name ? '2px solid #0070ba' : '2px solid transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 10, display: 'block' }}>備註（選填）</label>
            <input className="input-field" placeholder="午餐、車費..." value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !amount || !category}
            style={{ opacity: (!amount || !category) ? 0.5 : 1, marginTop: 4 }}>
            {loading ? '儲存中...' : '儲存記錄'}
          </button>
        </form>
      </div>
    </div>
  )
}
