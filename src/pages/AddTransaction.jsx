import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore'
import { ArrowLeft, CreditCard, Banknote, RefreshCw } from 'lucide-react'

const DEFAULT_EXPENSE = [
  { name: '飲食', emoji: '🍽️' }, { name: '交通', emoji: '🚗' },
  { name: '購物', emoji: '🛍️' }, { name: '娛樂', emoji: '🎬' },
  { name: '醫療', emoji: '💊' }, { name: '住房', emoji: '🏠' },
  { name: '教育', emoji: '📚' }, { name: '其他支出', emoji: '💸' },
]
const DEFAULT_INCOME = [
  { name: '薪資', emoji: '💼' }, { name: '獎金', emoji: '🎁' },
  { name: '副業', emoji: '💻' }, { name: '其他收入', emoji: '💰' },
]

// Fetch today's exchange rate from open.er-api.com (free, no key needed)
async function fetchRate(from, to) {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`)
    const data = await res.json()
    return data.rates[to] || null
  } catch {
    return null
  }
}

export default function AddTransaction({ user, setTab }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('MYR')
  const [category, setCategory] = useState('')
  const [categoryEmoji, setCategoryEmoji] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [customCats, setCustomCats] = useState([])

  // Credit cards
  const [creditCards, setCreditCards] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)

  // Cross-currency conversion
  const [convertedAmount, setConvertedAmount] = useState(null)
  const [rateInfo, setRateInfo] = useState(null) // { rate, from, to }
  const [rateLoading, setRateLoading] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'creditCards'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap => {
      const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setCreditCards(cards)
      if (cards.length > 0 && !selectedCard) setSelectedCard(cards[0])
    })
  }, [])

  // When card or amount or currency changes, recalculate conversion
  useEffect(() => {
    if (paymentMethod !== 'card' || !selectedCard || !amount) {
      setConvertedAmount(null)
      setRateInfo(null)
      return
    }
    if (selectedCard.currency === currency) {
      setConvertedAmount(null)
      setRateInfo(null)
      return
    }
    // Cross-currency: need conversion
    const amtNum = parseFloat(amount)
    if (isNaN(amtNum) || amtNum <= 0) return

    let cancelled = false
    setRateLoading(true)
    fetchRate(currency, selectedCard.currency).then(rate => {
      if (cancelled) return
      setRateLoading(false)
      if (rate) {
        const converted = Math.round(amtNum * rate)
        setConvertedAmount(converted)
        setRateInfo({ rate, from: currency, to: selectedCard.currency })
      }
    })
    return () => { cancelled = true }
  }, [paymentMethod, selectedCard?.id, amount, currency])

  const allCats = [...(type === 'expense' ? DEFAULT_EXPENSE : DEFAULT_INCOME), ...customCats.filter(c => c.type === type)]

  function currSymbol(cur) {
    return cur === 'MYR' ? 'RM' : 'NT$'
  }

  async function submit(e) {
    e.preventDefault()
    if (!amount || !category) return
    setLoading(true)

    const isCrossCurrency = paymentMethod === 'card' && selectedCard && convertedAmount && rateInfo && selectedCard.currency !== currency

    // If cross-currency card: record in card's currency; store original spend separately
    const recordAmount   = isCrossCurrency ? convertedAmount       : parseFloat(amount)
    const recordCurrency = isCrossCurrency ? selectedCard.currency : currency

    // Build note
    let finalNote = note
    if (isCrossCurrency) {
      const originalStr  = `${currSymbol(currency)}${parseFloat(amount).toFixed(2)}`
      const convertedStr = `${currSymbol(selectedCard.currency)}${convertedAmount}`
      const convNote = `${originalStr} → ${convertedStr}`
      finalNote = note ? `${convNote}｜${note}` : convNote
    }

    await addDoc(collection(db, 'transactions'), {
      type,
      amount: recordAmount,
      currency: recordCurrency,
      category,
      categoryEmoji,
      paymentMethod: type === 'expense' ? paymentMethod : null,
      // Card info (only when 刷卡)
      ...(type === 'expense' && paymentMethod === 'card' && selectedCard ? {
        cardId: selectedCard.id,
        cardName: selectedCard.name,
        cardCurrency: selectedCard.currency,
        // If cross-currency, store original spend for reference
        ...(isCrossCurrency ? {
          originalAmount: parseFloat(amount),
          originalCurrency: currency,
          exchangeRate: rateInfo.rate,
        } : {}),
      } : {}),
      note: finalNote,
      userId: user.uid,
      userName: user.displayName || user.email,
      createdAt: serverTimestamp(),
    })
    setLoading(false)
    setTab('home')
  }

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '16px 20px 28px', paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setTab('home')} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>新增記錄</h1>
        </div>
      </div>

      <div style={{ padding: '16px', paddingBottom: 90 }}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Type toggle */}
          <div style={{ background: 'white', borderRadius: 14, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {['expense', 'income'].map(t => (
              <button key={t} type="button" onClick={() => { setType(t); setCategory(''); setCategoryEmoji('') }}
                style={{ padding: '11px', borderRadius: 10, fontWeight: 700, fontSize: 15,
                  background: type === t ? (t === 'expense' ? '#d0021b' : '#00a650') : 'transparent',
                  color: type === t ? 'white' : '#a0aab0' }}>
                {t === 'expense' ? '💸 支出' : '💰 收入'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 10, display: 'block' }}>金額</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <input className="input-field" type="number" inputMode="decimal" placeholder="0.00" value={amount}
                onChange={e => setAmount(e.target.value)} required
                style={{ fontSize: 22, fontWeight: 700, color: '#2c2e2f' }} />
              <select className="input-field" value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: 82, fontWeight: 700 }}>
                <option value="MYR">RM</option>
                <option value="TWD">NT$</option>
              </select>
            </div>
          </div>

          {/* Payment Method (expense only) */}
          {type === 'expense' && (
            <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 10, display: 'block' }}>支付方式</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: paymentMethod === 'card' ? 14 : 0 }}>
                <button type="button" onClick={() => { setPaymentMethod('cash'); setSelectedCard(null) }}
                  style={{ padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: paymentMethod === 'cash' ? '#e8f0fe' : '#f5f7fa',
                    color: paymentMethod === 'cash' ? '#0070ba' : '#6c7378',
                    border: paymentMethod === 'cash' ? '2px solid #0070ba' : '2px solid transparent' }}>
                  <Banknote size={18} /> 現金
                </button>
                <button type="button" onClick={() => { setPaymentMethod('card'); if (creditCards.length > 0) setSelectedCard(creditCards[0]) }}
                  style={{ padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: paymentMethod === 'card' ? '#e8f0fe' : '#f5f7fa',
                    color: paymentMethod === 'card' ? '#0070ba' : '#6c7378',
                    border: paymentMethod === 'card' ? '2px solid #0070ba' : '2px solid transparent' }}>
                  <CreditCard size={18} /> 刷卡
                </button>
              </div>

              {/* Card selector */}
              {paymentMethod === 'card' && (
                <div>
                  {creditCards.length === 0 ? (
                    <div style={{ background: '#fff8e1', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>⚠️</span>
                      <p style={{ fontSize: 13, color: '#7c6000' }}>尚未新增信用卡，請先至「設定 → 信用卡管理」新增。</p>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', display: 'block', marginBottom: 8 }}>選擇信用卡</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {creditCards.map(card => (
                          <button key={card.id} type="button" onClick={() => setSelectedCard(card)}
                            style={{ padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
                              background: selectedCard?.id === card.id ? '#e8f0fe' : '#f5f7fa',
                              border: selectedCard?.id === card.id ? '2px solid #0070ba' : '2px solid transparent' }}>
                            {/* Mini card swatch */}
                            <div style={{ width: 36, height: 24, borderRadius: 6, background: card.color, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
                            <span style={{ fontWeight: 700, color: '#2c2e2f', flex: 1, textAlign: 'left' }}>{card.name}</span>
                            <span style={{ fontSize: 12, color: '#6c7378', fontWeight: 600 }}>
                              {card.currency === 'TWD' ? '台幣' : '馬幣'}
                            </span>
                            {selectedCard?.id === card.id && <span style={{ color: '#0070ba', fontWeight: 700 }}>✓</span>}
                          </button>
                        ))}
                      </div>

                      {/* Cross-currency conversion preview */}
                      {selectedCard && selectedCard.currency !== currency && amount && parseFloat(amount) > 0 && (
                        <div style={{ marginTop: 12, background: '#e8f4fd', borderRadius: 10, padding: '12px 14px' }}>
                          {rateLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0070ba' }}>
                              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              <span style={{ fontSize: 13 }}>換算中...</span>
                            </div>
                          ) : convertedAmount ? (
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#0070ba', marginBottom: 4 }}>💱 跨幣種換算</p>
                              <p style={{ fontSize: 15, fontWeight: 700, color: '#2c2e2f' }}>
                                {currSymbol(currency)}{parseFloat(amount).toFixed(2)} → <span style={{ color: '#0070ba' }}>{currSymbol(selectedCard.currency)}{convertedAmount}</span>
                              </p>
                              <p style={{ fontSize: 11, color: '#6c7378', marginTop: 4 }}>
                                帳單幣種：{selectedCard.currency === 'TWD' ? '台幣 NT$' : '馬幣 RM'}
                              </p>
                            </div>
                          ) : (
                            <p style={{ fontSize: 13, color: '#a0aab0' }}>無法取得換算結果，請確認網路連線</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Category */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 12, display: 'block' }}>分類</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {allCats.map(cat => (
                <button key={cat.name} type="button" onClick={() => { setCategory(cat.name); setCategoryEmoji(cat.emoji) }}
                  style={{ padding: '10px 4px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: category === cat.name ? '#e8f0fe' : '#f5f7fa',
                    color: category === cat.name ? '#0070ba' : '#6c7378',
                    border: category === cat.name ? '2px solid #0070ba' : '2px solid transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6c7378', marginBottom: 10, display: 'block' }}>備註（選填）</label>
            <input className="input-field" placeholder="午餐、車費..." value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading || !amount || !category}
            style={{ opacity: (!amount || !category) ? 0.5 : 1, marginTop: 4 }}>
            {loading ? '儲存中...' : '儲存記錄'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
