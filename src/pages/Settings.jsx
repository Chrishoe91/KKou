import { useState } from 'react'
import { auth } from '../firebase'
import { signOut, updateProfile } from 'firebase/auth'
import { Key, LogOut, User } from 'lucide-react'

export default function Settings({ user }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('claude_api_key') || '')
  const [saved, setSaved] = useState(false)
  const [displayName, setDisplayName] = useState(user.displayName || '')
  const [nameSaved, setNameSaved] = useState(false)

  function saveApiKey() {
    localStorage.setItem('claude_api_key', apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveName() {
    await updateProfile(auth.currentUser, { displayName })
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  return (
    <div className="page" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#f1f5f9' }}>設定</h1>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <User size={18} color="#94a3b8" />
          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>個人資料</span>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{user.email}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input-field" placeholder="顯示名稱" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ flex: 1 }} />
          <button onClick={saveName} style={{ background: nameSaved ? '#059669' : '#10b981', color: 'white', padding: '0 16px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {nameSaved ? '已存' : '儲存'}
          </button>
        </div>
      </div>

      {/* API Key */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Key size={18} color="#94a3b8" />
          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>Claude API Key</span>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
          AI 對話記帳功能需要此 Key。<br />
          申請：console.anthropic.com → API Keys
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input-field" type="password" placeholder="sk-ant-..." value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ flex: 1 }} />
          <button onClick={saveApiKey} style={{ background: saved ? '#059669' : '#10b981', color: 'white', padding: '0 16px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {saved ? '已存' : '儲存'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>Key 只存在你的手機裡，不會上傳到伺服器</p>
      </div>

      {/* Share info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 8 }}>👫 邀請老婆一起用</div>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
          讓老婆到這個 App 註冊帳號，兩個人記錄的帳目會自動同步在同一個帳本裡。
        </p>
      </div>

      {/* Logout */}
      <button onClick={() => signOut(auth)}
        style={{ width: '100%', background: '#1e293b', color: '#ef4444', padding: '14px', borderRadius: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <LogOut size={18} />
        登出
      </button>
    </div>
  )
}
