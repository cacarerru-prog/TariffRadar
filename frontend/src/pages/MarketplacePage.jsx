import { useState, useEffect } from 'react'
import { marketplaceApi } from '../api/marketplace'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'

const CITIES_FROM = ['', 'Минск, Беларусь', 'Брест, Беларусь', 'Гродно, Беларусь', 'Витебск, Беларусь', 'Гомель, Беларусь']
const CITIES_TO   = ['', 'Москва, Россия', 'Санкт-Петербург, Россия', 'Казань, Россия', 'Смоленск, Россия', 'Новосибирск, Россия', 'Екатеринбург, Россия', 'Тверь, Россия']
const CARGOS      = ['FMCG', 'Металл', 'Одежда', 'Продукты', 'Химия', 'Стройматериалы', 'Мебель']
const TRUCKS      = ['Фура 20т', 'Фура 10т', 'Рефрижератор 20т', 'Тентованный 20т']
const CURRENCIES  = ['EUR', 'USD', 'BYN', 'RUB']
const TABS = ['Доступные грузы', 'Разместить груз', 'Рейтинг перевозчиков']

const CARRIER_RATINGS = [
  { name: 'АвтоМаг Груп',   rating: 4.9, deals: 312, routes: 'МНС→МСК, МНС→СПБ', badge: 'Топ перевозчик', phone: '+375 29 100-20-30' },
  { name: 'БелТрансСервис', rating: 4.7, deals: 198, routes: 'МНС→КЗН, БРС→МСК', badge: '',               phone: '+375 44 200-30-40' },
  { name: 'ЕврологТранс',   rating: 4.6, deals: 156, routes: 'ГРО→МСК, МНС→СМЛ', badge: '',               phone: '+375 17 300-40-50' },
  { name: 'ФастКарго',      rating: 4.5, deals: 134, routes: 'ВТБ→ЕКТ, МНС→МСК', badge: 'Быстрый отклик', phone: '+375 29 400-50-60' },
  { name: 'МинскЛогистик',  rating: 4.4, deals:  89, routes: 'МНС→НВС, МНС→ТВР', badge: '',               phone: '+375 44 500-60-70' },
]

// ── Contact Modal ─────────────────────────────────────────────────────────────
function ContactModal({ load, onClose }) {
  const [copied, setCopied] = useState(false)

  function copyContact() {
    navigator.clipboard.writeText(load.contact).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const bmDown   = load.benchmark < 0
  const initials = (load.company || 'К').replace(/[^А-ЯA-Z]/gi, '').slice(0, 2).toUpperCase() || (load.company || 'К').slice(0, 2).toUpperCase()

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
      onClick={onClose}>
      <div className="card" style={{ maxWidth: 460, width: '100%', padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>{load.company}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Грузовладелец · Объявление #{load.id}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 6, borderRadius: 6 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l12 12M15 3L3 15"/></svg>
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{load.from} → {load.to}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`badge ${load.type === 'FTL' ? 'badge-blue' : 'badge-gray'}`}>{load.type}</span>
              <span style={{ fontSize: 12, color: '#64748B' }}>{load.cargo}</span>
              <span style={{ fontSize: 12, color: '#64748B' }}>·</span>
              <span style={{ fontSize: 12, color: '#64748B' }}>{load.weight}</span>
              <span style={{ fontSize: 12, color: '#64748B' }}>·</span>
              <span style={{ fontSize: 12, color: '#64748B' }}>{load.truck}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Дата загрузки', value: load.date },
              { label: 'Ставка',        value: `${(load.price || 0).toLocaleString('ru')} ${load.currency}` },
              { label: 'Vs рынок',      value: load.benchmark != null ? `${load.benchmark > 0 ? '+' : ''}${load.benchmark}%` : '—', color: bmDown ? '#16A34A' : '#DC2626' },
              { label: 'Статус',        value: load.status === 'open' ? 'Свободен' : 'Занят', color: load.status === 'open' ? '#16A34A' : '#94A3B8' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 3, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: color || '#0F172A' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px', marginBottom: load.comment ? 12 : 16 }}>
            <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>КОНТАКТ</div>
            <a href={`tel:${load.contact}`} style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', textDecoration: 'none', display: 'block', marginBottom: 2 }}>
              {load.contact}
            </a>
            <div style={{ fontSize: 12, color: '#16A34A' }}>Нажмите чтобы позвонить</div>
          </div>

          {load.comment && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, marginBottom: 3 }}>ПРИМЕЧАНИЕ</div>
              <div style={{ fontSize: 13, color: '#78350F' }}>{load.comment}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={copyContact}>
              {copied
                ? <><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7l4 4 6-6"/></svg> Скопировано</>
                : '📋 Скопировать контакт'}
            </button>
            <button className="btn-secondary" onClick={onClose}>Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ val }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill={i <= Math.round(val) ? '#F59E0B' : '#E2E8F0'}>
          <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.2.53 3.09L6 7.98l-2.78 1.51.53-3.09L1.5 4.2l3.15-.47L6 1z"/>
        </svg>
      ))}
      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginLeft: 4 }}>{val}</span>
    </span>
  )
}

