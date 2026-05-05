import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { marketApi } from '../api/market'
import { Spinner } from '../components/ui/Spinner'
import { buildChartPaths } from '../utils/chartPaths'

const CITIES_FROM = ['Минск, Беларусь', 'Брест, Беларусь', 'Гродно, Беларусь', 'Витебск, Беларусь', 'Гомель, Беларусь']
const CITIES_TO   = ['Москва, Россия', 'Санкт-Петербург, Россия', 'Казань, Россия', 'Смоленск, Россия', 'Новосибирск, Россия', 'Екатеринбург, Россия', 'Тверь, Россия']
const PERIODS     = [{ code: '7D', label: '7Д' }, { code: '30D', label: '30Д' }, { code: '90D', label: '90Д' }, { code: '1Y', label: '1Г' }]

function SkeletonStatCard() {
  return (
    <div className="stat-card">
      <div className="skeleton" style={{ height: 10, width: '55%', marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 28, width: '70%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 9, width: '40%' }} />
    </div>
  )
}

function DashLineChart({ data, labels, currency }) {
  const W = 580, H = 160, PAD_B = 22
  const { line, area, pts, min, max } = buildChartPaths(data, W, H - PAD_B, 4, 8)
  const gridLevels = [0, 0.25, 0.5, 0.75, 1]
  const uid = Math.random().toString(36).slice(2, 7)
  const gradId = `g${uid}`
  const [tooltip, setTooltip] = useState(null)

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setTooltip(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {gridLevels.map(t => {
          const y = (8 + t * ((H - PAD_B) - 16)).toFixed(1)
          const val = Math.round(max - t * (max - min - 40))
          return (
            <g key={t}>
              <line x1={4} y1={y} x2={W - 4} y2={y} stroke="#F1F5F9" strokeWidth={1} />
              <text x={4} y={parseFloat(y) - 3} fontSize={9} fill="#CBD5E1">{val}</text>
            </g>
          )
        })}
        {data.map((v, i) => {
          if (i % Math.max(1, Math.floor(data.length / 6)) !== 0 && i !== data.length - 1) return null
          const x = (4 + (i / (data.length - 1)) * (W - 8)).toFixed(1)
          const label = labels?.[i] || ''
          if (!label) return null
          return (
            <g key={`xl-${i}`}>
              <line x1={x} y1={H - PAD_B} x2={x} y2={H - PAD_B + 4} stroke="#E2E8F0" strokeWidth={1} />
              <text x={x} y={H - 4} fontSize={9} fill="#94A3B8" textAnchor="middle">{label}</text>
            </g>
          )
        })}
        <line x1={4} y1={H - PAD_B} x2={W - 4} y2={H - PAD_B} stroke="#E2E8F0" strokeWidth={1} />
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <rect key={i}
            x={i === 0 ? 0 : (pts[i - 1].x + p.x) / 2}
            width={i === 0
              ? (pts[0].x + (pts[1]?.x || pts[0].x)) / 2
              : i === pts.length - 1
                ? W - (pts[i - 1].x + p.x) / 2
                : (p.x + (pts[i + 1]?.x || p.x)) / 2 - (pts[i - 1].x + p.x) / 2}
            y={0} height={H - PAD_B}
            fill="transparent"
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, val: data[i], label: labels?.[i] || '' })}
          />
        ))}
        {tooltip && (
          <circle cx={tooltip.x} cy={tooltip.y} r={4} fill="#2563EB" stroke="#fff" strokeWidth={2} style={{ pointerEvents: 'none' }} />
        )}
      </svg>
      {tooltip && (
        <div style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 10,
          left: `calc(${(tooltip.x / W * 100).toFixed(1)}% + 8px)`,
          top: `${tooltip.y / (H) * 100}%`,
          transform: tooltip.x / W > 0.75 ? 'translate(-110%, -50%)' : 'translateY(-50%)',
          background: '#0F172A', color: '#fff', borderRadius: 6, padding: '6px 10px',
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <div>{Number(tooltip.val).toLocaleString('ru')} {currency}</div>
          {tooltip.label && <div style={{ color: '#94A3B8', fontWeight: 400, marginTop: 1 }}>{tooltip.label}</div>}
        </div>
      )}
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const savedFilters = () => { try { return JSON.parse(localStorage.getItem('filters')) || {} } catch { return {} } }
  const [from,   setFrom]   = useState(savedFilters().from   || CITIES_FROM[0])
  const [to,     setTo]     = useState(savedFilters().to     || CITIES_TO[0])
  const [type,   setType]   = useState(savedFilters().type   || 'FTL')
  const [period, setPeriod] = useState(savedFilters().period || '30D')
  const [data,   setData]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]  = useState('')

  async function load(f = from, t = to, ty = type, p = period) {
    setLoading(true); setError('')
    try {
      const result = await marketApi.stats(f, t, ty, p)
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  function handleSearch() {
    localStorage.setItem('filters', JSON.stringify({ from, to, type, period }))
    load()
  }

  const chartData   = data?.series?.values || []
  const chartLabels = data?.series?.labels  || []
  const periodLabel = PERIODS.find(p => p.code === period)?.label || period

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Рынок грузоперевозок</div>
          <div className="page-subtitle">Актуальные ставки и аналитика по направлениям</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label className="form-label">Откуда</label>
            <select className="form-select" value={from} onChange={e => setFrom(e.target.value)}>
              {CITIES_FROM.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 180 }}>
            <label className="form-label">Куда</label>
            <select className="form-select" value={to} onChange={e => setTo(e.target.value)}>
              {CITIES_TO.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Тип</label>
            <select className="form-select" style={{ width: 'auto' }} value={type} onChange={e => setType(e.target.value)}>
              <option value="FTL">FTL</option>
              <option value="LTL">LTL</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Период</label>
            <div className="chart-tabs">
              {PERIODS.map(p => (
                <button key={p.code} className={`chart-tab${period === p.code ? ' active' : ''}`}
                  onClick={() => setPeriod(p.code)}>{p.label}</button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={handleSearch}>Обновить</button>
        </div>
      </div>

      {loading && (
        <div>
          <div className="stats-row">
            <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
          </div>
          <div className="card"><div className="skeleton" style={{ height: 160, borderRadius: 6 }} /></div>
        </div>
      )}

      {error && !loading && (
        <div className="info-banner warning">{error}</div>
      )}

      {data && !loading && (
        <>
          {/* KPI */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Средняя ставка</div>
              <div className="stat-value">{data.stats.avg.toLocaleString('ru')} <span>{data.stats.currency}</span></div>
              <div className="stat-sub">за рейс</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Диапазон цен</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{data.stats.min.toLocaleString('ru')}–{data.stats.max.toLocaleString('ru')}</div>
              <div className="stat-sub">{data.stats.currency}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Изменение за {periodLabel}</div>
              <div className="stat-value" style={{ color: data.stats.change_pct <= 0 ? '#16A34A' : '#DC2626', fontSize: 22 }}>
                {data.stats.change_pct >= 0 ? '+' : ''}{data.stats.change_pct}%
              </div>
              <div className="stat-sub">{data.stats.change_abs >= 0 ? '+' : ''}{data.stats.change_abs} {data.stats.currency}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Сделок за период</div>
              <div className="stat-value">{data.stats.deals_count.toLocaleString('ru')}</div>
              <div className="stat-sub">за {periodLabel}</div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="card-title" style={{ margin: 0 }}>Динамика средней ставки — {from} → {to}</span>
              </div>
              <DashLineChart data={chartData} labels={chartLabels} currency={data.stats.currency} />
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: 13 }}>
              Нет данных по выбранному маршруту за указанный период
            </div>
          )}

          {/* Saved routes hint */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="card-title" style={{ margin: 0 }}>Быстрые действия</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-outline" onClick={() => navigate('/benchmark')}
                style={{ flex: 1, minWidth: 180, justifyContent: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="10" width="3" height="4" rx="0.5"/><rect x="6.5" y="6" width="3" height="8" rx="0.5"/><rect x="11" y="2" width="3" height="12" rx="0.5"/></svg>
                Benchmark — сравнить ставку
              </button>
              <button className="btn-outline" onClick={() => navigate('/marketplace')}
                style={{ flex: 1, minWidth: 180, justifyContent: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2h1.5l1 5.5h7l1-4H5"/><circle cx="6.5" cy="13" r="1"/><circle cx="11.5" cy="13" r="1"/></svg>
                Маркетплейс грузов
              </button>
              <button className="btn-outline" onClick={() => navigate('/insights')}
                style={{ flex: 1, minWidth: 180, justifyContent: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l3.5-4 3 2.5 2.5-3.5L14 3"/></svg>
                Инсайты и тренды
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
