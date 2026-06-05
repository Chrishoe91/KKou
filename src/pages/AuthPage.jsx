import { useState } from 'react'
import { auth } from '../firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'

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
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>💰</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#f1f5f9' }}>扣扣</h1>
        <p style={{ color: '#94a3b8', marginTop: 4 }}>家庭記帳本</p>
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'register' && (
          <input className="input-field" placeholder="你的名字（如：Chris）" value={name} onChange={e => setName(e.target.value)} required />
        )}
        <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input-field" type="password" placeholder="密碼（至少 6 位）" value={password} onChange={e => setPassword(e.target.value)} required />

        {error && <p style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
        </button>

        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          style={{ background: 'none', color: '#94a3b8', fontSize: 14, padding: 8 }}>
          {mode === 'login' ? '還沒有帳號？立即註冊' : '已有帳號？登入'}
        </button>
      </form>
    </div>
  )
}
