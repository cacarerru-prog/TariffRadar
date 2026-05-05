import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { marketApi } from '../api/market'
import { myRoutesApi } from '../api/myRoutes'
import { useToast } from '../components/ui/Toast'

const CITIES_FROM = ['Минск, Беларусь', 'Брест, Беларусь', 'Гродно, Беларусь', 'Витебск, Беларусь', 'Гомель, Беларусь']
const CITIES_TO   = ['Москва, Россия', 'Санкт-Петербург, Россия', 'Казань, Россия', 'Смоленск, Россия', 'Новосибирск, Россия', 'Екатеринбург, Россия', 'Тверь, Россия']

const POPULAR_ROUTES = [
  { from: 'Минск', to: 'Москва',          fromFull: 'Минск, Беларусь', toFull: 'Москва, Россия',          rate: 1450, deals: 124, delta: -2.0  },
  { from: 'Минск', to: 'Санкт-Петербург', fromFull: 'Минск, Беларусь', toFull: 'Санкт-Петербург, Россия', rate: 1690, deals:  48, delta: -6.2  },
  { from: 'Минск', to: 'Казань',          fromFull: 'Минск, Беларусь', toFull: 'Казань, Россия',           rate: 2150, deals:  31, delta: +12.1 },
  { from: 'Минск', to: 'Смоленск',        fromFull: 'Минск, Беларусь', toFull: 'Смоленск, Россия',         rate:  870, deals:  22, delta: -4.8  },
  { from: 'Брест', to: 'Москва',          fromFull: 'Брест, Беларусь', toFull: 'Москва, Россия',           rate: 1520, deals:  19, delta: +3.1  },
  { from: 'Минск', to: 'Екатеринбург',    fromFull: 'Минск, Беларусь', toFull: 'Екатеринбург, Россия',     rate: 2480, deals:  17, delta: +7.3  },
]

