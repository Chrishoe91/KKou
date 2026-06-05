import { useState, useRef, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { Send, Bot } from 'lucide-react'

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
    { role: 'assistant', content: `你好 ${user.displayName || ''}！\n\n直接輸入消費就可以記帳，例如：\n• 午餐 RM12\n• 搭捷運 NT$30\n• 購物 RM85.5` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const apiKey = localStorage.getItem('claude_api_key')
    if (!apiKey) {
      setMessages(prev => [...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: '⚠️ 請先到「設定」頁填入 Claude API Key 才能使用 AI 功能。' }
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
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMsg }]
        })
      })

      const data = await res.json()
      const text = data.content?.[0]?.text || ''

      let parsed = null
      try { parsed = JSON.parse(text) } catch {}

      if (parsed?.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: parsed.error }])
      } else if (parsed?.confirmed) {
        await addDoc(collection(db, 'transactions'), {
          type: parsed.type,
          amount: parsed.amount,
          currency: parsed.currency,
          category: parsed.category,
          note: parsed.note || userMsg,
          userId: user.uid,
          userName: user.displayName || user.email,
          createdAt: serverTimestamp(),
        })

        const curr = parsed.currency === 'TWD' ? `NT$${parsed.amount}` : `RM${parsed.amount}`
        const emoji = parsed.type === 'expense' ? '💸' : '💰'
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `${emoji} 已記錄！\n\n分類：${parsed.category}\n金額：${curr}\n備註：${parsed.note}`
        }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: text || '無法處理，請重試。' }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '連線錯誤，請檢查 API Key 是否正確。' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingTop: 'env(safe-area-inset-top)', background: '#0f172a' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={20} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#f1f5f9' }}>AI 記帳</div>
          <div style={{ fontSize: 12, color: '#10b981' }}>直接說就能記帳</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 16,
              background: m.role === 'user' ? '#10b981' : '#1e293b',
              color: '#f1f5f9', fontSize: 15, lineHeight: 1.5,
              borderBottomRightRadius: m.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16,
              whiteSpace: 'pre-wrap'
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: 16, borderBottomLeftRadius: 4, color: '#94a3b8' }}>
              思考中...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ padding: '12px 16px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)', borderTop: '1px solid #1e293b', display: 'flex', gap: 8 }}>
        <input
          className="input-field"
          placeholder="午餐 RM12 ..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={loading || !input.trim()}
          style={{ background: '#10b981', borderRadius: 8, padding: '0 16px', opacity: (!input.trim() || loading) ? 0.5 : 1 }}>
          <Send size={18} color="white" />
        </button>
      </form>
    </div>
  )
}
