import { useState, useEffect, useRef } from 'react'
import { insightsApi } from '../api/insights'
import { marketplaceApi } from '../api/marketplace'
import { useToast } from '../components/ui/Toast'
import { buildChartPaths } from '../utils/chartPaths'

const CITIES_FROM = ['Минск, Беларусь', 'Брест, Беларусь', 'Гродно, Беларусь', 'Витебск, Беларусь', 'Гомель, Беларусь']
const CITIES_TO   = ['Москва, Россия', 'Санкт-Петербург, Россия', 'Казань, Россия', 'Смоленск, Россия', 'Новосибирск, Россия', 'Екатеринбург, Россия']
const TABS = ['Тренды', 'Сезонность', 'По типу груза', 'Маркетплейс']

// ── Chart ─────────────────────────────────────────────────────────────────────
function SVGAreaChart({ data, labels }) {
  const W = 520, H = 130
  const { line, area } = buildChartPaths(data, W, H, 4, 10)
  const uid = 'a' + Math.random().toString(36).slice(2, 6)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor="#2563EB" stopOpacity="0.18" />
          <stop offset="95%" stopColor="#2563EB" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(t => {
        const y = (10 + t * (H - 20)).toFixed(1)
        return <line key={t} x1={4} y1={y} x2={W - 4} y2={y} stroke="#F1F5F9" strokeWidth={1} />
      })}
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinejoin="round" />
      {labels.map((l, i) => {
        const x = (4 + (i / (data.length - 1)) * (W - 8)).toFixed(1)
        return <text key={i} x={x} y={H - 1} fontSize={9} fill="#94A3B8" textAnchor="middle">{l}</text>
      })}
    </svg>
  )
}