export function SearchPage() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [from,     setFrom]     = useState(CITIES_FROM[0])
  const [to,       setTo]       = useState(CITIES_TO[0])
  const [type,     setType]     = useState('FTL')
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(toOverride, fromOverride) {
    const targetFrom = fromOverride || from
    const targetTo   = toOverride   || to
    if (fromOverride) setFrom(fromOverride)
    if (toOverride)   setTo(toOverride)
    setLoading(true)
    setData(null)
    try {
      const result = await marketApi.stats(targetFrom, targetTo, type, '30D')
      setData(result)
      setSearched(true)
      setSaved(false)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function saveRoute() {
    const routeFrom = from
    const routeTo   = to
    setSaving(true)
    try {
      await myRoutesApi.add({ from: routeFrom, to: routeTo, type, name: `${routeFrom} → ${routeTo}` })
      setSaved(true)
      toast('Маршрут сохранён в "Мои маршруты"')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function goToBenchmark() {
    localStorage.setItem('benchmark_from', from)
    localStorage.setItem('benchmark_to',   to)
    localStorage.setItem('benchmark_type', type)
    navigate('/benchmark')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Поиск маршрута</div>
        <div className="page-subtitle">Найдите актуальные ставки по вашему направлению</div>
      </div>

      {/* Search form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Параметры маршрута</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
            <label className="form-label">Откуда</label>
            <select className="form-select" value={from} onChange={e => { setFrom(e.target.value); setSearched(false) }}>
              {CITIES_FROM.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
            <label className="form-label">Куда</label>
            <select className="form-select" value={to} onChange={e => { setTo(e.target.value); setSearched(false) }}>
              {CITIES_TO.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
            <label className="form-label">Тип перевозки</label>
            <select className="form-select" value={type} onChange={e => { setType(e.target.value); setSearched(false) }}>
              <option value="FTL">FTL</option>
              <option value="LTL">LTL</option>
            </select>
          </div>
          <button className="btn-primary" disabled={loading} onClick={() => handleSearch()}>
            {loading ? 'Поиск…' : 'Найти'}
          </button>
        </div>
      </div>

      {/* Popular routes */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
          Популярные маршруты — нажмите для быстрого поиска
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {POPULAR_ROUTES.map((r, i) => {
            const down    = r.delta < 0
            const active  = from === r.fromFull && to === r.toFull
            return (
              <button key={i}
                onClick={() => handleSearch(r.toFull, r.fromFull)}
                style={{
                  background: active ? '#EFF6FF' : '#fff',
                  border: `1px solid ${active ? '#2563EB' : '#E2E8F0'}`,
                  borderRadius: 8, padding: '12px 14px', minWidth: 170, flexShrink: 0,
                  cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
                  textAlign: 'left', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.1)'; e.currentTarget.style.borderColor = '#BFDBFE' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#E2E8F0' } }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? '#2563EB' : '#0F172A', marginBottom: 6 }}>
                  {r.from} → {r.to}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  {r.rate.toLocaleString('ru')} EUR
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{r.deals} сделок · 30 дней</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={down ? '#16A34A' : '#DC2626'} strokeWidth="1.5" strokeLinecap="round">
                    {down ? <path d="M5 1v8M1 5l4 4 4-4"/> : <path d="M5 9V1M1 5l4-4 4 4"/>}
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: down ? '#16A34A' : '#DC2626' }}>
                    {r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)}% за 7д
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="stats-row" style={{ marginBottom: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 10, width: '55%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 28, width: '70%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 9, width: '40%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {searched && data && !loading && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 10 }}>
            Результаты: <strong style={{ color: '#0F172A' }}>{from} → {to}</strong> · {type}
          </div>

          <div className="stats-row" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Средняя ставка</div>
              <div className="stat-value">{data.stats.avg.toLocaleString('ru')} <span>{data.stats.currency}</span></div>
              <div className="stat-sub">за рейс</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Диапазон</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {data.stats.min.toLocaleString('ru')}–{data.stats.max.toLocaleString('ru')}
              </div>
              <div className="stat-sub">{data.stats.currency}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Изменение 30д</div>
              <div className="stat-value" style={{ fontSize: 20, color: data.stats.change_pct <= 0 ? '#16A34A' : '#DC2626' }}>
                {data.stats.change_pct >= 0 ? '+' : ''}{data.stats.change_pct}%
              </div>
              <div className="stat-sub">{data.stats.change_abs >= 0 ? '+' : ''}{data.stats.change_abs} EUR</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Сделок</div>
              <div className="stat-value">{data.stats.deals_count.toLocaleString('ru')}</div>
              <div className="stat-sub">за 30 дней</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="card" style={{ flex: 1, minWidth: 200, cursor: 'pointer', textAlign: 'left', border: '1px solid #E2E8F0', background: '#fff' }}
              onClick={goToBenchmark}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="10" width="3" height="4" rx="0.5"/><rect x="6.5" y="6" width="3" height="8" rx="0.5"/><rect x="11" y="2" width="3" height="12" rx="0.5"/></svg>
                Сравнить свою ставку (Benchmark)
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Узнайте, переплачиваете ли вы</div>
            </button>
            <button className="card" style={{ flex: 1, minWidth: 200, cursor: saved ? 'default' : 'pointer', textAlign: 'left', border: `1px solid ${saved ? '#BBF7D0' : '#E2E8F0'}`, background: saved ? '#F0FDF4' : '#fff' }}
              onClick={saved ? undefined : saveRoute}
              disabled={saving}>
              <div style={{ fontSize: 13, fontWeight: 600, color: saved ? '#16A34A' : '#2563EB', display: 'flex', alignItems: 'center', gap: 6 }}>
                {saved
                  ? <><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7l4 4 6-6"/></svg> Маршрут сохранён</>
                  : <>{saving ? '…' : '★'} {saving ? 'Сохраняем…' : 'Сохранить маршрут'}</>}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                {saved ? 'Добавлен в "Мои маршруты"' : 'Добавить в "Мои маршруты" для отслеживания'}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* No results */}
      {searched && !data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: '#94A3B8', fontSize: 13 }}>
          Нет данных по маршруту {from} → {to} за последние 30 дней
        </div>
      )}
    </div>
  )
}
