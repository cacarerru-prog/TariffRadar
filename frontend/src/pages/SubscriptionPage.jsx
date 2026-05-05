import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: '#64748B',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    badge: null,
    features: [
      { text: '5 поисков в день',               ok: true  },
      { text: 'История за 30 дней',              ok: true  },
      { text: '3 сохранённых маршрута',           ok: true  },
      { text: 'Базовая аналитика',                ok: true  },
      { text: 'История за 90 дней',               ok: false },
      { text: 'Уведомления об изменении ставок',  ok: false },
      { text: 'Экспорт данных (CSV/Excel)',        ok: false },
      { text: 'Benchmark с рекомендациями',        ok: false },
      { text: 'API доступ',                        ok: false },
      { text: 'Приоритетная поддержка',            ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 19,
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    badge: 'Популярный',
    features: [
      { text: 'Безлимитный поиск',                ok: true  },
      { text: 'История за 90 дней',               ok: true  },
      { text: 'Безлимитные маршруты',              ok: true  },
      { text: 'Полная аналитика и инсайты',        ok: true  },
      { text: 'Уведомления об изменении ставок',   ok: true  },
      { text: 'Экспорт данных (CSV/Excel)',         ok: true  },
      { text: 'Benchmark с рекомендациями',         ok: true  },
      { text: 'Маркетплейс — приоритет',            ok: true  },
      { text: 'API доступ (1000 запросов/день)',    ok: false },
      { text: 'Приоритетная поддержка',             ok: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 99,
    yearlyPrice: 69,
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    badge: 'Для команд',
    features: [
      { text: 'Безлимитный поиск',                 ok: true },
      { text: 'История за 1 год',                  ok: true },
      { text: 'Командный доступ (до 10 человек)',   ok: true },
      { text: 'Полная аналитика и инсайты',         ok: true },
      { text: 'Уведомления + Slack/Telegram',       ok: true },
      { text: 'Экспорт данных (CSV/Excel/JSON)',     ok: true },
      { text: 'Benchmark + автоматические отчёты',  ok: true },
      { text: 'Маркетплейс — приоритет',            ok: true },
      { text: 'API доступ (безлимит)',              ok: true },
      { text: 'Приоритетная поддержка 24/7',        ok: true },
    ],
  },
]

const FAQ = [
  { q: 'Можно ли отменить подписку в любой момент?', a: 'Да, вы можете отменить подписку в любое время. Доступ сохранится до конца оплаченного периода.' },
  { q: 'Что происходит с данными после отмены?',     a: 'Ваши сохранённые маршруты и история сделок сохраняются. Доступ к Pro-функциям прекращается.' },
  { q: 'Есть ли пробный период для Pro?',            a: 'Да, первые 14 дней Pro — бесплатно. Карта не требуется.' },
  { q: 'Как работает API-доступ?',                   a: 'После подключения тарифа Business вы получите API-ключ в разделе Настройки → API-ключи.' },
]

function CheckIcon({ ok, color }) {
  if (ok) return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M2 7l4 4 6-6"/>
    </svg>
  )
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l8 8M11 3l-8 8"/>
    </svg>
  )
}

