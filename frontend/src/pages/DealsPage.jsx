import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dealsApi } from '../api/deals'
import { useToast } from '../components/ui/Toast'

const CITIES_FROM = ['', 'Минск, Беларусь', 'Брест, Беларусь', 'Гродно, Беларусь', 'Витебск, Беларусь']
const CITIES_TO   = ['', 'Москва, Россия', 'Санкт-Петербург, Россия', 'Казань, Россия', 'Смоленск, Россия', 'Новосибирск, Россия']

function SortIcon({ dir }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 3, verticalAlign: 'middle', gap: 1 }}>
      <svg width="8" height="5" viewBox="0 0 8 5" fill={dir === 'asc'  ? '#2563EB' : '#CBD5E1'}><path d="M4 0L8 5H0L4 0Z"/></svg>
      <svg width="8" height="5" viewBox="0 0 8 5" fill={dir === 'desc' ? '#2563EB' : '#CBD5E1'}><path d="M4 5L0 0H8L4 5Z"/></svg>
    </span>
  )
}

export function DealsPage() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [from,   setFrom]   = useState('')
  const [to,     setTo]     = useState('')
  const [type,   setType]   = useState('')
  const [period, setPeriod] = useState('30D')
  const [page,   setPage]   = useState(1)
  const [sortKey,  setSortKey]  = useState('date')
  const [sortDir,  setSortDir]  = useState('desc')
  const [deals,    setDeals]    = useState([])
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1, per_page: 20 })
  const [loading, setLoading] = useState(false)
  const [editRow,  setEditRow]  = useState(null)
  const [editForm, setEditForm] = useState({ price: '', comment: '' })

  async function load(p = page) {
    setLoading(true)
    try {
      const res = await dealsApi.list({ from, to, type, period, page: p, per_page: 20 })
      setDeals(res.data)
      setPagination(res.pagination)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1); load(1) }, [from, to, type, period]) // eslint-disable-line
  useEffect(() => { load(page) }, [page]) // eslint-disable-line

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function exportCSV() {
    const filterLabel = [from, to, type, period].filter(Boolean).join('_').replace(/[^а-яА-ЯёЁa-zA-Z0-9]/g, '-')
    const header = 'Дата,Маршрут,Тип груза,Тип ТС,Цена EUR\n'
    const rows = sortedDeals.map(r =>
      [r.date, `"${r.route}"`, r.cargo, r.truck, r.price].join(',')
    ).join('\n')
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `tariffradar_${filterLabel || 'all'}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function saveEdit() {
    if (!editRow || +editForm.price <= 0) { toast('Цена должна быть > 0', 'error'); return }
    try {
      await dealsApi.update(editRow.id, { price: +editForm.price, comment: editForm.comment })
      toast('Сделка обновлена', 'success')
      setEditRow(null)
      load(page)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Удалить сделку?')) return
    try {
      await dealsApi.remove(id)
      toast('Сделка удалена', 'success')
      load(page)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const sortedDeals = [...deals].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey]
    if (sortKey === 'price') { va = +va; vb = +vb }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ?  1 : -1
    return 0
  })

  const Th = ({ col, label, align = 'left' }) => (
    <th onClick={() => handleSort(col)}
      style={{ textAlign: align, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        {label}<SortIcon dir={sortKey === col ? sortDir : null} />
      </span>
    </th>
  )

  const totalPages = pagination.total_pages || 1

  function renderPages() {
    const pages = []
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('…')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
      if (page < totalPages - 2) pages.push('…')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">История сделок</div>
          <div className="page-subtitle">Анонимные данные о реальных ставках</div>
        </div>
        <button className="btn-primary" onClick={() => navigate('/add-data')}>+ Добавить</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 150 }}>
            <label className="form-label">Откуда</label>
            <select className="form-select" value={from} onChange={e => setFrom(e.target.value)}>
              {CITIES_FROM.map(c => <option key={c} value={c}>{c || 'Все города'}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label className="form-label">Куда</label>
            <select className="form-select" value={to} onChange={e => setTo(e.target.value)}>
              {CITIES_TO.map(c => <option key={c} value={c}>{c || 'Все направления'}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Тип</label>
            <select className="form-select" style={{ width: 'auto' }} value={type} onChange={e => setType(e.target.value)}>
              <option value="">FTL + LTL</option>
              <option value="FTL">FTL</option>
              <option value="LTL">LTL</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Период</label>
            <select className="form-select" style={{ width: 'auto' }} value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="7D">7 дней</option>
              <option value="30D">30 дней</option>
              <option value="90D">90 дней</option>
              <option value="1Y">1 год</option>
            </select>
          </div>
          <button className="btn-secondary" style={{ gap: 6 }} onClick={exportCSV}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2"/></svg>
            Экспорт CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '32px 0' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {[90,140,80,70,60].map((w,j) => <div key={j} className="skeleton" style={{ height: 11, width: w }} />)}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <Th col="date"  label="Дата" />
                    <Th col="route" label="Маршрут" />
                    <th>Тип груза</th>
                    <th>Тип ТС</th>
                    <Th col="price" label="Цена, EUR" align="right" />
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDeals.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0' }}>
                        Нет данных по выбранным фильтрам
                      </td>
                    </tr>
                  )}
                  {sortedDeals.map(row =>
                    editRow?.id === row.id ? (
                      <tr key={row.id} style={{ background: '#F0F7FF' }}>
                        <td colSpan={4} style={{ color: '#64748B', fontSize: 12 }}>{row.date} · {row.route}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input className="form-input" type="number" value={editForm.price}
                            onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                            style={{ width: 90, textAlign: 'right' }} min="1" />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn-primary btn-sm" onClick={saveEdit}>✓</button>
                            <button className="btn-secondary btn-sm" onClick={() => setEditRow(null)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.id}>
                        <td style={{ color: '#64748B', fontSize: 12 }}>{row.date}</td>
                        <td style={{ fontWeight: 500 }}>{row.route}</td>
                        <td><span className="badge badge-blue">{row.cargo}</span></td>
                        <td style={{ color: '#64748B' }}>{row.truck}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.price?.toLocaleString('ru')}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn-secondary btn-sm"
                              onClick={() => { setEditRow(row); setEditForm({ price: row.price, comment: row.comment || '' }) }}
                              title="Редактировать">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z"/></svg>
                            </button>
                            <button className="btn-secondary btn-sm"
                              onClick={() => handleDelete(row.id)} title="Удалить"
                              style={{ color: '#DC2626', borderColor: '#FECACA' }}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 3h8M4 3V2h4v1M5 5v4M7 5v4M3 3l.5 7h5l.5-7"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                {renderPages().map((n, i) =>
                  n === '…'
                    ? <span key={`e${i}`} style={{ padding: '0 4px', color: '#94A3B8', fontSize: 13 }}>…</span>
                    : <button key={n} className={`page-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                )}
                <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Всего: {pagination.total?.toLocaleString('ru')} записей
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
