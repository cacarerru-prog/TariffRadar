import { useState, useEffect } from 'react'
import { dealsApi } from '../api/deals'
import { useToast } from '../components/ui/Toast'

const CITIES_FROM = ['Минск, Беларусь', 'Брест, Беларусь', 'Гродно, Беларусь', 'Витебск, Беларусь', 'Гомель, Беларусь']
const CITIES_TO   = ['Москва, Россия', 'Санкт-Петербург, Россия', 'Казань, Россия', 'Смоленск, Россия', 'Новосибирск, Россия', 'Екатеринбург, Россия', 'Тверь, Россия', 'Тула, Россия', 'Калуга, Россия']
const CARGOS      = ['FMCG', 'Металл', 'Одежда', 'Продукты', 'Химия', 'Стройматериалы', 'Мебель']
const TRUCKS      = ['Фура 20т', 'Фура 10т', 'Рефрижератор 20т', 'Тентованный 20т']
const CURRENCIES  = ['EUR', 'USD', 'BYN', 'RUB']

const empty = {
  from: CITIES_FROM[0], to: CITIES_TO[0], type: 'FTL',
  date: '', cargo: CARGOS[0], truck: TRUCKS[0],
  price: '', currency: 'EUR', comment: '',
}

export function AddDataPage() {
  const toast = useToast()
  const [form,    setForm]    = useState(empty)
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function set(k) {
    return e => {
      setForm(f => ({ ...f, [k]: e.target.value }))
      setErrors(er => ({ ...er, [k]: '' }))
      setSuccess(false)
    }
  }

  function validate() {
    const errs = {}
    if (!form.price || +form.price <= 0) errs.price = 'Цена должна быть больше 0'
    if (!form.date) {
      errs.date = 'Укажите дату'
    } else {
      const d = new Date(form.date)
      const now = new Date()
      if (d > now)
        errs.date = 'Дата не может быть в будущем'
      else if (d < new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()))
        errs.date = 'Дата не может быть старше 1 года'
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await dealsApi.create({
        from: form.from, to: form.to, type: form.type,
        date: form.date, cargo: form.cargo, truck: form.truck,
        price: +form.price, currency: form.currency,
        comment: form.comment,
      })
      setSuccess(true)
      setForm(empty)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(false), 4000)
    return () => clearTimeout(t)
  }, [success])

  const maxDate = new Date().toISOString().split('T')[0]
  const minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Добавить данные</div>
        <div className="page-subtitle">Внесите информацию о выполненной перевозке</div>
      </div>

      {success && (
        <div className="info-banner" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#166534', marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 8l4 4 6-6"/></svg>
          <div><strong>Сделка добавлена!</strong> Данные учтены в рыночной статистике. Спасибо за вклад.</div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Параметры перевозки</div>

        <form onSubmit={handleSubmit}>
          {/* Route */}
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
              <label className="form-label">Дата перевозки</label>
              <input className={`form-input${errors.date ? ' error' : ''}`} type="date"
                value={form.date} onChange={set('date')}
                min={minDate} max={maxDate}
                style={{ width: 160 }} />
              {errors.date && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 3 }}>{errors.date}</div>}
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

          {/* Price */}
          <div className="form-row" style={{ alignItems: 'flex-start' }}>
            <div className="form-group">
              <label className="form-label">Цена</label>
              <div style={{ display: 'flex' }}>
                <input className={`form-input${errors.price ? ' error' : ''}`} type="number"
                  value={form.price} onChange={set('price')}
                  placeholder="1 450" min="1" step="0.01"
                  style={{ borderRadius: '6px 0 0 6px', borderRight: 0, width: 130 }} />
                <select value={form.currency} onChange={set('currency')}
                  style={{ height: 36, padding: '0 8px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderLeft: 0, borderRadius: '0 6px 6px 0', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {errors.price && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 3 }}>{errors.price}</div>}
            </div>
          </div>

          {/* Comment */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Комментарий <span style={{ color: '#94A3B8', fontWeight: 400 }}>(необязательно)</span></label>
            <textarea className="form-input" value={form.comment} onChange={set('comment')} rows={3}
              placeholder="Дополнительные условия, особенности маршрута..."
              style={{ resize: 'vertical', minHeight: 72, height: 'auto', width: '100%' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: 160 }}>
              {loading ? 'Сохраняем…' : 'Добавить сделку'}
            </button>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>
              Данные публикуются анонимно и используются для статистики
            </div>
          </div>
        </form>
      </div>

      {/* How it works */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Как это работает</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { n: '1', title: 'Внесите данные', text: 'Добавьте информацию о реально выполненной перевозке' },
            { n: '2', title: 'Анонимизация',   text: 'Данные обезличиваются и агрегируются с другими сделками' },
            { n: '3', title: 'Общая польза',   text: 'Все участники получают доступ к актуальной рыночной статистике' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
