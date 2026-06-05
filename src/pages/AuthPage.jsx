import { useState } from 'react'
import { auth } from '../firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth'

const ALLOWED_EMAILS = [
  'christopher.hoe91@gmail.com',
  'francechang168@gmail.com',
  'test@kkou.app',
]

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
      setError('此 Email 沒有使用權限')
      return
    }
    setLoading(true)
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': '此 Email 已被註冊',
        'auth/invalid-email': 'Email 格式不正確',
        'auth/weak-password': '密碼至少需要 6 個字元',
        'auth/invalid-credential': 'Email 或密碼錯誤',
      }
      setError(msgs[err.code] || err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>
      {/* Blue header */}
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '48px 24px 64px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>扣扣</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: 6, fontSize: 14 }}>家庭記帳本</p>
      </div>

      {/* Form card */}
      <div style={{ margin: '-28px 20px 0', background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', flex: 1 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2c2e2f', marginBottom: 20 }}>
          {mode === 'login' ? '登入帳號' : '建立帳號'}
        </h2>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 6, display: 'block' }}>顯示名稱</label>
              <input className="input-field" placeholder="你的名字（如：Chris）" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 6, display: 'block' }}>Email</label>
            <input className="input-field" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 6, display: 'block' }}>密碼</label>
            <input className="input-field" type="password" placeholder="至少 6 個字元" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: 8, padding: '10px 14px', color: '#d0021b', fontSize: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
          </button>

          <div style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 4 }}>
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              style={{ background: 'none', color: '#0070ba', fontSize: 14, fontWeight: 600, padding: 8 }}>
              {mode === 'login' ? '還沒有帳號？立即註冊' : '已有帳號？登入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
