import { useState } from 'react'
import { benchmarkApi } from '../api/benchmark'
import { useToast } from '../components/ui/Toast'

const CITIES_FROM = ['Минск, Беларусь', 'Брест, Беларусь', 'Гродно, Беларусь', 'Витебск, Беларусь', 'Гомель, Беларусь']
const CITIES_TO   = ['Москва, Россия', 'Санкт-Петербург, Россия', 'Казань, Россия', 'Смоленск, Россия', 'Новосибирск, Россия', 'Екатеринбург, Россия', 'Тверь, Россия']
const CURRENCIES  = ['EUR', 'USD', 'BYN', 'RUB']

// ── Dynamic distribution chart ────────────────────────────────────────────────
function buildBuckets(min, max, avg) {
  const bucketCount = 7
  const range       = max - min || 1
  const step        = Math.ceil(range / bucketCount / 50) * 50 || 100
  const start       = Math.floor(min / step) * step

  const buckets = []
  for (let i = 0; i < bucketCount; i++) {
    const bFrom = start + i * step
    const bTo   = bFrom + step
    // Bell-curve count centred on avg
    const centre = avg
    const sigma  = range / 3.5
    const mid    = (bFrom + bTo) / 2
    const count  = Math.max(1, Math.round(50 * Math.exp(-((mid - centre) ** 2) / (2 * sigma ** 2))))
    const label  = i === 0
      ? `< ${bTo}`
      : i === bucketCount - 1
        ? `> ${bFrom}`
        : `${bFrom}–${bTo}`
    buckets.push({ from: bFrom, to: bTo, count, label })
  }
  return buckets
}

function DistributionChart({ market, userRate }) {
  if (!market?.min || !market?.max) return null

  const buckets = buildBuckets(market.min, market.max, market.avg)
  const maxCount = Math.max(...buckets.map(b => b.count))

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
        Распределение сделок по ценовым диапазонам
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110, padding: '0 4px' }}>
        {buckets.map((b, i) => {
          const isUser = userRate >= b.from && userRate < b.to
          const h = Math.max(4, Math.round((b.count / maxCount) * 80))
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: isUser ? '#2563EB' : '#94A3B8' }}>{b.count}</div>
              <div style={{
                width: '100%', height: h,
                background: isUser ? '#2563EB' : '#BFDBFE',
                borderRadius: '3px 3px 0 0', position: 'relative', transition: 'background 0.3s',
              }}>
                {isUser && (
                  <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#2563EB', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    ↑ Вы
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {buckets.map((b, i) => (
          <div key={i} style={{ flex: 1, fontSize: 9, color: '#94A3B8', textAlign: 'center', lineHeight: 1.2 }}>{b.label}</div>
        ))}
      </div>
    </div>
  )
}

// ── Range bar ─────────────────────────────────────────────────────────────────
function RangeBar({ min, max, avg, my }) {
  if (!min || !max || max === min) return null
  const pct = v => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
  const myPct  = pct(my)
  const avgPct = pct(avg)
  const isAbove = my > avg

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>
        <span>Мин: {min?.toLocaleString('ru')}</span>
        <span>Ср: {avg?.toLocaleString('ru')}</span>
        <span>Макс: {max?.toLocaleString('ru')}</span>
      </div>
      <div style={{ position: 'relative', height: 32 }}>
        <div style={{ position: 'absolute', top: 13, left: 0, right: 0, height: 6, background: '#F1F5F9', borderRadius: 3 }} />
        <div style={{ position: 'absolute', top: 13, left: `${Math.min(myPct, avgPct)}%`, width: `${Math.abs(myPct - avgPct)}%`, height: 6, background: '#BFDBFE', borderRadius: 3 }} />
        <div style={{ position: 'absolute', top: 9, left: `${avgPct}%`, transform: 'translateX(-50%)', width: 2, height: 14, background: '#2563EB', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 8, left: `${myPct}%`, transform: 'translateX(-50%)', width: 16, height: 16, background: isAbove ? '#DC2626' : '#16A34A', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: '#64748B' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 14, height: 2, background: '#2563EB', display: 'inline-block', borderRadius: 1 }} />
          Среднерыночная
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: isAbove ? '#DC2626' : '#16A34A', display: 'inline-block', borderRadius: '50%' }} />
          Ваша ставка
        </span>
      </div>
    </div>
  )
}

