import { useState, useEffect } from 'react'
import { authApi } from '../api/auth'
import { notificationsApi } from '../api/notifications'
import { apiKeysApi } from '../api/apiKeys'
import { webhooksApi } from '../api/webhooks'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { useNavigate } from 'react-router-dom'

const SECTIONS = [
  { id: 'profile',       label: 'Профиль',          icon: 'M8 8a4 4 0 100-8 4 4 0 000 8zM2 20c0-4 2.7-7.3 6-8' },
  { id: 'appearance',    label: 'Внешний вид',       icon: 'M12 2a10 10 0 110 20A10 10 0 0112 2zm0 0v20M2 12h20' },
  { id: 'notifications', label: 'Уведомления',       icon: 'M8 2a5 5 0 015 5v2l1 2H2l1-2V7a5 5 0 015-5zM6.5 13a1.5 1.5 0 003 0' },
  { id: 'webhooks',      label: 'Webhooks',          icon: 'M10 3v6m0 0l-3-3m3 3l3-3M5 13a5 5 0 1010 0' },
  { id: 'api',           label: 'API-ключи',         icon: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.778-7.778zm0 0L15.5 7.5' },
  { id: 'security',      label: 'Безопасность',      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
]

export function SettingsPage() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const toast    = useToast()
  const [section, setSection] = useState('profile')

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Настройки</div>
        <div className="page-subtitle">Управление профилем и аккаунтом</div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left nav */}
        <div className="card" style={{ width: 200, flexShrink: 0, padding: '8px 0' }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px',
              background: section === s.id ? '#EFF6FF' : 'transparent', border: 'none', cursor: 'pointer',
              color: section === s.id ? '#2563EB' : '#374151', fontSize: 13, fontWeight: section === s.id ? 600 : 400,
              fontFamily: 'inherit', borderLeft: section === s.id ? '3px solid #2563EB' : '3px solid transparent',
              textAlign: 'left', transition: 'all 0.12s',
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
              {s.label}
            </button>
          ))}
          <div style={{ borderTop: '1px solid #F1F5F9', margin: '8px 0' }} />
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#DC2626', fontSize: 13, fontWeight: 400, fontFamily: 'inherit',
            borderLeft: '3px solid transparent', textAlign: 'left',
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3h4v10h-4M7 11l4-3-4-3M1 8h9"/>
            </svg>
            Выйти
          </button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {section === 'profile'       && <ProfileSection user={user} onUpdate={updateUser} toast={toast} initials={initials} />}
          {section === 'appearance'    && <AppearanceSection toast={toast} />}
          {section === 'notifications' && <NotificationsSection toast={toast} />}
          {section === 'webhooks'      && <WebhooksSection toast={toast} />}
          {section === 'api'           && <ApiSection toast={toast} />}
          {section === 'security'      && <SecuritySection toast={toast} onLogout={handleLogout} />}
        </div>
      </div>
    </div>
  )
}

