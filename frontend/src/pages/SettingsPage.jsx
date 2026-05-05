import { useState } from 'react'
import { authApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { useNavigate } from 'react-router-dom'

const SECTIONS = [
  { id: 'profile',       label: 'Профиль',          icon: 'M8 8a4 4 0 100-8 4 4 0 000 8zM2 20c0-4 2.7-7.3 6-8' },
  { id: 'appearance',    label: 'Внешний вид',       icon: 'M12 2a10 10 0 110 20A10 10 0 0112 2zm0 0v20M2 12h20' },
  { id: 'notifications', label: 'Уведомления',       icon: 'M8 2a5 5 0 015 5v2l1 2H2l1-2V7a5 5 0 015-5zM6.5 13a1.5 1.5 0 003 0' },
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
          {section === 'api'           && <ApiSection toast={toast} user={user} />}
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

const NOTIF_KEY = 'tr_notifications'
const NOTIF_DEFAULTS = { rate_alerts: true, weekly_digest: true, market_news: false, deal_updates: true }

function NotificationsSection({ toast }) {
  const [settings, setSettings] = useState(() => {
    try { return { ...NOTIF_DEFAULTS, ...JSON.parse(localStorage.getItem(NOTIF_KEY)) } }
    catch { return NOTIF_DEFAULTS }
  })

  function toggle(k) {
    const updated = { ...settings, [k]: !settings[k] }
    setSettings(updated)
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated))
    toast(`${updated[k] ? 'Включено' : 'Отключено'}: ${k.replace(/_/g, ' ')}`)
  }

  const items = [
    { k: 'rate_alerts',    label: 'Алерты по ставкам',       desc: 'Уведомления при изменении ставки более чем на 5%' },
    { k: 'weekly_digest',  label: 'Еженедельный дайджест',    desc: 'Сводка изменений по вашим маршрутам' },
    { k: 'market_news',    label: 'Новости рынка',            desc: 'Аналитические статьи и обзоры' },
    { k: 'deal_updates',   label: 'Обновления по сделкам',    desc: 'Статус добавленных вами данных' },
  ]

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

function ApiSection({ toast, user }) {
  const [copied, setCopied] = useState(false)
  const key = user?.api_key || 'tr_live_xxxxxxxxxxxxxxxxxxxx'

  function copyKey() {
    navigator.clipboard.writeText(key).catch(() => {})
    setCopied(true)
    toast('Ключ скопирован')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card">
      <div className="card-title">API-ключи</div>
      <div className="info-banner" style={{ marginBottom: 16 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>
        <div>API доступен только на тарифе <strong>Pro</strong>. Используйте ключ для интеграции с внешними системами.</div>
      </div>
      <div className="form-group">
        <label className="form-label">Ваш API-ключ</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" type="text" value={key} readOnly
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, background: '#F8FAFC' }} />
          <button className="btn-secondary" onClick={copyKey} style={{ flexShrink: 0 }}>
            {copied ? '✓ Скопирован' : 'Копировать'}
          </button>
        </div>
      </div>
      <div style={{ marginTop: 16, padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Пример запроса</div>
        <pre style={{ fontSize: 11, color: '#64748B', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`GET /api/v1/market/stats?from=Минск&to=Москва&type=FTL
Authorization: Bearer ${key}`}
        </pre>
      </div>
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
