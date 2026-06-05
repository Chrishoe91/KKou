import { useState, useRef, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { Send, Sparkles } from 'lucide-react'

const SYSTEM_PROMPT = `你是一個記帳助手。用戶會用自然語言描述消費，你需要解析並回傳 JSON。
重要：只回傳純 JSON 字串，絕對不要用 markdown code block（不要用 \`\`\`json 包裹），不要有任何其他文字。
支援貨幣：MYR（馬幣，預設）、TWD（台幣）
支出分類：飲食、交通、購物、娛樂、醫療、住房、教育、其他支出
收入分類：薪資、獎金、副業、其他收入

規則：
- 如果你很確定分類，直接回傳 confirmed:true
- 如果不確定分類（例如商家名稱不明確），回傳 confirmed:false 並列出 2-4 個可能的分類

確定時的格式：
{"type":"expense|income","amount":數字,"currency":"MYR|TWD","category":"分類","note":"原始描述","confirmed":true}

不確定時的格式：
{"type":"expense|income","amount":數字,"currency":"MYR|TWD","note":"原始描述","confirmed":false,"suggestions":["分類1","分類2","分類3"]}

如果完全無法解析：{"error":"無法理解，請重新描述"}`

const CATEGORY_EMOJIS = {
  飲食:'🍽️', 交通:'🚗', 購物:'🛍️', 娛樂:'🎬', 醫療:'💊',
  住房:'🏠', 教育:'📚', 其他支出:'💸', 薪資:'💼', 獎金:'🎁', 副業:'💻', 其他收入:'💰',
}

export default function AIChat({ user }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `你好 ${user.displayName || ''}！\n\n直接輸入消費就能記帳：\n• 午餐 RM12\n• 搭捷運 NT$30\n• 海底撈 RM120` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingTx, setPendingTx] = useState(null)
  const [customCats, setCustomCats] = useState([])
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    return onSnapshot(collection(db, 'categories'), snap => {
      setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  async function saveTransaction(tx) {
    await addDoc(collection(db, 'transactions'), {
      type: tx.type, amount: tx.amount, currency: tx.currency,
      category: tx.category,
      categoryEmoji: CATEGORY_EMOJIS[tx.category] || customCats.find(c => c.name === tx.category)?.emoji || '💸',
      note: tx.note,
      userId: user.uid, userName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    })
    const curr = tx.currency === 'TWD' ? `NT$${tx.amount}` : `RM ${tx.amount}`
    const emoji = tx.type === 'expense' ? '💸' : '💰'
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `${emoji} 已記錄！\n\n${CATEGORY_EMOJIS[tx.category] || ''} 分類：${tx.category}\n💵 金額：${curr}\n📝 備註：${tx.note}`
    }])
    setPendingTx(null)
  }

  async function selectCategory(category) {
    if (!pendingTx) return
    setMessages(prev => [...prev, { role: 'user', content: category }])
    await saveTransaction({ ...pendingTx, category })
  }

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
      try {
        // Strip markdown code blocks if present
        const clean = text.replace(/```(?:json)?/gi, '').trim()
        parsed = JSON.parse(clean)
      } catch {}

      if (parsed?.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: parsed.error }])
      } else if (parsed?.confirmed === true) {
        await saveTransaction(parsed)
      } else if (parsed?.confirmed === false && parsed?.suggestions) {
        // Ask for category confirmation
        setPendingTx(parsed)
        const curr = parsed.currency === 'TWD' ? `NT$${parsed.amount}` : `RM ${parsed.amount}`
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `「${parsed.note}」${curr}（支出）\n歸到哪個分類？`,
          suggestions: parsed.suggestions,
          isPending: true
        }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: text || '無法處理，請重試。' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '連線錯誤，請檢查 API Key。' }])
    }
    setLoading(false)
  }

  const allCatNames = [
    '飲食','交通','購物','娛樂','醫療','住房','教育','其他支出',
    ...customCats.filter(c => c.type === 'expense').map(c => c.name)
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f7fa' }}>
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '20px 20px', paddingTop: 'calc(env(safe-area-inset-top) + 20px)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>AI 智能記帳</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>直接說就能記帳</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
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

            {/* Category suggestion chips */}
            {m.isPending && m.suggestions && pendingTx && (
              <div style={{ marginLeft: 36, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(m.suggestions.length > 0 ? m.suggestions : allCatNames.slice(0, 6)).map(cat => (
                  <button key={cat} onClick={() => selectCategory(cat)}
                    style={{ background: 'white', border: '1.5px solid #0070ba', color: '#0070ba', padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    {CATEGORY_EMOJIS[cat] || customCats.find(c => c.name === cat)?.emoji || ''} {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0070ba', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={14} color="white" />
            </div>
            <div style={{ background: 'white', padding: '11px 16px', borderRadius: 18, borderBottomLeftRadius: 4, color: '#a0aab0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              思考中...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ padding: '12px 16px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)', borderTop: '1px solid #e8ecf0', background: 'white', display: 'flex', gap: 10 }}>
        <input className="input-field" placeholder="午餐 RM12 / 海底撈 120 ..." value={input} onChange={e => setInput(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" disabled={loading || !input.trim()}
          style={{ background: 'linear-gradient(135deg, #003087, #0070ba)', borderRadius: '50%', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || loading) ? 0.5 : 1, flexShrink: 0 }}>
          <Send size={18} color="white" />
        </button>
      </form>
    </div>
  )
}