function ProfileSection({ user, onUpdate, toast, initials }) {
  const [form, setForm] = useState({
    name:    user?.name    || '',
    company: user?.company || '',
    phone:   user?.phone   || '',
  })
  const [loading, setLoading] = useState(false)

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const updated = await authApi.patchMe(form)
      onUpdate(updated)
      toast('Профиль обновлён')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title">Профиль</div>

      {/* Avatar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{user?.name || user?.email}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{user?.email}</div>
          <span style={{ marginTop: 4, display: 'inline-block' }} className={`badge ${user?.role === 'pro' ? 'badge-blue' : 'badge-gray'}`}>{user?.role || 'free'}</span>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={user?.email || ''} disabled
            style={{ background: '#F8FAFC', color: '#94A3B8' }} />
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Имя</label>
            <input className="form-input" type="text" value={form.name} onChange={set('name')} placeholder="Ваше имя" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Компания</label>
            <input className="form-input" type="text" value={form.company} onChange={set('company')} placeholder="Название компании" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Телефон</label>
          <input className="form-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+375 29 000-00-00" style={{ maxWidth: 240 }} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Сохраняем…' : 'Сохранить изменения'}
        </button>
      </form>
    </div>
  )
}

function AppearanceSection({ toast }) {
  const current = localStorage.getItem('tr_theme') || 'light'
  const [theme, setTheme] = useState(current)

  function applyTheme(t) {
    setTheme(t)
    localStorage.setItem('tr_theme', t)
    document.documentElement.setAttribute('data-theme', t)
    toast('Тема применена')
  }

  return (
    <div className="card">
      <div className="card-title">Внешний вид</div>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>Выберите цветовую схему интерфейса</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { val: 'light', label: 'Светлая', preview: '#F8FAFC' },
          { val: 'dark',  label: 'Тёмная',  preview: '#0F172A' },
        ].map(t => (
          <div key={t.val} onClick={() => applyTheme(t.val)} style={{
            border: `2px solid ${theme === t.val ? '#2563EB' : '#E2E8F0'}`,
            borderRadius: 10, padding: 12, cursor: 'pointer', minWidth: 140,
            background: theme === t.val ? '#EFF6FF' : '#fff', transition: 'all 0.15s',
          }}>
            <div style={{ width: '100%', height: 60, background: t.preview, borderRadius: 6, marginBottom: 8, border: '1px solid #E2E8F0' }} />
            <div style={{ fontSize: 13, fontWeight: theme === t.val ? 600 : 400, color: theme === t.val ? '#2563EB' : '#374151' }}>
              {t.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const NOTIF_DEFAULTS = { price_alerts: true, weekly_digest: true, benchmark_tips: false, new_deals: false }

function NotificationsSection({ toast }) {
  const [settings, setSettings] = useState(NOTIF_DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    notificationsApi.get()
      .then(data => { if (!cancelled) setSettings(data) })
      .catch(() => { if (!cancelled) toast('Не удалось загрузить настройки уведомлений') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function toggle(k) {
    const updated = { ...settings, [k]: !settings[k] }
    setSettings(updated)
    try {
      await notificationsApi.update(updated)
      toast(`${updated[k] ? 'Включено' : 'Отключено'}: ${k.replace(/_/g, ' ')}`)
    } catch {
      // Откат при ошибке.
      setSettings(settings)
      toast('Не удалось сохранить — попробуйте ещё раз')
    }
  }

  const items = [
    { k: 'price_alerts',   label: 'Алерты по ставкам',       desc: 'Уведомления при изменении ставки более чем на 5%' },
    { k: 'weekly_digest',  label: 'Еженедельный дайджест',    desc: 'Сводка изменений по вашим маршрутам' },
    { k: 'benchmark_tips', label: 'Подсказки бенчмарка',      desc: 'Рекомендации по оптимизации ставок' },
    { k: 'new_deals',      label: 'Новые сделки',             desc: 'Уведомления о появлении сделок по вашим маршрутам' },
  ]

  if (loading) {
    return <div className="card"><div className="card-title">Уведомления</div><div style={{ color: '#94A3B8', fontSize: 13 }}>Загрузка…</div></div>
  }

  return (
    <div className="card">
      <div className="card-title">Уведомления</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => (
          <div key={item.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < items.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.desc}</div>
            </div>
            <div onClick={() => toggle(item.k)} style={{
              width: 44, height: 24, borderRadius: 12, background: settings[item.k] ? '#2563EB' : '#E2E8F0',
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 2, left: settings[item.k] ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WebhooksSection({ toast }) {
  const [hooks, setHooks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm]       = useState({ url: '', from: '', to: '', type: '' })
  const [shownSecret, setShownSecret] = useState(null) // показывается ОДИН раз
  const [openDeliveries, setOpenDeliveries] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)

  useEffect(() => { reload() }, [])

  async function reload() {
    setLoading(true)
    try   { setHooks(await webhooksApi.list() || []) }
    catch (err) { toast(err.message || 'Не удалось загрузить webhooks', 'error') }
    finally { setLoading(false) }
  }

  async function create() {
    if (!form.url.trim()) { toast('Укажите URL', 'error'); return }
    setCreating(true)
    try {
      const filters = {}
      if (form.from) filters.from = form.from
      if (form.to)   filters.to   = form.to
      if (form.type) filters.type = form.type

      const h = await webhooksApi.create({ url: form.url.trim(), events: ['deal.created'], filters })
      setShownSecret({ url: h.url, secret: h.secret })
      setForm({ url: '', from: '', to: '', type: '' })
      await reload()
    } catch (err) {
      toast(err.message || 'Не удалось создать webhook', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function remove(id) {
    if (!confirm('Удалить webhook? Уведомления на этот URL больше не будут отправляться.')) return
    try {
      await webhooksApi.remove(id)
      toast('Webhook удалён')
      await reload()
    } catch (err) {
      toast(err.message || 'Не удалось удалить webhook', 'error')
    }
  }

  async function loadDeliveries(id) {
    if (openDeliveries === id) { setOpenDeliveries(null); return }
    setOpenDeliveries(id)
    setLoadingDeliveries(true)
    try {
      setDeliveries(await webhooksApi.deliveries(id) || [])
    } catch (err) {
      toast(err.message || 'Не удалось загрузить историю доставок', 'error')
      setDeliveries([])
    } finally {
      setLoadingDeliveries(false)
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text).catch(() => {})
    toast('Скопировано')
  }

  return (
    <div className="card">
      <div className="card-title">Webhooks</div>
      <div className="info-banner" style={{ marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>
        <div>Webhook'и доступны на тарифе <strong>Pro</strong>. При создании новой сделки на указанный URL уходит POST с HMAC-подписью.</div>
      </div>

      {shownSecret && (
        <div style={{ marginBottom: 16, padding: 14, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 8 }}>
            Сохраните секрет — он показывается только один раз
          </div>
          <div style={{ fontSize: 12, color: '#92400E', marginBottom: 6, fontFamily: 'monospace' }}>URL: {shownSecret.url}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value={shownSecret.secret} readOnly
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }} />
            <button className="btn-secondary" onClick={() => copy(shownSecret.secret)}>Копировать</button>
            <button className="btn-secondary" onClick={() => setShownSecret(null)}>Закрыть</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <input className="form-input" placeholder="URL (https://example.com/hook)"
          value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" placeholder="Откуда (опционально)" style={{ flex: 1 }}
            value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} />
          <input className="form-input" placeholder="Куда (опционально)" style={{ flex: 1 }}
            value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} />
          <select className="form-input" style={{ flex: 1 }}
            value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="">Любой тип</option>
            <option value="FTL">FTL</option>
            <option value="LTL">LTL</option>
          </select>
        </div>
        <button className="btn-primary" onClick={create} disabled={creating}>
          {creating ? 'Создаём…' : 'Создать webhook'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Загрузка…</div>
      ) : hooks.length === 0 ? (
        <div style={{ color: '#94A3B8', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
          Ещё нет ни одного webhook'а
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {hooks.map((h, i) => (
            <div key={h.id} style={{
              padding: '12px 0', borderBottom: i < hooks.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.url}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    События: {h.events?.join(', ')}
                    {h.filters && Object.keys(h.filters).length > 0 && (
                      <> · Фильтры: {Object.entries(h.filters).map(([k, v]) => `${k}=${v}`).join(', ')}</>
                    )}
                  </div>
                </div>
                <button className="btn-secondary" onClick={() => loadDeliveries(h.id)} style={{ flexShrink: 0 }}>
                  {openDeliveries === h.id ? 'Скрыть' : 'История'}
                </button>
                <button className="btn-secondary" onClick={() => remove(h.id)}
                  style={{ color: '#DC2626', borderColor: '#FECACA', flexShrink: 0 }}>Удалить</button>
              </div>
              {openDeliveries === h.id && (
                <div style={{ marginTop: 10, padding: 10, background: '#F8FAFC', borderRadius: 6, fontSize: 12 }}>
                  {loadingDeliveries ? (
                    <div style={{ color: '#94A3B8' }}>Загрузка…</div>
                  ) : deliveries.length === 0 ? (
                    <div style={{ color: '#94A3B8' }}>Доставок пока нет</div>
                  ) : (
                    deliveries.map(d => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B' }}>{d.delivered_at?.slice(0, 19).replace('T', ' ')}</span>
                        <span style={{
                          fontWeight: 600,
                          color: d.response_status >= 200 && d.response_status < 300 ? '#16A34A' :
                                 d.response_status === 0 ? '#94A3B8' : '#DC2626',
                        }}>
                          {d.response_status === 0 ? 'сетевая ошибка' : `HTTP ${d.response_status}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ApiSection({ toast }) {
  const [keys, setKeys]       = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [shownKey, setShownKey] = useState(null) // показывается ОДИН раз после создания

  useEffect(() => { reload() }, [])

  async function reload() {
    setLoading(true)
    try   { setKeys(await apiKeysApi.list() || []) }
    catch { toast('Не удалось загрузить API-ключи', 'error') }
    finally { setLoading(false) }
  }

  async function create() {
    if (!newName.trim()) { toast('Введите имя ключа', 'error'); return }
    setCreating(true)
    try {
      const k = await apiKeysApi.create(newName.trim())
      setShownKey(k.key) // показываем полный ключ один раз
      setNewName('')
      await reload()
    } catch (err) {
      toast(err.message || 'Не удалось создать ключ', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function remove(id) {
    if (!confirm('Удалить API-ключ? Все интеграции, использующие его, перестанут работать.')) return
    try {
      await apiKeysApi.remove(id)
      toast('Ключ удалён')
      await reload()
    } catch (err) {
      toast(err.message || 'Не удалось удалить ключ', 'error')
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text).catch(() => {})
    toast('Скопировано')
  }

  return (
    <div className="card">
      <div className="card-title">API-ключи</div>
      <div className="info-banner" style={{ marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>
        <div>API доступен на тарифе <strong>Pro</strong>. Используйте ключ для интеграции — в заголовке <code>Authorization: Bearer trk_live_…</code>.</div>
      </div>

      {shownKey && (
        <div style={{ marginBottom: 16, padding: 14, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 8 }}>
            Сохраните ключ — он показывается только один раз
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value={shownKey} readOnly
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }} />
            <button className="btn-secondary" onClick={() => copy(shownKey)}>Копировать</button>
            <button className="btn-secondary" onClick={() => setShownKey(null)}>Закрыть</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="form-input" placeholder="Название (например, «Production»)"
          value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1 }} />
        <button className="btn-primary" onClick={create} disabled={creating}>
          {creating ? 'Создаём…' : 'Создать ключ'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Загрузка…</div>
      ) : keys.length === 0 ? (
        <div style={{ color: '#94A3B8', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
          Ещё нет ни одного ключа
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {keys.map((k, i) => (
            <div key={k.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: i < keys.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{k.name}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontFamily: 'monospace' }}>
                  {k.prefix}…
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  Создан: {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at && ` • Последнее использование: ${new Date(k.last_used_at).toLocaleDateString()}`}
                </div>
              </div>
              <button className="btn-secondary" onClick={() => remove(k.id)}
                style={{ color: '#DC2626', borderColor: '#FECACA' }}>Удалить</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SecuritySection({ toast, onLogout }) {
  const [form, setForm]     = useState({ current_password: '', new_password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [show, setShow]     = useState({ cur: false, nw: false, conf: false })

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.new_password !== form.confirm)    { toast('Пароли не совпадают', 'error'); return }
    if (form.new_password.length < 8)          { toast('Пароль должен быть не короче 8 символов', 'error'); return }

    setLoading(true)
    try {
      await authApi.patchPassword(form.current_password, form.new_password)
      toast('Пароль успешно изменён')
      setForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { k: 'current_password', label: 'Текущий пароль',      ph: '••••••••',           sk: 'cur'  },
    { k: 'new_password',     label: 'Новый пароль',         ph: 'минимум 8 символов', sk: 'nw'   },
    { k: 'confirm',          label: 'Подтверждение пароля', ph: '••••••••',           sk: 'conf' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-title">Смена пароля</div>
        <form onSubmit={handleSubmit}>
          {fields.map(({ k, label, ph, sk }) => (
            <div className="form-group" key={k}>
              <label className="form-label">{label}</label>
              <div style={{ position: 'relative', maxWidth: 360 }}>
                <input className="form-input" type={show[sk] ? 'text' : 'password'}
                  value={form[k]} onChange={set(k)} placeholder={ph} required
                  style={{ paddingRight: 36, width: '100%' }} />
                <button type="button" onClick={() => setShow(s => ({ ...s, [sk]: !s[sk] }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
                  {show[sk]
                    ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z"/><circle cx="8" cy="8" r="1.5"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l12 12M6.5 6.6A3 3 0 0111.4 9.5M4 4.2C2.8 5.2 2 6.5 2 8s2.5 5 6 5a7 7 0 002.8-.6"/><path d="M6.5 3.2C7 3.1 7.5 3 8 3c3.5 0 6 5 6 5-.6 1-1.4 2-2.4 2.8"/></svg>
                  }
                </button>
              </div>
            </div>
          ))}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Меняем…' : 'Изменить пароль'}
          </button>
        </form>
      </div>

      <div className="card" style={{ border: '1px solid #FECACA' }}>
        <div className="card-title" style={{ color: '#DC2626' }}>Опасная зона</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>Выход из аккаунта</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Сессия будет завершена на этом устройстве</div>
          </div>
          <button className="btn-secondary" onClick={onLogout}
            style={{ color: '#DC2626', borderColor: '#FECACA', flexShrink: 0 }}>
            Выйти
          </button>
        </div>
      </div>
    </div>
  )
}