function HBar({ label, val, maxVal }) {
  const pct = maxVal > 0 ? ((val / maxVal) * 100).toFixed(1) : 0
  return (
    <div className="hbar-row">
      <div className="hbar-label">{label}</div>
      <div className="hbar-track">
        <div className="hbar-fill" style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
      <div className="hbar-val">{val.toLocaleString('ru')} EUR</div>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function TrendsTab({ data }) {
  const rising  = data.rising  ?? data.top_growing_routes  ?? []
  const falling = data.falling ?? data.top_declining_routes ?? []

  return (
    <div className="insights-grid">
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#16A34A' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 10V2M2 6l4-4 4 4"/></svg>
          </span>
          Топ по росту
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>за 30 дней</span>
        </div>
        <ul className="trend-list">
          {rising.length === 0 && <li style={{ fontSize: 13, color: '#94A3B8' }}>Нет данных</li>}
          {rising.map((item, i) => {
            const route  = item.route || `${item.from} → ${item.to}`
            const change = item.change_pct ?? item.change_percent ?? 0
            const pct    = typeof change === 'string' ? change : `${change >= 0 ? '+' : ''}${change}%`
            return (
              <li key={i} className="trend-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <span className="trend-rank">{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{route}</span>
                  <span style={{ fontWeight: 700, color: '#16A34A', fontSize: 13 }}>{pct}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#DC2626' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2v8M2 6l4 4 4-4"/></svg>
          </span>
          Топ по снижению
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>за 30 дней</span>
        </div>
        <ul className="trend-list">
          {falling.length === 0 && <li style={{ fontSize: 13, color: '#94A3B8' }}>Нет данных</li>}
          {falling.map((item, i) => {
            const route  = item.route || `${item.from} → ${item.to}`
            const change = item.change_pct ?? item.change_percent ?? 0
            const pct    = typeof change === 'string' ? change : `${change >= 0 ? '+' : ''}${change}%`
            return (
              <li key={i} className="trend-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <span className="trend-rank">{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{route}</span>
                  <span style={{ fontWeight: 700, color: '#DC2626', fontSize: 13 }}>{pct}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function SeasonalityTab({ data }) {
  const labels    = data.labels ?? []
  const values    = data.values ?? []
  const chartData   = values.filter(v => v > 0)
  const chartLabels = labels.filter((_, i) => values[i] > 0)

  if (chartData.length === 0) return <p style={{ fontSize: 13, color: '#94A3B8' }}>Нет данных</p>

  return (
    <div className="card">
      <div className="card-title">Сезонность — средняя ставка по месяцам</div>
      <SVGAreaChart data={chartData} labels={chartLabels} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
        <span>мин: {Math.min(...chartData).toLocaleString('ru')} EUR</span>
        <span>макс: {Math.max(...chartData).toLocaleString('ru')} EUR</span>
      </div>
    </div>
  )
}

function CargoTab({ data }) {
  const items = Array.isArray(data) ? data : (data.data ?? [])
  if (items.length === 0) return <p style={{ fontSize: 13, color: '#94A3B8' }}>Нет данных</p>

  const maxVal = Math.max(...items.map(c => c.value ?? c.avg_price ?? c.avg ?? 0))

  return (
    <div className="card">
      <div className="card-title">Средняя ставка по типу груза</div>
      <div style={{ paddingTop: 4 }}>
        {items.map((c, i) => (
          <HBar key={i}
            label={c.label ?? c.type ?? c.cargo}
            val={c.value ?? c.avg_price ?? c.avg ?? 0}
            maxVal={maxVal} />
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8', marginTop: 6, paddingLeft: 125, paddingRight: 75 }}>
          <span>0</span><span>{Math.round(maxVal / 2).toLocaleString('ru')}</span><span>{maxVal.toLocaleString('ru')}</span>
        </div>
      </div>
    </div>
  )
}

function MarketplaceTab() {
  const toast = useToast()
  const [loads, setLoads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    marketplaceApi.list()
      .then(res => setLoads(res.data || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  if (loading) {
    return (
      <div className="insights-grid">
        <div className="card"><div className="skeleton" style={{ height: 150, borderRadius: 6 }} /></div>
        <div className="card"><div className="skeleton" style={{ height: 150, borderRadius: 6 }} /></div>
      </div>
    )
  }

  if (loads.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: '#94A3B8', fontSize: 13 }}>
        Нет данных маркетплейса. Перейдите в Маркетплейс и разместите первое объявление.
      </div>
    )
  }

  // Stats
  const openLoads  = loads.filter(l => l.status === 'open').length
  const takenLoads = loads.filter(l => l.status === 'taken').length
  const avgPrice   = Math.round(loads.reduce((s, l) => s + (l.price || 0), 0) / loads.length)
  const ftlCount   = loads.filter(l => l.type === 'FTL').length
  const ltlCount   = loads.filter(l => l.type === 'LTL').length

  // Top routes by count
  const routeMap = {}
  loads.forEach(l => {
    const k = `${l.from} → ${l.to}`
    routeMap[k] = (routeMap[k] || 0) + 1
  })
  const topRoutes = Object.entries(routeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Avg price by cargo
  const cargoMap = {}
  loads.forEach(l => {
    if (!cargoMap[l.cargo]) cargoMap[l.cargo] = { sum: 0, n: 0 }
    cargoMap[l.cargo].sum += l.price || 0
    cargoMap[l.cargo].n++
  })
  const cargoItems = Object.entries(cargoMap)
    .map(([cargo, { sum, n }]) => ({ cargo, avg: Math.round(sum / n) }))
    .sort((a, b) => b.avg - a.avg)
  const maxAvg = Math.max(...cargoItems.map(c => c.avg), 1)

  return (
    <div>
      {/* KPI */}
      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Всего объявлений</div>
          <div className="stat-value">{loads.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Открытых</div>
          <div className="stat-value" style={{ color: '#16A34A' }}>{openLoads}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Средняя ставка</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{avgPrice.toLocaleString('ru')} <span>EUR</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">FTL / LTL</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{ftlCount} / {ltlCount}</div>
        </div>
      </div>

      <div className="insights-grid">
        {/* Top routes */}
        <div className="card">
          <div className="card-title">Топ маршрутов по объявлениям</div>
          <ul className="trend-list">
            {topRoutes.map(([route, count], i) => (
              <li key={i} className="trend-item" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <span className="trend-rank">{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{route}</span>
                  <span className="badge badge-blue">{count} объявл.</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Avg by cargo */}
        <div className="card">
          <div className="card-title">Средняя ставка по грузу (маркетплейс)</div>
          <div style={{ paddingTop: 4 }}>
            {cargoItems.map((c, i) => (
              <HBar key={i} label={c.cargo} val={c.avg} maxVal={maxAvg} />
            ))}
          </div>
        </div>
      </div>

      {/* FTL/LTL breakdown */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Структура объявлений</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: ftlCount, background: '#2563EB', height: 28, borderRadius: '4px 0 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, transition: 'flex 0.5s' }}>
            {ftlCount > 0 ? `FTL ${Math.round(ftlCount / loads.length * 100)}%` : ''}
          </div>
          <div style={{ flex: ltlCount, background: '#93C5FD', height: 28, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8', fontSize: 12, fontWeight: 700, transition: 'flex 0.5s' }}>
            {ltlCount > 0 ? `LTL ${Math.round(ltlCount / loads.length * 100)}%` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: '#64748B' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#2563EB', borderRadius: 2, marginRight: 4 }} />FTL — {ftlCount} объявл.</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#93C5FD', borderRadius: 2, marginRight: 4 }} />LTL — {ltlCount} объявл.</span>
          <span style={{ marginLeft: 'auto' }}>Закрытых сделок: {takenLoads}</span>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function InsightsPage() {
  const toast = useToast()
  const [tab,    setTab]    = useState(0)
  const [period, setPeriod] = useState('30D')
  const [from,   setFrom]   = useState(CITIES_FROM[0])
  const [to,     setTo]     = useState(CITIES_TO[0])

  const [trends,      setTrends]      = useState(null)
  const [seasonality, setSeasonality] = useState(null)
  const [byCargo,     setByCargo]     = useState(null)
  const [loading, setLoading] = useState(false)

  // Track loaded combinations to avoid redundant fetches
  const loadedRef = useRef({})

  function cacheKey() {
    if (tab === 0) return `trends_${period}`
    if (tab === 1) return `season_${from}_${to}`
    return `cargo_${from}_${to}_${period}`
  }

  // When filters change, invalidate cache — must run BEFORE the fetch effect
  useEffect(() => {
    loadedRef.current = {}
    setTrends(null)
    setSeasonality(null)
    setByCargo(null)
  }, [period, from, to]) // eslint-disable-line

  useEffect(() => {
    if (tab === 3) return // marketplace tab reads localStorage, no fetch
    const key = cacheKey()
    if (loadedRef.current[key]) return
    fetchData(key)
  }, [tab, period, from, to]) // eslint-disable-line

  async function fetchData(key) {
    setLoading(true)
    try {
      if (tab === 0) {
        const d = await insightsApi.trends(period)
        setTrends(d)
      } else if (tab === 1) {
        const d = await insightsApi.seasonality(from, to)
        setSeasonality(d)
      } else if (tab === 2) {
        const d = await insightsApi.byCargo(from, to, 'FTL', period)
        setByCargo(d)
      }
      loadedRef.current[key] = true
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Инсайты</div>
        <div className="page-subtitle">Аналитика рынка: тренды, сезонность, типы грузов, маркетплейс</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: 16 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '10px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
            background: 'none', fontFamily: 'inherit',
            borderBottom: `2px solid ${tab === i ? '#2563EB' : 'transparent'}`,
            color: tab === i ? '#2563EB' : '#64748B', marginBottom: -1, transition: 'color 0.12s',
          }}>{t}</button>
        ))}
      </div>

      {/* Filters (only for tabs 0-2) */}
      {tab !== 3 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          {tab !== 0 && (
            <>
              <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={from} onChange={e => setFrom(e.target.value)}>
                {CITIES_FROM.map(c => <option key={c}>{c}</option>)}
              </select>
              <span style={{ color: '#94A3B8', fontSize: 13 }}>→</span>
              <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={to} onChange={e => setTo(e.target.value)}>
                {CITIES_TO.map(c => <option key={c}>{c}</option>)}
              </select>
            </>
          )}
          {tab !== 1 && (
            <select className="form-select" style={{ width: 'auto' }} value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="7D">7 дней</option>
              <option value="30D">30 дней</option>
              <option value="90D">90 дней</option>
            </select>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="insights-grid">
          <div className="card"><div className="skeleton" style={{ height: 150, borderRadius: 6 }} /></div>
          <div className="card"><div className="skeleton" style={{ height: 150, borderRadius: 6 }} /></div>
        </div>
      )}

      {/* Content — show even while loading so previous data stays visible */}
      {tab === 0 && trends      && <TrendsTab      data={trends} />}
      {tab === 1 && seasonality && <SeasonalityTab data={seasonality} />}
      {tab === 2 && byCargo     && <CargoTab       data={byCargo} />}
      {tab === 3                && <MarketplaceTab />}

      {/* Empty state (not loading, no data, not marketplace tab) */}
      {!loading && tab !== 3 && !trends && !seasonality && !byCargo && tab < 3 && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: '#94A3B8', fontSize: 13 }}>
          Нет данных по выбранным параметрам
        </div>
      )}

      {/* Pro upsell */}
      <div style={{ marginTop: 16, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>Разблокируйте полную аналитику с Pro</div>
          <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>90 дней истории · Все маршруты · Экспорт данных · API</div>
        </div>
        <a href="/subscription" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" style={{ flexShrink: 0 }}>Попробовать Pro →</button>
        </a>
      </div>
    </div>
  )
}
