import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { ArrowLeft, Plus, Trash2, CreditCard } from 'lucide-react'

const CARD_COLORS = [
  { label: '深藍', value: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)' },
  { label: '金色', value: 'linear-gradient(135deg, #b8860b 0%, #daa520 100%)' },
  { label: '黑金', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
  { label: '紫色', value: 'linear-gradient(135deg, #6a0dad 0%, #a855f7 100%)' },
  { label: '綠色', value: 'linear-gradient(135deg, #014421 0%, #00a650 100%)' },
  { label: '紅色', value: 'linear-gradient(135deg, #7f0000 0%, #d0021b 100%)' },
]

export default function CreditCards({ setTab }) {
  const [cards, setCards] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('TWD')
  const [color, setColor] = useState(CARD_COLORS[0].value)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'creditCards'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setCards(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  async function addCard() {
    if (!name.trim()) return
    setLoading(true)
    await addDoc(collection(db, 'creditCards'), {
      name: name.trim(), currency, color, createdAt: serverTimestamp()
    })
    setName('')
    setCurrency('TWD')
    setColor(CARD_COLORS[0].value)
    setShowAdd(false)
    setLoading(false)
  }

  async function deleteCard(id) {
    await deleteDoc(doc(db, 'creditCards', id))
    setDeleteConfirm(null)
  }

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '16px 20px 32px', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setTab('settings')} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>信用卡管理</h1>
          <button onClick={() => setShowAdd(true)}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '6px 14px', color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> 新增
          </button>
        </div>
      </div>

      <div style={{ padding: '16px', paddingBottom: 40 }}>
        {/* Card list */}
        {cards.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aab0' }}>
            <CreditCard size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>尚未新增信用卡</p>
            <p style={{ fontSize: 14, marginTop: 6 }}>點上方「新增」來加入你的信用卡</p>
          </div>
        )}

        {cards.map(card => (
          <div key={card.id} style={{ marginBottom: 16 }}>
            {/* Card visual */}
            <div style={{ background: card.color, borderRadius: 16, padding: '20px 24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
              {/* Decorative circles */}
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', bottom: -30, right: 30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <CreditCard size={28} style={{ marginBottom: 16, opacity: 0.9 }} />
              <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{card.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontSize: 14, opacity: 0.8, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
                  {card.currency === 'TWD' ? '🇹🇼 台幣 NT$' : '🇲🇾 馬幣 RM'}
                </span>
                <button onClick={() => setDeleteConfirm(card.id)}
                  style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={16} color="white" />
                </button>
              </div>
            </div>

            {/* Delete confirm */}
            {deleteConfirm === card.id && (
              <div style={{ background: '#fff3f3', borderRadius: 10, padding: '12px 16px', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 14, color: '#d0021b', fontWeight: 600 }}>確定刪除「{card.name}」？</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setDeleteConfirm(null)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 14, fontWeight: 700, background: '#f0f0f0', color: '#6c7378' }}>取消</button>
                  <button onClick={() => deleteCard(card.id)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 14, fontWeight: 700, background: '#d0021b', color: 'white' }}>刪除</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add form */}
        {showAdd && (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#2c2e2f', marginBottom: 16 }}>新增信用卡</p>

            {/* Preview */}
            <div style={{ background: color, borderRadius: 12, padding: '16px 20px', color: 'white', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
              <CreditCard size={22} style={{ marginBottom: 10, opacity: 0.9 }} />
              <p style={{ fontSize: 16, fontWeight: 700 }}>{name || '卡片名稱'}</p>
              <p style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>{currency === 'TWD' ? '🇹🇼 台幣 NT$' : '🇲🇾 馬幣 RM'}</p>
            </div>

            {/* Card name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', display: 'block', marginBottom: 8 }}>卡片名稱</label>
              <input className="input-field" placeholder="如：台灣銀行、Maybank" value={name} onChange={e => setName(e.target.value)} />
            </div>

            {/* Currency */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', display: 'block', marginBottom: 8 }}>帳單幣種</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ v: 'TWD', label: '🇹🇼 台幣 NT$' }, { v: 'MYR', label: '🇲🇾 馬幣 RM' }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setCurrency(opt.v)}
                    style={{ padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                      background: currency === opt.v ? '#e8f0fe' : '#f5f7fa',
                      color: currency === opt.v ? '#0070ba' : '#6c7378',
                      border: currency === opt.v ? '2px solid #0070ba' : '2px solid transparent' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', display: 'block', marginBottom: 8 }}>卡片顏色</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {CARD_COLORS.map(c => (
                  <button key={c.value} type="button" onClick={() => setColor(c.value)}
                    style={{ width: 40, height: 40, borderRadius: 10, background: c.value,
                      border: color === c.value ? '3px solid #0070ba' : '3px solid transparent',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAdd(false); setName('') }}
                style={{ flex: 1, padding: '13px', borderRadius: 25, fontWeight: 700, background: '#f0f0f0', color: '#6c7378' }}>
                取消
              </button>
              <button onClick={addCard} disabled={loading || !name.trim()}
                style={{ flex: 2, padding: '13px', borderRadius: 25, fontWeight: 700, background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', color: 'white', opacity: !name.trim() ? 0.5 : 1 }}>
                {loading ? '新增中...' : '新增信用卡'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