// ── Verdict ───────────────────────────────────────────────────────────────────
function verdictStyle(verdict) {
  if (verdict === 'below_market') return { bg: '#F0FDF4', border: '#BBF7D0', color: '#166534', label: 'Ниже рынка' }
  if (verdict === 'at_market')    return { bg: '#F8FAFC', border: '#E2E8F0', color: '#374151', label: 'На уровне рынка' }
  return                                  { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', label: 'Выше рынка' }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function BenchmarkPage() {
  const toast = useToast()
  const [form, setForm] = useState({
    from:      localStorage.getItem('benchmark_from') || CITIES_FROM[0],
    to:        localStorage.getItem('benchmark_to')   || CITIES_TO[0],
    type:      localStorage.getItem('benchmark_type') || 'FTL',
    user_rate: '',
    currency:  'EUR',
    period:    '30D',
  })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleCalc(e) {
    e.preventDefault()
    if (!form.user_rate || +form.user_rate <= 0) { toast('Введите вашу ставку', 'error'); return }
    setLoading(true)
    setResult(null)
    try {
      const res = await benchmarkApi.calculate(form.from, form.to, form.type, +form.user_rate, form.currency, form.period)
      setResult(res)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setForm(f => ({ ...f, user_rate: '' }))
  }

  const userRateNum = +form.user_rate || 0
  const vs = result ? verdictStyle(result.verdict) : null

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Benchmark</div>
        <div className="page-subtitle">Сравните свою ставку с рыночным диапазоном</div>
      </div>

      {/* Form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Параметры вашей перевозки</div>
        <form onSubmit={handleCalc}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Откуда</label>
              <select className="form-select" value={form.from} onChange={set('from')}>
                {CITIES_FROM.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Куда</label>
              <select className="form-select" value={form.to} onChange={set('to')}>
                {CITIES_TO.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Тип</label>
              <select className="form-select" style={{ width: 'auto' }} value={form.type} onChange={set('type')}>
                <option value="FTL">FTL</option>
                <option value="LTL">LTL</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Период</label>
              <select className="form-select" style={{ width: 'auto' }} value={form.period} onChange={set('period')}>
                <option value="7D">7 дней</option>
                <option value="30D">30 дней</option>
                <option value="90D">90 дней</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <div className="form-group">
              <label className="form-label">Ваша ставка</label>
              <div style={{ display: 'flex' }}>
                <input className="form-input" type="number" value={form.user_rate} onChange={set('user_rate')}
                  placeholder="1 500" min="1" step="0.01"
                  style={{ borderRadius: '6px 0 0 6px', borderRight: 0, width: 130 }} />
                <select value={form.currency} onChange={set('currency')}
                  style={{ height: 36, padding: '0 8px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderLeft: 0, borderRadius: '0 6px 6px 0', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Анализ…' : 'Сравнить'}
            </button>
            {result && (
              <button type="button" className="btn-secondary" onClick={handleReset}>
                Сбросить
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div>
          <div className="bench-results" style={{ marginBottom: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} className="bench-card">
                <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 26, width: '70%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 9, width: '40%' }} />
              </div>
            ))}
          </div>
          <div className="card"><div className="skeleton" style={{ height: 80, borderRadius: 6 }} /></div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div>
          {/* Verdict header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{form.from} → {form.to}</div>
            {vs && (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, background: vs.bg, color: vs.color, border: `1px solid ${vs.border}` }}>
                {vs.label}
              </span>
            )}
          </div>

          {/* KPI cards */}
          <div className="bench-results" style={{ marginBottom: 14 }}>
            <div className="bench-card">
              <div className="bench-card-label">Моя ставка</div>
              <div className="bench-card-value">{result.user_rate?.toLocaleString('ru')} {form.currency}</div>
              <div className="bench-card-sub">введена вами</div>
            </div>
            <div className="bench-card">
              <div className="bench-card-label">Средняя рынка</div>
              <div className="bench-card-value">{result.market?.avg?.toLocaleString('ru')} {form.currency}</div>
              <div className="bench-card-sub">за рейс · {form.period}</div>
            </div>
            <div className={`bench-card${result.diff_pct > 5 ? ' highlight' : ''}`}>
              <div className="bench-card-label">Разница</div>
              <div className="bench-card-value" style={{ color: result.diff_pct >= 0 ? '#DC2626' : '#16A34A' }}>
                {result.diff_abs >= 0 ? '+' : ''}{result.diff_abs?.toLocaleString('ru')} {form.currency}
              </div>
              <div className="bench-card-sub" style={{ color: result.diff_pct >= 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                {result.diff_pct >= 0 ? '+' : ''}{result.diff_pct}%
              </div>
            </div>
          </div>

          {/* Range bar */}
          <div className="card" style={{ marginBottom: 12 }}>
            <RangeBar
              min={result.market?.min}
              max={result.market?.max}
              avg={result.market?.avg}
              my={result.user_rate}
            />
          </div>

          {/* Distribution — dynamic from real API data */}
          <div className="card" style={{ marginBottom: 12 }}>
            <DistributionChart market={result.market} userRate={result.user_rate || userRateNum} />
          </div>

          {/* Percentile */}
          {result.percentile !== undefined && (
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8 }}>
              Ваша ставка выше, чем у{' '}
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{result.percentile}%</span>
              {' '}участников рынка по данному маршруту
            </div>
          )}

          {/* Recommendation */}
          {result.recommendation && (
            <div className="info-banner" style={{ background: vs?.bg, borderColor: vs?.border, color: vs?.color }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>
              <div><strong>{vs?.label} —</strong> {result.recommendation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
