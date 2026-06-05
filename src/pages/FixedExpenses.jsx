import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, writeBatch } from 'firebase/firestore'
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, Zap } from 'lucide-react'

const DEFAULT_EMOJIS = [
  '🏠','💡','💧','📡','🛡️','🚗','📱','🎓','💊','🏋️',
  '🎵','☕','🐶','🌿','💳','📦','🔧','🏦','🎬','✈️'
]

export default function FixedExpenses({ user, setTab }) {
  const [items, setItems] = useState([])
  const [customCats, setCustomCats] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCurrency, setNewCurrency] = useState('MYR')
  const [newEmoji, setNewEmoji] = useState('🏠')
  const [newCategory, setNewCategory] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [selected, setSelected] = useState([])
  const [recording, setRecording] = useState(false)
  const [done, setDone] = useState(false)

  const DEFAULT_EXPENSE_CATS = ['飲食','交通','購物','娛樂','醫療','住房','教育','其他支出']

  useEffect(() => {
    const q = query(collection(db, 'fixedExpenses'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'categories'), snap => setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const allCats = [...DEFAULT_EXPENSE_CATS, ...customCats.filter(c => c.type === 'expense').map(c => c.name)]

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function selectAll() {
    setSelected(selected.length === items.length ? [] : items.map(i => i.id))
  }

  async function recordSelected() {
    if (selected.length === 0) return
    setRecording(true)
    const batch = writeBatch(db)
    const now = new Date()
    selected.forEach(id => {
      const item = items.find(i => i.id === id)
      if (!item) return
      const ref = doc(collection(db, 'transactions'))
      batch.set(ref, {
        type: 'expense',
        amount: item.amount,
        currency: item.currency || 'MYR',
        category: item.category || '其他支出',
        categoryEmoji: item.emoji,
        note: item.name,
        userId: user.uid,
        userName: user.displayName || user.email,
        createdAt: now,
        isFixed: true,
      })
    })
    await batch.commit()
    setSelected([])
    setRecording(false)
    setDone(true)
    setTimeout(() => { setDone(false); setTab('home') }, 1500)
  }

  async function addItem() {
    if (!newName.trim() || !newAmount) return
    await addDoc(collection(db, 'fixedExpenses'), {
      name: newName.trim(), amount: parseFloat(newAmount),
      currency: newCurrency, emoji: newEmoji,
      category: newCategory || '其他支出', createdAt: Date.now()
    })
    setNewName(''); setNewAmount(''); setNewEmoji('🏠'); setNewCategory(''); setShowAdd(false)
  }

  async function saveEdit() {
    await updateDoc(doc(db, 'fixedExpenses', editId), editData)
    setEditId(null)
  }

  const totalSelected = selected.reduce((sum, id) => {
    const item = items.find(i => i.id === id)
    return sum + (item?.amount || 0)
  }, 0)

  const myrItems = items.filter(i => (i.currency || 'MYR') === 'MYR')
  const twdItems = items.filter(i => i.currency === 'TWD')

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '16px 20px 28px', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setTab('home')} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>固定開銷</h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>每月固定費用，一鍵記帳</p>
          </div>
          <button onClick={selectAll}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            {selected.length === items.length && items.length > 0 ? '取消全選' : '全選'}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px', paddingBottom: selected.length > 0 ? 120 : 90 }}>
        {/* Add button */}
        {showAdd ? (
          <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0070ba', marginBottom: 12 }}>新增固定開銷</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{ width: 50, height: 50, borderRadius: 12, background: '#f5f7fa', fontSize: 26, border: '1.5px solid #e0e0e0', flexShrink: 0 }}>
                {newEmoji}
              </button>
              <input className="input-field" placeholder="名稱（如：保險、電費）" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            {showEmojiPicker && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, background: '#f5f7fa', borderRadius: 10, padding: 10 }}>
                {DEFAULT_EMOJIS.map(e => (
                  <button key={e} onClick={() => { setNewEmoji(e); setShowEmojiPicker(false) }}
                    style={{ width: 40, height: 40, borderRadius: 8, fontSize: 22, background: newEmoji === e ? '#e8f0fe' : 'transparent', border: newEmoji === e ? '2px solid #0070ba' : '2px solid transparent' }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 10 }}>
              <input className="input-field" type="number" inputMode="decimal" placeholder="金額" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
              <select className="input-field" value={newCurrency} onChange={e => setNewCurrency(e.target.value)} style={{ width: 82 }}>
                <option value="MYR">RM</option>
                <option value="TWD">NT$</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#6c7378', marginBottom: 6, display: 'block', fontWeight: 600 }}>分類</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allCats.map(cat => (
                  <button key={cat} onClick={() => setNewCategory(cat)}
                    style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: newCategory === cat ? '#0070ba' : '#f5f7fa',
                      color: newCategory === cat ? 'white' : '#6c7378' }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addItem} className="btn-primary" style={{ flex: 1, padding: '11px' }}>新增</button>
              <button onClick={() => setShowAdd(false)} style={{ background: '#f5f7fa', color: '#6c7378', padding: '11px 20px', borderRadius: 25, fontWeight: 700 }}>取消</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)}
            style={{ width: '100%', background: 'white', color: '#0070ba', padding: '14px', borderRadius: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14,
              border: '2px dashed #bee3f8', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <Plus size={18} /> 新增固定開銷
          </button>
        )}

        {/* Items list */}
        {items.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#a0aab0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📌</div>
            <p style={{ fontWeight: 600, color: '#6c7378' }}>還沒有固定開銷</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>新增保險、電費等每月固定費用</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: selected.includes(item.id) ? '#e8f0fe' : 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: selected.includes(item.id) ? '2px solid #0070ba' : '2px solid transparent', transition: 'all 0.15s' }}>
              {editId === item.id ? (
                <div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input className="input-field" placeholder="名稱" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 10 }}>
                    <input className="input-field" type="number" value={editData.amount} onChange={e => setEditData({...editData, amount: parseFloat(e.target.value)})} />
                    <select className="input-field" value={editData.currency} onChange={e => setEditData({...editData, currency: e.target.value})} style={{ width: 82 }}>
                      <option value="MYR">RM</option>
                      <option value="TWD">NT$</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEdit} className="btn-primary" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Check size={16} /> 儲存
                    </button>
                    <button onClick={() => setEditId(null)} style={{ background: '#f5f7fa', color: '#6c7378', padding: '10px 16px', borderRadius: 25 }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => toggleSelect(item.id)}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${selected.includes(item.id) ? '#0070ba' : '#d0d0d0'}`, background: selected.includes(item.id) ? '#0070ba' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selected.includes(item.id) && <Check size={14} color="white" />}
                  </div>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{item.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#2c2e2f', fontSize: 15 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#a0aab0', marginTop: 2 }}>{item.category}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#d0021b', fontSize: 15, marginRight: 8 }}>
                    {(item.currency || 'MYR') === 'TWD' ? `NT$${item.amount}` : `RM ${item.amount}`}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={e => { e.stopPropagation(); setEditId(item.id); setEditData({name: item.name, amount: item.amount, currency: item.currency || 'MYR'}) }}
                      style={{ background: '#f5f7fa', color: '#0070ba', padding: '6px', borderRadius: 8 }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteDoc(doc(db, 'fixedExpenses', item.id)) }}
                      style={{ background: '#fff5f5', color: '#d0021b', padding: '6px', borderRadius: 8 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action bar */}
      {selected.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', padding: '16px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', borderTop: '1px solid #e8ecf0', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: '#6c7378', fontWeight: 600 }}>已選 {selected.length} 項</span>
            <span style={{ color: '#d0021b', fontWeight: 700 }}>RM {totalSelected.toFixed(2)}</span>
          </div>
          <button onClick={recordSelected} disabled={recording}
            style={{ width: '100%', background: done ? '#00a650' : 'linear-gradient(135deg, #003087, #0070ba)', color: 'white', padding: '14px', borderRadius: 25, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {done ? '✓ 記帳完成！' : recording ? '記帳中...' : <><Zap size={18} /> 一鍵記錄已選開銷</>}
          </button>
        </div>
      )}
    </div>
  )
}
