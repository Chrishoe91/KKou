import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react'

const DEFAULT_EMOJIS = [
  '🍽️','🚗','🛍️','🎬','💊','🏠','📚','💸','💼','🎁','💻','💰',
  '☕','🍜','🚌','✈️','⛽','🏥','🎮','📱','🐶','🌿','🏋️','🎵',
  '📦','🔧','💈','🧴','👗','🎓','🏖️','🍺','🧾','💳','🎪','🌙'
]

export default function Categories({ setTab }) {
  const [categories, setCategories] = useState([])
  const [type, setType] = useState('expense')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('💸')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editEmojiPicker, setEditEmojiPicker] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const filtered = categories.filter(c => c.type === type)

  async function addCategory() {
    if (!newName.trim()) return
    await addDoc(collection(db, 'categories'), { name: newName.trim(), emoji: newEmoji, type, createdAt: Date.now() })
    setNewName(''); setNewEmoji('💸'); setShowAdd(false)
  }

  async function saveEdit(id) {
    await updateDoc(doc(db, 'categories', id), { name: editName, emoji: editEmoji })
    setEditId(null)
  }

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '16px 20px 28px', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setTab('settings')} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>分類管理</h1>
        </div>
      </div>

      <div style={{ padding: '16px', paddingBottom: 40 }}>
        {/* Type toggle */}
        <div style={{ background: 'white', borderRadius: 14, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {['expense', 'income'].map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: type === t ? (t === 'expense' ? '#d0021b' : '#00a650') : 'transparent',
                color: type === t ? 'white' : '#a0aab0' }}>
              {t === 'expense' ? '支出分類' : '收入分類'}
            </button>
          ))}
        </div>

        {/* Add button / form */}
        {showAdd ? (
          <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0070ba', marginBottom: 12 }}>新增分類</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{ width: 50, height: 50, borderRadius: 12, background: '#f5f7fa', fontSize: 26, border: '1.5px solid #e0e0e0', flexShrink: 0 }}>
                {newEmoji}
              </button>
              <input className="input-field" placeholder="分類名稱" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            {showEmojiPicker && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, background: '#f5f7fa', borderRadius: 10, padding: 10 }}>
                {DEFAULT_EMOJIS.map(e => (
                  <button key={e} onClick={() => { setNewEmoji(e); setShowEmojiPicker(false) }}
                    style={{ width: 40, height: 40, borderRadius: 8, fontSize: 22,
                      background: newEmoji === e ? '#e8f0fe' : 'transparent',
                      border: newEmoji === e ? '2px solid #0070ba' : '2px solid transparent' }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={addCategory} className="btn-primary" style={{ flex: 1, padding: '11px' }}>新增</button>
              <button onClick={() => { setShowAdd(false); setShowEmojiPicker(false) }}
                style={{ background: '#f5f7fa', color: '#6c7378', padding: '11px 20px', borderRadius: 25, fontWeight: 700 }}>取消</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)}
            style={{ width: '100%', background: 'white', color: '#0070ba', padding: '14px', borderRadius: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14,
              border: '2px dashed #bee3f8', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <Plus size={18} /> 新增分類
          </button>
        )}

        {/* Category list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(cat => (
            <div key={cat.id} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {editId === cat.id ? (
                <div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <button onClick={() => setEditEmojiPicker(!editEmojiPicker)}
                      style={{ width: 50, height: 50, borderRadius: 12, background: '#f5f7fa', fontSize: 26, border: '1.5px solid #e0e0e0', flexShrink: 0 }}>
                      {editEmoji}
                    </button>
                    <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  {editEmojiPicker && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, background: '#f5f7fa', borderRadius: 10, padding: 10 }}>
                      {DEFAULT_EMOJIS.map(e => (
                        <button key={e} onClick={() => { setEditEmoji(e); setEditEmojiPicker(false) }}
                          style={{ width: 40, height: 40, borderRadius: 8, fontSize: 22,
                            background: editEmoji === e ? '#e8f0fe' : 'transparent',
                            border: editEmoji === e ? '2px solid #0070ba' : '2px solid transparent' }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveEdit(cat.id)} className="btn-primary" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Check size={16} /> 儲存
                    </button>
                    <button onClick={() => setEditId(null)} style={{ background: '#f5f7fa', color: '#6c7378', padding: '10px 16px', borderRadius: 25 }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 28 }}>{cat.emoji}</span>
                  <span style={{ flex: 1, fontWeight: 600, color: '#2c2e2f', fontSize: 15 }}>{cat.name}</span>
                  <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditEmoji(cat.emoji); setEditEmojiPicker(false) }}
                    style={{ background: '#f5f7fa', color: '#0070ba', padding: '8px', borderRadius: 8 }}>
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => deleteDoc(doc(db, 'categories', cat.id))}
                    style={{ background: '#fff5f5', color: '#d0021b', padding: '8px', borderRadius: 8 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && !showAdd && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#a0aab0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
              <p style={{ fontWeight: 600, color: '#6c7378' }}>還沒有{type === 'expense' ? '支出' : '收入'}分類</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