// ── Loads tab ─────────────────────────────────────────────────────────────────
function LoadsTab({ loads, currentUserId, onStatusChange, onContact, loading }) {
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterStatus, setFilterStatus] = useState('open')

  const filtered = loads.filter(l =>
    (!filterFrom   || l.from   === filterFrom) &&
    (!filterTo     || l.to     === filterTo) &&
    (!filterType   || l.type   === filterType) &&
    (!filterStatus || l.status === filterStatus)
  )

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 150 }}>
            <label className="form-label">Откуда</label>
            <select className="form-select" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}>
              {CITIES_FROM.map(c => <option key={c} value={c}>{c || 'Все'}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 165 }}>
            <label className="form-label">Куда</label>
            <select className="form-select" value={filterTo} onChange={e => setFilterTo(e.target.value)}>
              {CITIES_TO.map(c => <option key={c} value={c}>{c || 'Все'}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Тип</label>
            <select className="form-select" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">FTL + LTL</option>
              <option value="FTL">FTL</option>
              <option value="LTL">LTL</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Статус</label>
            <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Все</option>
              <option value="open">Свободные</option>
              <option value="taken">Занятые</option>
            </select>
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>
            Найдено: <strong>{filtered.length}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: '45%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 10, width: '65%' }} />
              </div>
              <div><div className="skeleton" style={{ height: 24, width: 120 }} /></div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: 13 }}>
              Нет объявлений по выбранным фильтрам
            </div>
          ) : filtered.map(load => {
            const bmDown     = load.benchmark != null && load.benchmark < 0
            const isTaken    = load.status === 'taken'
            const isMine     = currentUserId != null && load.user_id === currentUserId

            return (
              <div key={load.id} className="card" style={{ opacity: isTaken ? 0.75 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{load.from} → {load.to}</span>
                      <span className={`badge ${load.type === 'FTL' ? 'badge-blue' : 'badge-gray'}`}>{load.type}</span>
                      {isMine && <span className="badge badge-green">Ваше объявление</span>}
                      {isTaken && <span style={{ fontSize: 11, fontWeight: 600, background: '#F1F5F9', color: '#94A3B8', padding: '2px 8px', borderRadius: 10 }}>Занято</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748B', flexWrap: 'wrap' }}>
                      <span>📦 {load.cargo}</span>
                      <span>⚖️ {load.weight}</span>
                      <span>🚛 {load.truck}</span>
                      <span>📅 {load.date}</span>
                      <span>🏢 {load.company}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>
                      {(load.price || 0).toLocaleString('ru')} {load.currency}
                    </div>
                    {load.benchmark != null && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: bmDown ? '#16A34A' : '#DC2626', marginTop: 2 }}>
                        {bmDown ? '▼' : '▲'} {load.benchmark > 0 ? '+' : ''}{load.benchmark}% к рынку
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className={isTaken ? 'btn-secondary' : 'btn-primary'}
                      disabled={isTaken}
                      onClick={() => !isTaken && onContact(load)}
                      style={{ fontSize: 13, minWidth: 110, opacity: isTaken ? 0.5 : 1, cursor: isTaken ? 'not-allowed' : 'pointer' }}>
                      {isTaken ? 'Занято' : '📞 Связаться'}
                    </button>
                    {isMine && (
                      <button className="btn-secondary" onClick={() => onStatusChange(load.id, load.status)}
                        style={{ fontSize: 12 }}>
                        {isTaken ? 'Открыть' : 'Закрыть'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Post load tab ─────────────────────────────────────────────────────────────
function PostLoadTab({ onAdd }) {
  const toast = useToast()
  const [form, setForm] = useState({
    from: 'Минск, Беларусь', to: 'Москва, Россия', type: 'FTL',
    date: '', cargo: CARGOS[0], truck: TRUCKS[0],
    weight: '', price: '', currency: 'EUR',
    company: '', contact: '', comment: '',
  })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  function set(k) {
    return e => {
      setForm(f => ({ ...f, [k]: e.target.value }))
      setErrors(er => ({ ...er, [k]: '' }))
    }
  }

  function validate() {
    const errs = {}
    if (!form.date)                      errs.date    = 'Укажите дату загрузки'
    if (!form.price || +form.price <= 0) errs.price   = 'Укажите ставку'
    if (!form.contact.trim())            errs.contact = 'Укажите контактные данные'
    if (!form.company.trim())            errs.company = 'Укажите название компании'
    if (!form.weight.trim())             errs.weight  = 'Укажите вес груза'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const newLoad = await marketplaceApi.create({
        from:     form.from,
        to:       form.to,
        type:     form.type,
        date:     form.date,
        cargo:    form.cargo,
        weight:   form.weight,
        truck:    form.truck,
        price:    +form.price,
        currency: form.currency,
        company:  form.company,
        contact:  form.contact,
        comment:  form.comment,
      })
      onAdd(newLoad)
      toast('Объявление размещено! Перевозчики видят его в ленте.', 'success')
      setForm({ from: 'Минск, Беларусь', to: 'Москва, Россия', type: 'FTL', date: '', cargo: CARGOS[0], truck: TRUCKS[0], weight: '', price: '', currency: 'EUR', company: '', contact: '', comment: '' })
      setErrors({})
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const maxDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const minDate = new Date().toISOString().split('T')[0]

  const ErrMsg = ({ k }) => errors[k]
    ? <div style={{ fontSize: 11, color: '#DC2626', marginTop: 3 }}>{errors[k]}</div>
    : null

  return (
    <div className="card">
      <div className="card-title">Разместить груз</div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Откуда</label>
            <select className="form-select" value={form.from} onChange={set('from')}>
              {CITIES_FROM.filter(Boolean).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Куда</label>
            <select className="form-select" value={form.to} onChange={set('to')}>
              {CITIES_TO.filter(Boolean).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Тип перевозки</label>
            <select className="form-select" style={{ width: 'auto', minWidth: 180 }} value={form.type} onChange={set('type')}>
              <option value="FTL">FTL (полная фура)</option>
              <option value="LTL">LTL (сборный груз)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Дата загрузки</label>
            <input className={`form-input${errors.date ? ' error' : ''}`} type="date"
              value={form.date} onChange={set('date')} min={minDate} max={maxDate}
              style={{ width: 160 }} />
            <ErrMsg k="date" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Тип груза</label>
            <select className="form-select" value={form.cargo} onChange={set('cargo')}>
              {CARGOS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Тип транспорта</label>
            <select className="form-select" value={form.truck} onChange={set('truck')}>
              {TRUCKS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Вес груза</label>
            <input className={`form-input${errors.weight ? ' error' : ''}`} type="text"
              value={form.weight} onChange={set('weight')} placeholder="20т" style={{ width: 120 }} />
            <ErrMsg k="weight" />
          </div>
          <div className="form-group">
            <label className="form-label">Ставка</label>
            <div style={{ display: 'flex' }}>
              <input className={`form-input${errors.price ? ' error' : ''}`} type="number"
                value={form.price} onChange={set('price')} placeholder="1 450" min="1" step="0.01"
                style={{ borderRadius: '6px 0 0 6px', borderRight: 0, width: 130 }} />
              <select value={form.currency} onChange={set('currency')}
                style={{ height: 36, padding: '0 8px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderLeft: 0, borderRadius: '0 6px 6px 0', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <ErrMsg k="price" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Название компании</label>
            <input className={`form-input${errors.company ? ' error' : ''}`} type="text"
              value={form.company} onChange={set('company')} placeholder="ООО ВашаКомпания" />
            <ErrMsg k="company" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Контакт (телефон / email)</label>
            <input className={`form-input${errors.contact ? ' error' : ''}`} type="text"
              value={form.contact} onChange={set('contact')} placeholder="+375 29 000-00-00" />
            <ErrMsg k="contact" />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Комментарий <span style={{ color: '#94A3B8', fontWeight: 400 }}>(необязательно)</span></label>
          <textarea className="form-input" value={form.comment} onChange={set('comment')} rows={2}
            placeholder="Особые требования, условия погрузки, температурный режим..."
            style={{ resize: 'vertical', minHeight: 60, height: 'auto', width: '100%' }} />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: 200 }}>
          {loading ? 'Сохраняем…' : '✓ Разместить объявление'}
        </button>
      </form>
    </div>
  )
}

// ── Carriers tab ──────────────────────────────────────────────────────────────
function CarriersTab({ onContact }) {
  return (
    <div className="card">
      <div className="card-title">Рейтинг перевозчиков</div>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
        Рейтинг основан на отзывах грузовладельцев и своевременности выполнения заказов
      </div>
      {CARRIER_RATINGS.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < CARRIER_RATINGS.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: i < 3 ? '#EFF6FF' : '#F8FAFC', color: i < 3 ? '#2563EB' : '#94A3B8', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{c.name}</span>
              {c.badge && <span className="badge badge-blue" style={{ fontSize: 10 }}>{c.badge}</span>}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{c.routes}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <StarRating val={c.rating} />
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{c.deals} сделок</div>
          </div>
          <button className="btn-secondary" style={{ fontSize: 12, flexShrink: 0 }}
            onClick={() => onContact({ id: `c${i}`, company: c.name, contact: c.phone, from: '—', to: '—', type: '—', cargo: '—', weight: '—', truck: '—', date: '—', price: 0, currency: 'EUR', status: 'open', comment: `Перевозчик. Маршруты: ${c.routes}`, benchmark: null })}>
            📞 Связаться
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function MarketplacePage() {
  const toast = useToast()
  const { user } = useAuth()
  const [loads,       setLoads]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState(0)
  const [contactLoad, setContactLoad] = useState(null)

  useEffect(() => {
    marketplaceApi.list()
      .then(res => setLoads(res.data || []))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  function addLoad(newLoad) {
    setLoads(prev => [newLoad, ...prev])
    setTab(0)
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'open' ? 'taken' : 'open'
    try {
      await marketplaceApi.updateStatus(id, newStatus)
      setLoads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const openLoads  = loads.filter(l => l.status === 'open').length
  const takenLoads = loads.filter(l => l.status === 'taken').length
  const userLoads  = user ? loads.filter(l => l.user_id === user.id).length : 0
  const avgPrice   = loads.length
    ? Math.round(loads.reduce((s, l) => s + (l.price || 0), 0) / loads.length)
    : 0

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Маркетплейс грузов</div>
        <div className="page-subtitle">Биржа грузоперевозок — находите грузы и перевозчиков</div>
      </div>

      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Открытых объявлений</div>
          <div className="stat-value">{loading ? '…' : openLoads}</div>
          <div className="stat-sub">прямо сейчас</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Закрытых сделок</div>
          <div className="stat-value">{loading ? '…' : takenLoads}</div>
          <div className="stat-sub">за всё время</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ваших объявлений</div>
          <div className="stat-value">{userLoads}</div>
          <div className="stat-sub">размещено вами</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Средняя ставка</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{loading ? '…' : `${avgPrice.toLocaleString('ru')} `}<span>EUR</span></div>
          <div className="stat-sub">по всем объявлениям</div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: 16 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '10px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
            background: 'none', fontFamily: 'inherit',
            borderBottom: `2px solid ${tab === i ? '#2563EB' : 'transparent'}`,
            color: tab === i ? '#2563EB' : '#64748B', marginBottom: -1, transition: 'color 0.12s',
          }}>
            {t}
            {i === 0 && openLoads > 0 && (
              <span style={{ marginLeft: 6, background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
                {openLoads}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 0 && <LoadsTab loads={loads} currentUserId={user?.id ?? null} onStatusChange={toggleStatus} onContact={setContactLoad} loading={loading} />}
      {tab === 1 && <PostLoadTab onAdd={addLoad} />}
      {tab === 2 && <CarriersTab onContact={setContactLoad} />}

      {contactLoad && <ContactModal load={contactLoad} onClose={() => setContactLoad(null)} />}
    </div>
  )
}
