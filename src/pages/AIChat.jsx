import { useState, useRef, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { Send, Bot, Sparkles } from 'lucide-react'

const SYSTEM_PROMPT = `你是一個記帳助手。用戶會用自然語言描述消費，你需要解析並回傳 JSON。
支援貨幣：MYR（馬幣，預設）、TWD（台幣）
支出分類：飲食、交通、購物、娛樂、醫療、住房、教育、其他支出
收入分類：薪資、獎金、副業、其他收入

回傳格式（只回傳 JSON，不要其他文字）：
{"type":"expense|income","amount":數字,"currency":"MYR|TWD","category":"分類","note":"原始描述","confirmed":true}

範例：
- "午餐 rm10" → {"type":"expense","amount":10,"currency":"MYR","category":"飲食","note":"午餐","confirmed":true}
- "搭捷運 NT$30" → {"type":"expense","amount":30,"currency":"TWD","category":"交通","note":"搭捷運","confirmed":true}
- "薪水 rm3000" → {"type":"income","amount":3000,"currency":"MYR","category":"薪資","note":"薪水","confirmed":true}

如果無法解析，回傳：{"error":"無法理解，請重新描述"}`

export default function AIChat({ user }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `你好 ${user.displayName || ''}！\n\n直接輸入消費就能記帳：\n• 午餐 RM12\n• 搭捷運 NT$30\n• 購物 RM85.5` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const apiKey = localStorage.getItem('claude_api_key')
    if (!apiKey) {
      setMessages(prev => [...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: '⚠️ 請先到「設定」頁填入 Claude API Key。' }
      ])
      setInput('')
      return
    }
    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 256, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: userMsg }] })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      let parsed = null
      try { parsed = JSON.parse(text) } catch {}
      if (parsed?.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: parsed.error }])
      } else if (parsed?.confirmed) {
        await addDoc(collection(db, 'transactions'), {
          type: parsed.type, amount: parsed.amount, currency: parsed.currency,
          category: parsed.category, note: parsed.note || userMsg,
          userId: user.uid, userName: user.displayName || user.email,
          createdAt: serverTimestamp(),
        })
        const curr = parsed.currency === 'TWD' ? `NT$${parsed.amount}` : `RM ${parsed.amount}`
        setMessages(prev => [...prev, { role: 'assistant', content: `✅ 已記錄！\n\n分類：${parsed.category}\n金額：${curr}\n備註：${parsed.note}` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: text || '無法處理，請重試。' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '連線錯誤，請檢查 API Key。' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f7fa' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '20px 20px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 20px)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>AI 智能記帳</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>直接說就能記帳</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0070ba', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                <Sparkles size={14} color="white" />
              </div>
            )}
            <div style={{
              maxWidth: '78%', padding: '11px 15px', borderRadius: 18,
              background: m.role === 'user' ? 'linear-gradient(135deg, #003087, #0070ba)' : 'white',
              color: m.role === 'user' ? 'white' : '#2c2e2f',
              fontSize: 15, lineHeight: 1.5,
              borderBottomRightRadius: m.role === 'user' ? 4 : 18,
              borderBottomLeftRadius: m.role === 'assistant' ? 4 : 18,
              whiteSpace: 'pre-wrap',
              boxShadow: m.role === 'assistant' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0070ba', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={14} color="white" />
            </div>
            <div style={{ background: 'white', padding: '11px 16px', borderRadius: 18, borderBottomLeftRadius: 4, color: '#a0aab0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              思考中...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ padding: '12px 16px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)', borderTop: '1px solid #e8ecf0', background: 'white', display: 'flex', gap: 10 }}>
        <input className="input-field" placeholder="午餐 RM12 ..." value={input} onChange={e => setInput(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" disabled={loading || !input.trim()}
          style={{ background: 'linear-gradient(135deg, #003087, #0070ba)', borderRadius: '50%', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || loading) ? 0.5 : 1, flexShrink: 0 }}>
          <Send size={18} color="white" />
        </button>
      </form>
    </div>
  )
}
