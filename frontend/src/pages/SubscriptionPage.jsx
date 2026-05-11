import { useState, useEffect } from 'react'
import { useToast } from '../components/ui/Toast'
import { subscriptionApi } from '../api/subscription'

// Визуальная стилистика для каждого плана.
const STYLE = {
  free:       { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', badge: null },
  pro:        { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', badge: 'Популярный' },
  enterprise: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', badge: 'Для команд' },
}

const FAQ = [
  { q: 'Можно ли отменить подписку в любой момент?', a: 'Да, доступ сохранится до конца оплаченного периода, затем автоматически переключение на Free.' },
  { q: 'Что происходит с данными после отмены?',     a: 'Сохранённые маршруты и история сделок не удаляются. Прекращается доступ к Pro-функциям.' },
  { q: 'Есть ли пробный период для Pro?',            a: 'Первые 14 дней Pro — бесплатно. Карта не требуется на старте.' },
  { q: 'Как работает API-доступ?',                   a: 'После подключения Pro получите API-ключ в разделе Настройки → API-ключи.' },
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

// formatLimit — пересчитывает «∞» для практически безлимитных значений.
function formatLimit(n) {
  if (n >= 999999) return '∞'
  return n.toLocaleString('ru-RU')
}

// buildFeatures — из лимитов плана собирает список «фич» для отображения.
function buildFeatures(plan) {
  return [
    { text: `${formatLimit(plan.routes_max)} сохранённых маршрутов`,    ok: plan.routes_max > 0 },
    { text: `История за ${plan.history_days} дней`,                       ok: plan.history_days > 0 },
    { text: `${formatLimit(plan.exports_per_month)} экспортов в месяц`,    ok: plan.exports_per_month > 0 },
    { text: `${formatLimit(plan.webhooks_max)} webhook-ов`,                ok: plan.webhooks_max > 0 },
    { text: `${formatLimit(plan.rate_limit)} запросов/мин к API`,          ok: plan.rate_limit > 0 },
    { text: 'Экспорт данных (CSV/Excel)',                                  ok: plan.exports_per_month > 0 },
    { text: 'Webhook-уведомления',                                          ok: plan.webhooks_max > 0 },
    { text: 'API-доступ',                                                    ok: plan.webhooks_max > 0 || plan.rate_limit >= 1000 },
  ]
}

export function SubscriptionPage() {
  const toast = useToast()
  const [plans, setPlans]     = useState([])
  const [myPlan, setMyPlan]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(null)
  const [faqOpen, setFaqOpen] = useState(null)

  useEffect(() => {
    Promise.all([subscriptionApi.listPlans(), subscriptionApi.getMyPlan()])
      .then(([p, m]) => { setPlans(p || []); setMyPlan(m) })
      .catch(() => toast('Не удалось загрузить тарифы', 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(planCode) {
    if (planCode === 'free' || planCode === myPlan?.code) return
    setUpgrading(planCode)
    // TODO: тут будет редирект в платёжный шлюз через /billing/checkout.
    await new Promise(r => setTimeout(r, 900))
    setUpgrading(null)
    toast(`Скоро: оплата тарифа ${planCode} через платёжную систему`)
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <div className="page-subtitle">Загружаем тарифы…</div>
        </div>
      </div>
    )
  }

  const currentCode = myPlan?.code || 'free'

  return (
    <div className="page">
      <div className="page-header" style={{ textAlign: 'center', paddingBottom: 0 }}>
        <div className="page-title">Выберите тариф</div>
        <div className="page-subtitle">
          Текущий план: <strong>{myPlan?.name || 'Free'}</strong>
          {myPlan && (
            <span style={{ marginLeft: 12, fontSize: 12, color: '#64748B' }}>
              Использовано: {myPlan.usage.routes_used}/{formatLimit(myPlan.limits.routes_max)} маршрутов
              {' · '}
              {myPlan.usage.webhooks_used}/{formatLimit(myPlan.limits.webhooks_max)} webhooks
            </span>
          )}
        </div>
      </div>

      <div className="pricing-grid" style={{ marginBottom: 32, marginTop: 24 }}>
        {plans.map(plan => {
          const style = STYLE[plan.code] || STYLE.free
          const isCurrent = plan.code === currentCode
          const isLoading = upgrading === plan.code
          const features  = buildFeatures(plan)

          return (
            <div key={plan.code} className={`pricing-card${isCurrent ? ' current' : ''}`} style={{
              border: `2px solid ${isCurrent ? style.color : style.border}`,
              background: isCurrent ? style.bg : '#fff',
              position: 'relative',
              transform: plan.code === 'pro' ? 'translateY(-4px)' : 'none',
              boxShadow: plan.code === 'pro' ? '0 8px 24px rgba(37,99,235,0.12)' : 'none',
            }}>
              {style.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: style.color, color: '#fff', fontSize: 11, fontWeight: 700,
                  padding: '3px 14px', borderRadius: 10, whiteSpace: 'nowrap',
                }}>
                  {style.badge}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{plan.name}</div>
                {plan.price_byn === 0 ? (
                  <div style={{ fontSize: 32, fontWeight: 800, color: style.color, lineHeight: 1.1 }}>
                    Бесплатно
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: style.color, lineHeight: 1.1 }}>
                      {plan.price_byn} BYN
                    </span>
                    <span style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6 }}>/ мес</span>
                  </div>
                )}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: f.ok ? '#374151' : '#94A3B8' }}>
                    <CheckIcon ok={f.ok} color={style.color} />
                    {f.text}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button disabled style={{ width: '100%', height: 40, borderRadius: 8, background: '#F1F5F9', color: '#94A3B8', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'default' }}>
                  Текущий план
                </button>
              ) : plan.code === 'free' ? (
                <button disabled style={{ width: '100%', height: 40, borderRadius: 8, background: '#F1F5F9', color: '#94A3B8', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'default' }}>
                  Базовый
                </button>
              ) : (
                <button onClick={() => handleUpgrade(plan.code)} disabled={isLoading}
                  style={{ width: '100%', height: 40, borderRadius: 8, background: style.color, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.15s' }}>
                  {isLoading ? 'Перенаправляем…' : plan.code === 'pro' ? 'Перейти на Pro' : 'Подключить Enterprise'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="info-banner" style={{ marginBottom: 24 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>
        <div>Все тарифы включают <strong>SSL</strong>, <strong>HMAC-подписанные webhooks</strong> и обновления платформы.</div>
      </div>

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
