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
    return onSnapshot(q, snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const filtered = categories.filter(c => c.type === type)

  async function addCategory() {
    if (!newName.trim()) return
    await addDoc(collection(db, 'categories'), {
      name: newName.trim(),
      emoji: newEmoji,
      type,
      createdAt: Date.now()
    })
    setNewName('')
    setNewEmoji('💸')
    setShowAdd(false)
  }

  async function deleteCategory(id) {
    await deleteDoc(doc(db, 'categories', id))
  }

  async function saveEdit(id) {
    await updateDoc(doc(db, 'categories', id), { name: editName, emoji: editEmoji })
    setEditId(null)
  }

  function startEdit(cat) {
    setEditId(cat.id)
    setEditName(cat.name)
    setEditEmoji(cat.emoji)
    setEditEmojiPicker(false)
  }

  return (
    <div className="page" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setTab('settings')} style={{ background: 'none', color: '#94a3b8', padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>分類管理</h1>
      </div>

      {/* Type toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#1e293b', borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {['expense', 'income'].map(t => (
          <button key={t} onClick={() => setType(t)}
            style={{ padding: '8px', borderRadius: 8, fontWeight: 600, fontSize: 14,
              background: type === t ? (t === 'expense' ? '#ef4444' : '#10b981') : 'transparent',
              color: type === t ? 'white' : '#94a3b8' }}>
            {t === 'expense' ? '支出分類' : '收入分類'}
          </button>
        ))}
      </div>

      {/* Add new */}
      {showAdd ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{ width: 48, height: 48, borderRadius: 10, background: '#334155', fontSize: 24, flexShrink: 0 }}>
              {newEmoji}
            </button>
            <input className="input-field" placeholder="分類名稱" value={newName}
              onChange={e => setNewName(e.target.value)} style={{ flex: 1 }} />
          </div>

          {showEmojiPicker && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, background: '#0f172a', borderRadius: 10, padding: 10 }}>
              {DEFAULT_EMOJIS.map(e => (
                <button key={e} onClick={() => { setNewEmoji(e); setShowEmojiPicker(false) }}
                  style={{ width: 38, height: 38, borderRadius: 8, fontSize: 20, background: newEmoji === e ? '#334155' : 'transparent',
                    border: newEmoji === e ? '2px solid #10b981' : '2px solid transparent' }}>
                  {e}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addCategory} style={{ flex: 1, background: '#10b981', color: 'white', padding: '10px', borderRadius: 8, fontWeight: 600 }}>
              新增
            </button>
            <button onClick={() => { setShowAdd(false); setShowEmojiPicker(false) }}
              style={{ background: '#334155', color: '#94a3b8', padding: '10px 16px', borderRadius: 8 }}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{ width: '100%', background: '#1e293b', color: '#10b981', padding: '12px', borderRadius: 10,
            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12,
            border: '2px dashed #334155' }}>
          <Plus size={18} /> 新增分類
        </button>
      )}

      {/* Category list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(cat => (
          <div key={cat.id} className="card">
            {editId === cat.id ? (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button onClick={() => setEditEmojiPicker(!editEmojiPicker)}
                    style={{ width: 48, height: 48, borderRadius: 10, background: '#334155', fontSize: 24, flexShrink: 0 }}>
                    {editEmoji}
                  </button>
                  <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1 }} />
                </div>
                {editEmojiPicker && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, background: '#0f172a', borderRadius: 10, padding: 10 }}>
                    {DEFAULT_EMOJIS.map(e => (
                      <button key={e} onClick={() => { setEditEmoji(e); setEditEmojiPicker(false) }}
                        style={{ width: 38, height: 38, borderRadius: 8, fontSize: 20, background: editEmoji === e ? '#334155' : 'transparent',
                          border: editEmoji === e ? '2px solid #10b981' : '2px solid transparent' }}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => saveEdit(cat.id)} style={{ flex: 1, background: '#10b981', color: 'white', padding: '8px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Check size={16} /> 儲存
                  </button>
                  <button onClick={() => setEditId(null)} style={{ background: '#334155', color: '#94a3b8', padding: '8px 14px', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 26 }}>{cat.emoji}</span>
                <span style={{ flex: 1, fontWeight: 600, color: '#f1f5f9' }}>{cat.name}</span>
                <button onClick={() => startEdit(cat)} style={{ background: 'none', color: '#94a3b8', padding: 6 }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => deleteCategory(cat.id)} style={{ background: 'none', color: '#ef4444', padding: 6 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <p>還沒有{type === 'expense' ? '支出' : '收入'}分類</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>點上方「新增分類」開始</p>
          </div>
        )}
      </div>
    </div>
  )
}
