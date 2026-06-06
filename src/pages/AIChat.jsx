import { useState, useRef, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { Send, Sparkles, CreditCard, Banknote } from 'lucide-react'

const SYSTEM_PROMPT = `你是一個記帳助手，幫用戶記錄收支。

解析用戶輸入，回傳純 JSON（不要用 markdown code block，不要其他文字）。

必填欄位：type, amount, currency, category, paymentMethod（支出才需要）, note
- type: "expense" 或 "income"
- amount: 數字
- currency: "MYR" 或 "TWD"
- category 支出選項: 飲食、交通、購物、娛樂、醫療、住房、教育、其他支出
- category 收入選項: 薪資、獎金、副業、其他收入
- paymentMethod: "cash" 或 "card"（只有支出才有）
- note: 用戶說的原話

規則：
1. 如果所有欄位都明確，回傳 confirmed:true
2. 如果有不確定的欄位，回傳 confirmed:false，在 missing 陣列列出缺少的欄位，並在 question 提一個自然的問題（一次只問一個問題）

範例輸入與回傳：

輸入「午餐 12」→ 幣別不明，回傳：
{"type":"expense","amount":12,"currency":null,"category":"飲食","paymentMethod":null,"note":"午餐","confirmed":false,"missing":["currency","paymentMethod"],"question":"這 RM12 還是 NT$12？"}

輸入「午餐 RM12」→ 支付方式不明，回傳：
{"type":"expense","amount":12,"currency":"MYR","category":"飲食","paymentMethod":null,"note":"午餐","confirmed":false,"missing":["paymentMethod"],"question":"這筆午餐是現金還是刷卡？"}

輸入「午餐 RM12 現金」→ 全部明確，回傳：
{"type":"expense","amount":12,"currency":"MYR","category":"飲食","paymentMethod":"cash","note":"午餐","confirmed":true,"missing":[]}

輸入「海底撈 RM120 刷卡」→ 分類不確定，回傳：
{"type":"expense","amount":120,"currency":"MYR","category":null,"paymentMethod":"card","note":"海底撈","confirmed":false,"missing":["category"],"question":"海底撈 RM120 歸到哪個分類？"}

輸入「薪水 RM5000」→ 收入不需要支付方式，回傳：
{"type":"income","amount":5000,"currency":"MYR","category":"薪資","paymentMethod":null,"note":"薪水","confirmed":true,"missing":[]}

如果完全無法解析：{"error":"無法理解，請重新描述"}`

const CATEGORY_EMOJIS = {
  飲食:'🍽️', 交通:'🚗', 購物:'🛍️', 娛樂:'🎬', 醫療:'💊',
  住房:'🏠', 教育:'📚', 其他支出:'💸', 薪資:'💼', 獎金:'🎁', 副業:'💻', 其他收入:'💰',
}

const EXPENSE_CATS = ['飲食','交通','購物','娛樂','醫療','住房','教育','其他支出']
const INCOME_CATS = ['薪資','獎金','副業','其他收入']

export default function AIChat({ user }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `你好 ${user.displayName || ''}！\n\n直接說消費就能記帳，我會問你缺少的資訊：\n• 午餐 12\n• 海底撈 RM120 刷卡\n• 薪水 RM5000` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingTx, setPendingTx] = useState(null) // 等待補充資料的交易
  const [customCats, setCustomCats] = useState([])
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    return onSnapshot(collection(db, 'categories'), snap => {
      setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const allExpenseCats = [...EXPENSE_CATS, ...customCats.filter(c => c.type === 'expense').map(c => c.name)]
  const allIncomeCats = [...INCOME_CATS, ...customCats.filter(c => c.type === 'income').map(c => c.name)]

  async function saveTransaction(tx) {
    await addDoc(collection(db, 'transactions'), {
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      category: tx.category,
      categoryEmoji: CATEGORY_EMOJIS[tx.category] || customCats.find(c => c.name === tx.category)?.emoji || '💸',
      paymentMethod: tx.type === 'expense' ? (tx.paymentMethod || 'cash') : null,
      note: tx.note,
      userId: user.uid,
      userName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    })
    const curr = tx.currency === 'TWD' ? `NT$${tx.amount}` : `RM ${tx.amount}`
    const payStr = tx.type === 'expense' ? `・${tx.paymentMethod === 'card' ? '刷卡 💳' : '現金 💵'}` : ''
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `✅ 已記錄！\n\n${CATEGORY_EMOJIS[tx.category] || ''} ${tx.category}${payStr}\n💵 ${curr}\n📝 ${tx.note}`
    }])
    setPendingTx(null)
  }

  // 用戶點選補充資訊後繼續處理
  async function fillMissing(field, value) {
    if (!pendingTx) return
    const updated = { ...pendingTx, [field]: value }

    setMessages(prev => [...prev, {
      role: 'user',
      content: field === 'currency' ? (value === 'MYR' ? '馬幣 RM' : '台幣 NT$')
        : field === 'paymentMethod' ? (value === 'cash' ? '現金' : '刷卡')
        : value
    }])

    const stillMissing = (updated.missing || []).filter(f => f !== field)
    const nextMissing = stillMissing.filter(f => !updated[f] || updated[f] === null)

    if (nextMissing.length === 0) {
      // 全部資料都有了，直接存
      await saveTransaction(updated)
    } else {
      // 還有其他缺少的欄位，繼續問
      const nextField = nextMissing[0]
      const question = nextField === 'currency' ? '這是馬幣（RM）還是台幣（NT$）？'
        : nextField === 'paymentMethod' ? '這筆是現金還是刷卡？'
        : nextField === 'category' ? '歸到哪個分類？'
        : '請提供更多資訊'

      setPendingTx({ ...updated, missing: nextMissing })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: question,
        pendingField: nextField,
        pendingType: updated.type,
        isPending: true
      }])
    }
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
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMsg }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || ''

      let parsed = null
      try {
        const clean = text.replace(/```(?:json)?/gi, '').trim()
        parsed = JSON.parse(clean)
      } catch {}

      if (parsed?.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: parsed.error }])
      } else if (parsed?.confirmed === true) {
        await saveTransaction(parsed)
      } else if (parsed?.confirmed === false && parsed?.missing?.length > 0) {
        setPendingTx(parsed)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: parsed.question || '請確認以下資訊：',
          pendingField: parsed.missing[0],
          pendingType: parsed.type,
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

  function renderPendingUI(msg) {
    if (!msg.isPending || !pendingTx) return null
    const field = msg.pendingField

    if (field === 'currency') {
      return (
        <div style={{ marginLeft: 36, marginTop: 10, display: 'flex', gap: 8 }}>
          {[{v:'MYR',label:'🇲🇾 馬幣 RM'},{v:'TWD',label:'🇹🇼 台幣 NT$'}].map(opt => (
            <button key={opt.v} onClick={() => fillMissing('currency', opt.v)}
              style={{ background: 'white', border: '1.5px solid #0070ba', color: '#0070ba', padding: '10px 18px', borderRadius: 25, fontSize: 14, fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              {opt.label}
            </button>
          ))}
        </div>
      )
    }

    if (field === 'paymentMethod') {
      return (
        <div style={{ marginLeft: 36, marginTop: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => fillMissing('paymentMethod', 'cash')}
            style={{ background: 'white', border: '1.5px solid #00a650', color: '#00a650', padding: '10px 18px', borderRadius: 25, fontSize: 14, fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Banknote size={16} /> 現金
          </button>
          <button onClick={() => fillMissing('paymentMethod', 'card')}
            style={{ background: 'white', border: '1.5px solid #0070ba', color: '#0070ba', padding: '10px 18px', borderRadius: 25, fontSize: 14, fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CreditCard size={16} /> 刷卡
          </button>
        </div>
      )
    }

    if (field === 'category') {
      const cats = msg.pendingType === 'income' ? allIncomeCats : allExpenseCats
      return (
        <div style={{ marginLeft: 36, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {cats.map(cat => (
            <button key={cat} onClick={() => fillMissing('category', cat)}
              style={{ background: 'white', border: '1.5px solid #0070ba', color: '#0070ba', padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              {CATEGORY_EMOJIS[cat] || customCats.find(c=>c.name===cat)?.emoji || ''} {cat}
            </button>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f7fa' }}>
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '20px', paddingTop: 'calc(env(safe-area-inset-top) + 20px)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>AI 智能記帳</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>說消費，我來確認細節</p>
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
            {/* Show action buttons for the LAST pending message only */}
            {m.isPending && i === messages.length - 1 && renderPendingUI(m)}
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
        <input className="input-field" placeholder="午餐 12 / 海底撈 RM120 刷卡 ..." value={input} onChange={e => setInput(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" disabled={loading || !input.trim()}
          style={{ background: 'linear-gradient(135deg, #003087, #0070ba)', borderRadius: '50%', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!input.trim() || loading) ? 0.5 : 1, flexShrink: 0 }}>
          <Send size={18} color="white" />
        </button>
      </form>
    </div>
  )
}
