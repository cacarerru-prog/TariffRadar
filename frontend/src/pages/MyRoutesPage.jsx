import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { myRoutesApi } from '../api/myRoutes'
import { useToast } from '../components/ui/Toast'

export function MyRoutesPage() {
  const navigate  = useNavigate()
  const toast     = useToast()
  const [routes,   setRoutes]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    myRoutesApi.list()
      .then(d => setRoutes(d.routes || d.data || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  async function handleDelete(id) {
    if (!window.confirm('Удалить маршрут?')) return
    setDeleting(id)
    try {
      await myRoutesApi.remove(id)
      setRoutes(rs => rs.filter(r => r.id !== id))
      toast('Маршрут удалён')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDeleting(null)
    }
  }

  function goToBenchmark(r) {
    localStorage.setItem('benchmark_from', r.from ?? r.from_city ?? '')
    localStorage.setItem('benchmark_to',   r.to   ?? r.to_city   ?? '')
    localStorage.setItem('benchmark_type', r.type ?? r.cargo_type ?? 'FTL')
    navigate('/benchmark')
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Мои маршруты</div>
          <div className="page-subtitle">Отслеживайте ставки по сохранённым направлениям</div>
        </div>
        <button className="btn-primary" onClick={() => navigate('/search')}>+ Добавить маршрут</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 10, width: '25%' }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="skeleton" style={{ height: 22, width: 100, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 10, width: 70 }} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <div className="skeleton" style={{ height: 30, width: 80 }} />
                <div className="skeleton" style={{ height: 30, width: 70 }} />
              </div>
            </div>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
              <path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4z"/>
              <path d="M12 24h24M24 12v24"/>
            </svg>
            <div style={{ fontSize: 14, color: '#64748B', marginBottom: 6 }}>У вас нет сохранённых маршрутов</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Найдите маршрут и сохраните его для отслеживания</div>
          </div>
          <button className="btn-primary" onClick={() => navigate('/search')}>Найти маршрут</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Info banner */}
          <div className="info-banner" style={{ marginBottom: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>
            <div>Ставки обновляются ежедневно. Нажмите на маршрут чтобы просмотреть детальную аналитику.</div>
          </div>

          {routes.map(r => {
            const from   = r.from   ?? r.from_city ?? '—'
            const to     = r.to     ?? r.to_city   ?? '—'
            const type   = r.type   ?? r.cargo_type ?? 'FTL'
            const avg    = r.avg_price ?? r.avg ?? null
            const change = r.change_pct ?? null
            const isUp   = change !== null && change > 0

            return (
              <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'default' }}>
                {/* Route icon */}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 8h12M8 3l5 5-5 5"/>
                  </svg>
                </div>

                {/* Route info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', marginBottom: 3 }}>
                    {from} → {to}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="badge badge-blue">{type}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{r.name || 'Маршрут'}</span>
                  </div>
                </div>

                {/* Rate */}
                {avg !== null && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 20, color: '#0F172A', lineHeight: 1.2 }}>
                      {avg.toLocaleString('ru')} EUR
                    </div>
                    {change !== null && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: isUp ? '#DC2626' : '#16A34A', marginTop: 2 }}>
                        {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{change}% за 30д
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn-secondary btn-sm" onClick={() => goToBenchmark(r)}
                    style={{ fontSize: 12, padding: '0 10px', height: 30 }}>
                    Benchmark
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                    style={{ fontSize: 12, padding: '0 10px', height: 30, color: '#DC2626', borderColor: '#FECACA' }}>
                    {deleting === r.id ? '...' : 'Удалить'}
                  </button>
                </div>
              </div>
            )
          })}

          {/* Alert subscription hint */}
          <div style={{ marginTop: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"><path d="M8 2a5 5 0 015 5v2l1 2H2l1-2V7a5 5 0 015-5zM6.5 13a1.5 1.5 0 003 0"/></svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>Включите уведомления об изменении ставок</div>
                <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 1 }}>Получайте алерты когда ставка по маршруту меняется более чем на 5%</div>
              </div>
            </div>
            <button className="btn-primary" style={{ flexShrink: 0, fontSize: 12 }}
              onClick={() => navigate('/subscription')}>
              Pro →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
