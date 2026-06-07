import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { format } from 'date-fns'
import { X, CreditCard, Banknote, TrendingUp, TrendingDown } from 'lucide-react'

const CATEGORY_ICONS = {
  飲食: '🍽️', 交通: '🚗', 購物: '🛍️', 娛樂: '🎬',
  醫療: '💊', 住房: '🏠', 教育: '📚', 其他支出: '💸',
  薪資: '💼', 獎金: '🎁', 副業: '💻', 其他收入: '💰',
}

export default function Stats() {
  const [transactions, setTransactions] = useState([])
  const [customCats, setCustomCats] = useState([])
  const [creditCards, setCreditCards] = useState([])
  const [currency, setCurrency] = useState('MYR')
  const [monthOffset, setMonthOffset] = useState(0)
  const [drillCat, setDrillCat] = useState(null)
  const [drillCard, setDrillCard] = useState(null) // card drill-down

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'categories'), snap => setCustomCats(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'creditCards'), snap => setCreditCards(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthLabel = `${target.getFullYear()}年${target.getMonth() + 1}月`

  const filtered = transactions.filter(t => {
    const d = t.createdAt?.toDate?.() || new Date(t.createdAt)
    return d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear() && t.currency === currency
  })

  const expenses = filtered.filter(t => t.type === 'expense')
  const incomes = filtered.filter(t => t.type === 'income')
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpense

  // Payment method breakdown
  const cashExpense = expenses.filter(t => !t.paymentMethod || t.paymentMethod === 'cash').reduce((s, t) => s + t.amount, 0)
  const cardExpense = expenses.filter(t => t.paymentMethod === 'card').reduce((s, t) => s + t.amount, 0)

  // Category breakdown
  const catMap = {}
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
  const catList = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  // Credit card breakdown (for current currency and month)
  // Each card: total amount (in card's currency), list of transactions
  const cardTxMap = {}
  transactions.forEach(t => {
    if (t.type !== 'expense' || t.paymentMethod !== 'card' || !t.cardId) return
    const d = t.createdAt?.toDate?.() || new Date(t.createdAt)
    if (d.getMonth() !== target.getMonth() || d.getFullYear() !== target.getFullYear()) return
    if (t.currency !== currency) return // show card data matching selected currency view
    if (!cardTxMap[t.cardId]) cardTxMap[t.cardId] = { total: 0, txs: [] }
    cardTxMap[t.cardId].total += t.amount
    cardTxMap[t.cardId].txs.push(t)
  })
  const cardList = Object.entries(cardTxMap)
    .map(([cardId, data]) => ({ cardId, ...data, card: creditCards.find(c => c.id === cardId) }))
    .filter(c => c.card)
    .sort((a, b) => b.total - a.total)

  // Monthly trend (last 6 months)
  const trendMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const txs = transactions.filter(t => {
      const td = t.createdAt?.toDate?.() || new Date(t.createdAt)
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear() && t.currency === currency
    })
    return {
      label: `${d.getMonth() + 1}月`,
      income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  })
  const maxTrend = Math.max(...trendMonths.map(m => Math.max(m.income, m.expense)), 1)

  function fmt(n) {
    return currency === 'TWD' ? `NT$${Math.round(n).toLocaleString()}` : `RM ${n.toFixed(2)}`
  }

  function getIcon(cat) {
    const custom = customCats.find(c => c.name === cat)
    return custom?.emoji || CATEGORY_ICONS[cat] || '💸'
  }

  // Drill-down transactions
  const drillTxs = drillCat ? expenses.filter(t => t.category === drillCat) : []

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #003087 0%, #0070ba 100%)', padding: '20px 20px 48px', paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 16, lineHeight: 1.4 }}>我尊重每一塊錢的去向。</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setMonthOffset(o => o - 1)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: 18 }}>‹</button>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{monthLabel}</span>
          <button onClick={() => setMonthOffset(o => Math.min(o + 1, 0))} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', width: 36, height: 36, borderRadius: '50%', fontSize: 18 }}>›</button>
        </div>
      </div>

      <div style={{ padding: '0 16px 90px', marginTop: -28 }}>
        {/* Currency toggle */}
        <div style={{ background: 'white', borderRadius: 14, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {['MYR', 'TWD'].map(c => (
            <button key={c} onClick={() => setCurrency(c)}
              style={{ padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: currency === c ? '#0070ba' : 'transparent',
                color: currency === c ? 'white' : '#a0aab0' }}>
              {c === 'MYR' ? '🇲🇾 馬幣' : '🇹🇼 台幣'}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <TrendingUp size={14} color="#00a650" />
              <p style={{ fontSize: 12, color: '#a0aab0', fontWeight: 600 }}>收入</p>
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#00a650' }}>{fmt(totalIncome)}</p>
          </div>
          <div style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <TrendingDown size={14} color="#d0021b" />
              <p style={{ fontSize: 12, color: '#a0aab0', fontWeight: 600 }}>支出</p>
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#d0021b' }}>{fmt(totalExpense)}</p>
          </div>
        </div>

        {/* Net */}
        <div style={{ background: net >= 0 ? '#f0faf4' : '#fff5f5', borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${net >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
          <p style={{ fontSize: 13, color: '#6c7378', marginBottom: 4, fontWeight: 600 }}>本月結餘</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: net >= 0 ? '#00a650' : '#d0021b' }}>
            {net >= 0 ? '+' : ''}{fmt(net)}
          </p>
        </div>

        {/* Payment Method Breakdown */}
        {totalExpense > 0 && (
          <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2c2e2f', marginBottom: 14 }}>💳 支付方式</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f0faf4', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#00a650', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Banknote size={16} color="white" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2e2f' }}>現金</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#00a650' }}>{fmt(cashExpense)}</p>
                {totalExpense > 0 && <p style={{ fontSize: 11, color: '#a0aab0' }}>{((cashExpense / totalExpense) * 100).toFixed(0)}%</p>}
              </div>
              <div style={{ background: '#e8f0fe', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0070ba', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={16} color="white" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2e2f' }}>刷卡</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0070ba' }}>{fmt(cardExpense)}</p>
                {totalExpense > 0 && <p style={{ fontSize: 11, color: '#a0aab0' }}>{((cardExpense / totalExpense) * 100).toFixed(0)}%</p>}
              </div>
            </div>
            {/* Bar */}
            <div style={{ marginTop: 12, background: '#f0f4f8', borderRadius: 8, height: 8, overflow: 'hidden', display: 'flex' }}>
              <div style={{ background: '#00a650', width: `${totalExpense > 0 ? (cashExpense / totalExpense) * 100 : 0}%`, transition: 'width 0.4s' }} />
              <div style={{ background: '#0070ba', flex: 1 }} />
            </div>
          </div>
        )}

        {/* Monthly Trend */}
        <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2c2e2f', marginBottom: 16 }}>📈 近6個月走勢</h3>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 100, marginBottom: 8 }}>
            {trendMonths.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: '88px' }}>
                  <div style={{ flex: 1, background: '#bbf7d0', borderRadius: '4px 4px 0 0', height: `${maxTrend > 0 ? (m.income / maxTrend) * 88 : 0}px`, minHeight: m.income > 0 ? 4 : 0, transition: 'height 0.4s' }} />
                  <div style={{ flex: 1, background: '#fca5a5', borderRadius: '4px 4px 0 0', height: `${maxTrend > 0 ? (m.expense / maxTrend) * 88 : 0}px`, minHeight: m.expense > 0 ? 4 : 0, transition: 'height 0.4s' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {trendMonths.map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#a0aab0', fontWeight: 600 }}>{m.label}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6c7378' }}>
              <div style={{ width: 10, height: 10, background: '#bbf7d0', borderRadius: 2 }} /> 收入
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6c7378' }}>
              <div style={{ width: 10, height: 10, background: '#fca5a5', borderRadius: 2 }} /> 支出
            </div>
          </div>
        </div>

        {/* Credit Card breakdown */}
        {cardList.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#2c2e2f', marginBottom: 12, marginTop: 4 }}>
              💳 信用卡消費 <span style={{ fontSize: 12, color: '#a0aab0', fontWeight: 400 }}>點擊查看明細</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {cardList.map(({ cardId, total, txs, card }) => {
                const isOpen = drillCard === cardId
                return (
                  <div key={cardId} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {/* Card header button */}
                    <button onClick={() => setDrillCard(isOpen ? null : cardId)}
                      style={{ width: '100%', background: 'none', padding: 0 }}>
                      {/* Mini card banner */}
                      <div style={{ background: card.color, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CreditCard size={20} color="white" style={{ opacity: 0.9 }} />
                        <span style={{ fontWeight: 700, color: 'white', fontSize: 15, flex: 1, textAlign: 'left' }}>{card.name}</span>
                        <span style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>{fmt(total)}</span>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                      <div style={{ padding: '8px 16px', display: 'flex', gap: 16, background: '#fafbfc' }}>
                        <span style={{ fontSize: 12, color: '#6c7378' }}>{txs.length} 筆消費</span>
                        <span style={{ fontSize: 12, color: '#6c7378' }}>{card.currency === 'TWD' ? '台幣帳單' : '馬幣帳單'}</span>
                      </div>
                    </button>

                    {/* Drill-down transactions */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #f0f4f8' }}>
                        {txs.map(t => {
                          const d = t.createdAt?.toDate?.() || new Date(t.createdAt)
                          return (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f0f4f8' }}>
                              <span style={{ fontSize: 22, flexShrink: 0 }}>{t.categoryEmoji || getIcon(t.category)}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#2c2e2f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {t.note || t.category}
                                </p>
                                <p style={{ fontSize: 11, color: '#a0aab0', marginTop: 2 }}>
                                  {t.category} · {format(d, 'M/d')} · {t.userName}
                                  {t.originalAmount ? ` · 原 ${t.originalCurrency === 'MYR' ? 'RM' : 'NT$'}${t.originalAmount.toFixed(2)}` : ''}
                                </p>
                              </div>
                              <span style={{ fontWeight: 700, color: '#d0021b', fontSize: 14, flexShrink: 0 }}>-{fmt(t.amount)}</span>
                            </div>
                          )
                        })}
                        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', background: '#fafbfc' }}>
                          <span style={{ fontSize: 13, color: '#6c7378', fontWeight: 600 }}>本月合計</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#d0021b' }}>{fmt(total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Category breakdown */}
        {catList.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#2c2e2f', marginBottom: 12 }}>支出分類 <span style={{ fontSize: 12, color: '#a0aab0', fontWeight: 400 }}>點擊查看明細</span></h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {catList.map(([cat, amount]) => {
                const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
                const isOpen = drillCat === cat
                const catTxs = expenses.filter(t => t.category === cat)
                return (
                  <div key={cat} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <button onClick={() => setDrillCat(isOpen ? null : cat)}
                      style={{ width: '100%', background: 'none', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 24 }}>{getIcon(cat)}</span>
                          <span style={{ fontWeight: 600, color: '#2c2e2f', fontSize: 15 }}>{cat}</span>
                          <span style={{ fontSize: 12, color: '#a0aab0' }}>{catTxs.length}筆</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#d0021b', fontWeight: 700, fontSize: 15 }}>{fmt(amount)}</div>
                          <div style={{ fontSize: 11, color: '#a0aab0' }}>{pct.toFixed(1)}%</div>
                        </div>
                      </div>
                      <div style={{ background: '#f0f4f8', borderRadius: 6, height: 6 }}>
                        <div style={{ background: 'linear-gradient(90deg, #003087, #0070ba)', height: 6, borderRadius: 6, width: `${pct}%`, transition: 'width 0.3s' }} />
                      </div>
                    </button>

                    {/* Drill-down */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #f0f4f8', background: '#fafbfc' }}>
                        {catTxs.map(t => {
                          const d = t.createdAt?.toDate?.() || new Date(t.createdAt)
                          return (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f0f4f8' }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: t.paymentMethod === 'card' ? '#e8f0fe' : '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {t.paymentMethod === 'card' ? <CreditCard size={14} color="#0070ba" /> : <Banknote size={14} color="#00a650" />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#2c2e2f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || t.category}</p>
                                <p style={{ fontSize: 11, color: '#a0aab0', marginTop: 2 }}>{t.userName} · {format(d, 'M/d HH:mm')} · {t.paymentMethod === 'card' ? '刷卡' : '現金'}</p>
                              </div>
                              <span style={{ fontWeight: 700, color: '#d0021b', fontSize: 14 }}>-{fmt(t.amount)}</span>
                            </div>
                          )
                        })}
                        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: '#6c7378', fontWeight: 600 }}>合計</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#d0021b' }}>{fmt(amount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#a0aab0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <p style={{ fontWeight: 600, color: '#6c7378' }}>本月 {currency} 尚無記錄</p>
          </div>
        )}
      </div>
    </div>
  )
}