export function SubscriptionPage() {
  const { user } = useAuth()
  const toast    = useToast()
  const [yearly, setYearly]   = useState(false)
  const [loading, setLoading] = useState(null)
  const [faqOpen, setFaqOpen] = useState(null)

  const currentPlan = user?.role || 'free'

  async function handleUpgrade(planId) {
    if (planId === 'free' || planId === currentPlan) return
    setLoading(planId)
    await new Promise(r => setTimeout(r, 900))
    setLoading(null)
    toast(`Тариф ${planId === 'pro' ? 'Pro' : 'Business'} подключён! (демо)`)
  }

  return (
    <div className="page">
      <div className="page-header" style={{ textAlign: 'center', paddingBottom: 0 }}>
        <div className="page-title">Выберите тариф</div>
        <div className="page-subtitle">Начните бесплатно, переходите на Pro когда нужно больше</div>
      </div>

      {/* Billing toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
        <span style={{ fontSize: 13, color: !yearly ? '#0F172A' : '#94A3B8', fontWeight: !yearly ? 600 : 400 }}>
          Ежемесячно
        </span>
        <div onClick={() => setYearly(y => !y)} style={{
          width: 48, height: 26, borderRadius: 13, background: yearly ? '#2563EB' : '#E2E8F0',
          position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: 3, left: yearly ? 25 : 3,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }} />
        </div>
        <span style={{ fontSize: 13, color: yearly ? '#0F172A' : '#94A3B8', fontWeight: yearly ? 600 : 400 }}>
          Ежегодно
        </span>
        {yearly && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 10 }}>
            −35%
          </span>
        )}
      </div>

      {/* Pricing cards */}
      <div className="pricing-grid" style={{ marginBottom: 32 }}>
        {PLANS.map(plan => {
          const price    = yearly ? plan.yearlyPrice : plan.monthlyPrice
          const isCurrent = plan.id === currentPlan
          const isLoading = loading === plan.id

          return (
            <div key={plan.id} className={`pricing-card${isCurrent ? ' current' : ''}`} style={{
              border: `2px solid ${isCurrent ? plan.color : plan.border}`,
              background: isCurrent ? plan.bg : '#fff',
              position: 'relative',
              transform: plan.id === 'pro' ? 'translateY(-4px)' : 'none',
              boxShadow: plan.id === 'pro' ? '0 8px 24px rgba(37,99,235,0.12)' : 'none',
            }}>
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: plan.color, color: '#fff', fontSize: 11, fontWeight: 700,
                  padding: '3px 14px', borderRadius: 10, whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{plan.name}</div>
                {price === 0 ? (
                  <div style={{ fontSize: 32, fontWeight: 800, color: plan.color, lineHeight: 1.1 }}>
                    Бесплатно
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: plan.color, lineHeight: 1.1 }}>
                      ${price}
                    </span>
                    <span style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6 }}>/ мес</span>
                  </div>
                )}
                {yearly && price > 0 && (
                  <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 600, marginTop: 2 }}>
                    ${price * 12} в год (${(plan.monthlyPrice - price)} экономия/мес)
                  </div>
                )}
              </div>

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: f.ok ? '#374151' : '#94A3B8' }}>
                    <CheckIcon ok={f.ok} color={plan.color} />
                    {f.text}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <button disabled style={{ width: '100%', height: 40, borderRadius: 8, background: '#F1F5F9', color: '#94A3B8', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'default' }}>
                  Текущий план
                </button>
              ) : plan.id === 'free' ? (
                <button disabled style={{ width: '100%', height: 40, borderRadius: 8, background: '#F1F5F9', color: '#94A3B8', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'default' }}>
                  Базовый
                </button>
              ) : (
                <button onClick={() => handleUpgrade(plan.id)} disabled={isLoading}
                  style={{ width: '100%', height: 40, borderRadius: 8, background: plan.color, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.15s' }}>
                  {isLoading ? 'Подключаем…' : plan.id === 'pro' ? 'Начать 14 дней бесплатно' : 'Подключить Business'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Comparison note */}
      <div className="info-banner" style={{ marginBottom: 24 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>
        <div>Все тарифы включают <strong>SSL-шифрование</strong>, <strong>GDPR-совместимость</strong> и обновления платформы. Оплата через Stripe.</div>
      </div>

      {/* FAQ */}
      <div className="card">
        <div className="card-title">Часто задаваемые вопросы</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ borderBottom: i < FAQ.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{item.q}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round"
                  style={{ flexShrink: 0, transition: 'transform 0.2s', transform: faqOpen === i ? 'rotate(180deg)' : 'none' }}>
                  <path d="M4 6l4 4 4-4"/>
                </svg>
              </button>
              {faqOpen === i && (
                <div style={{ fontSize: 13, color: '#64748B', paddingBottom: 14, lineHeight: 1.6 }}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
