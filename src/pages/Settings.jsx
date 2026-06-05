import { useState } from 'react'
import { auth } from '../firebase'
import { signOut, updateProfile } from 'firebase/auth'
import { Key, LogOut, User, Tag, ChevronRight } from 'lucide-react'

export default function Settings({ user, setTab }) {
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
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '20px 20px 48px', paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>設定</h1>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'white' }}>
            {(user.displayName || user.email)[0].toUpperCase()}
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>{user.displayName || '未設定名稱'}</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{user.email}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 90px', marginTop: -20 }}>
        {/* Profile */}
        <div style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0070ba', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>個人資料</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="input-field" placeholder="顯示名稱" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ flex: 1 }} />
            <button onClick={saveName}
              style={{ background: nameSaved ? '#00a650' : '#0070ba', color: 'white', padding: '0 18px', borderRadius: 25, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 14 }}>
              {nameSaved ? '✓ 已存' : '儲存'}
            </button>
          </div>
        </div>

        {/* Categories */}
        <button onClick={() => setTab('categories')}
          style={{ width: '100%', background: 'white', padding: '16px 18px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={18} color="#0070ba" />
          </div>
          <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, color: '#2c2e2f' }}>分類管理</span>
          <ChevronRight size={18} color="#a0aab0" />
        </button>

        {/* API Key */}
        <div style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key size={18} color="#0070ba" />
            </div>
            <span style={{ fontWeight: 700, color: '#2c2e2f' }}>Claude AI Key</span>
          </div>
          <p style={{ fontSize: 13, color: '#a0aab0', marginBottom: 12 }}>
            AI 對話記帳功能需要此 Key。<br />申請：console.anthropic.com
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="input-field" type="password" placeholder="sk-ant-..." value={apiKey} onChange={e => setApiKey(e.target.value)} style={{ flex: 1 }} />
            <button onClick={saveApiKey}
              style={{ background: saved ? '#00a650' : '#0070ba', color: 'white', padding: '0 18px', borderRadius: 25, fontWeight: 700, whiteSpace: 'nowrap', fontSize: 14 }}>
              {saved ? '✓ 已存' : '儲存'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: '#a0aab0', marginTop: 8 }}>Key 只存在你的手機，不會上傳</p>
        </div>

        {/* Share */}
        <div style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontWeight: 700, color: '#2c2e2f', marginBottom: 8 }}>👫 邀請另一半使用</p>
          <p style={{ fontSize: 14, color: '#6c7378', lineHeight: 1.6 }}>
            將 App 網址傳給老婆，讓她用自己的帳號登入，帳目會自動同步共享。
          </p>
          <div style={{ background: '#f5f7fa', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
            <p style={{ fontSize: 13, color: '#0070ba', fontWeight: 600, wordBreak: 'break-all' }}>
              https://chrishoe91.github.io/KKou/
            </p>
          </div>
        </div>

        {/* Logout */}
        <button onClick={() => signOut(auth)}
          style={{ width: '100%', background: 'white', color: '#d0021b', padding: '15px', borderRadius: 25, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1.5px solid #fecaca' }}>
          <LogOut size={18} />
          登出
        </button>
      </div>
    </div>
  )
}
