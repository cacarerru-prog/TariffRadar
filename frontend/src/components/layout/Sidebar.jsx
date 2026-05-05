import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  {
    to: '/', end: true, label: 'Главная',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7L8 2l6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z"/><path d="M6 14V9h4v5"/></svg>,
  },
  {
    to: '/search', label: 'Поиск маршрута',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>,
  },
  {
    to: '/benchmark', label: 'Benchmark',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="10" width="3" height="4" rx="0.5"/><rect x="6.5" y="6" width="3" height="8" rx="0.5"/><rect x="11" y="2" width="3" height="12" rx="0.5"/></svg>,
  },
  {
    to: '/deals', label: 'История сделок',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/></svg>,
  },
  {
    to: '/insights', label: 'Insights',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l3.5-4 3 2.5 2.5-3.5L14 3"/></svg>,
  },
  {
    to: '/marketplace', label: 'Маркетплейс',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2h1.5l1 5.5h7l1-4H5"/><circle cx="6.5" cy="13" r="1"/><circle cx="11.5" cy="13" r="1"/><path d="M1 2H2"/></svg>,
  },
  {
    to: '/my-routes', label: 'Мои маршруты',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1.5A4.5 4.5 0 0112.5 6c0 3.5-4.5 8.5-4.5 8.5S3.5 9.5 3.5 6A4.5 4.5 0 018 1.5z"/><circle cx="8" cy="6" r="1.5"/></svg>,
  },
  {
    to: '/add-data', label: 'Добавить данные',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5.5v5M5.5 8h5"/></svg>,
  },
  {
    to: '/subscription', label: 'Подписка',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.8 3.6L14 6.4l-3 2.9.7 4.1L8 11.3l-3.7 2.1.7-4.1L2 6.4l4.2-.8L8 2z"/></svg>,
  },
]

function initials(name, email) {
  if (name) {
    const parts = name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email ? email[0].toUpperCase() : '?'
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 900)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initStr = user ? initials(user.name, user.email) : '?'
  const displayName = user?.name || user?.email || '—'
  const displaySub  = user?.company || user?.email || ''

  return (
    <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="logo-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
                  <circle cx="10" cy="10" r="4.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="2.5 2"/>
                  <circle cx="10" cy="10" r="1.8" fill="#60A5FA"/>
                  <path d="M10 10 L15.5 4.5" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="logo-text">TariffRadar</span>
            </div>
            <button className="sidebar-collapse-btn" onClick={() => setCollapsed(true)} title="Свернуть">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
            </button>
          </>
        )}
        {collapsed && (
          <>
            <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
                <circle cx="10" cy="10" r="4.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="2.5 2"/>
                <circle cx="10" cy="10" r="1.8" fill="#60A5FA"/>
                <path d="M10 10 L15.5 4.5" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <button
              className="sidebar-collapse-btn"
              style={{ position: 'absolute', right: -12, top: 18, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '50%', width: 22, height: 22, padding: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', zIndex: 10 }}
              onClick={() => setCollapsed(false)} title="Развернуть">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 1l4 4-4 4"/></svg>
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="nav">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {item.icon}
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        {/* Account card */}
        <NavLink to="/settings" title={collapsed ? displayName : undefined}
          className="account-card" style={{ textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {initStr}
          </div>
          <div className="account-card-text">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displaySub}</div>
          </div>
          {!collapsed && (
            <span style={{ fontSize: 9, fontWeight: 700, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 4, padding: '2px 5px', flexShrink: 0 }}>
              {user?.role === 'admin' ? 'ADMIN' : 'FREE'}
            </span>
          )}
        </NavLink>

        {/* Settings */}
        <NavLink to="/settings" title={collapsed ? 'Настройки' : undefined}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          style={{ textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="2"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1"/></svg>
          <span className="nav-label">Настройки</span>
        </NavLink>

        {/* Logout */}
        <div className="nav-item" style={{ color: '#EF4444' }}
          onClick={handleLogout} title={collapsed ? 'Выйти' : undefined}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6"/></svg>
          <span className="nav-label">Выйти</span>
        </div>
      </div>
    </div>
  )
}
