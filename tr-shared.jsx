const { useState, useEffect, useRef, useMemo } = React;

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  home: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7L8 2l6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z"/><path d="M6 14V9h4v5"/></svg>,
  search: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>,
  benchmark: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="10" width="3" height="4" rx="0.5"/><rect x="6.5" y="6" width="3" height="8" rx="0.5"/><rect x="11" y="2" width="3" height="12" rx="0.5"/></svg>,
  history: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/></svg>,
  insights: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l3.5-4 3 2.5 2.5-3.5L14 3"/></svg>,
  routes: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 1.5A4.5 4.5 0 0112.5 6c0 3.5-4.5 8.5-4.5 8.5S3.5 9.5 3.5 6A4.5 4.5 0 018 1.5z"/><circle cx="8" cy="6" r="1.5"/></svg>,
  add: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5.5v5M5.5 8h5"/></svg>,
  subscription: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.8 3.6L14 6.4l-3 2.9.7 4.1L8 11.3l-3.7 2.1.7-4.1L2 6.4l4.2-.8L8 2z"/></svg>,
  settings: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="2"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1"/></svg>,
  logout: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6"/></svg>,
  check: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2.5 7l3 3 6-6"/></svg>,
  arrowUp: () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 10V2M2 6l4-4 4 4"/></svg>,
  arrowDown: () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2v8M2 6l4 4 4-4"/></svg>,
  info: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  filter: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 3h12M3 7h8M5 11h4"/></svg>,
  calendar: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="2" width="12" height="11" rx="1.5"/><path d="M1 5.5h12M4.5 1v2M9.5 1v2"/></svg>,
  radar: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
      <circle cx="10" cy="10" r="4.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="2.5 2"/>
      <circle cx="10" cy="10" r="1.8" fill="#60A5FA"/>
      <path d="M10 10 L15.5 4.5" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Главная',          icon: 'home' },
  { id: 'search',       label: 'Поиск маршрута',   icon: 'search' },
  { id: 'benchmark',    label: 'Benchmark',         icon: 'benchmark' },
  { id: 'history',      label: 'История сделок',   icon: 'history' },
  { id: 'insights',     label: 'Insights',          icon: 'insights' },
  { id: 'routes',       label: 'Мои маршруты',     icon: 'routes' },
  { id: 'add',          label: 'Добавить данные',  icon: 'add' },
  { id: 'subscription', label: 'Подписка',          icon: 'subscription' },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ active, onNav }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><Icon.radar /></div>
        <span className="logo-text">TariffRadar</span>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map(item => {
          const IC = Icon[item.icon];
          return (
            <div key={item.id} className={`nav-item${active === item.id ? ' active' : ''}`} onClick={() => onNav(item.id)}>
              <IC />{item.label}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        {/* Account card */}
        <div style={{
          padding: '10px 10px 8px',
          marginBottom: 4,
          borderRadius: 8,
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>АК</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Алексей Ковалёв</div>
              <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>a.kovalev@logistic.by</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 4, padding: '2px 5px', flexShrink: 0 }}>FREE</span>
          </div>
        </div>
        <div className="nav-item" style={{color:'#64748B'}} onClick={() => onNav('settings')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="5.5" r="2.5"/><path d="M2.5 14c0-3.3 2.5-5 5.5-5s5.5 1.7 5.5 5"/></svg>
          Мой профиль
        </div>
        <div className="nav-item" style={{color:'#EF4444'}} onClick={() => onNav('logout')}><Icon.logout />Выйти</div>
      </div>
    </div>
  );
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
function buildChartPaths(data, W, H, padX = 6, padY = 12) {
  const min = Math.min(...data) - 20;
  const max = Math.max(...data) + 20;
  const range = max - min;
  const pts = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * (W - padX * 2),
    y: padY + (1 - (v - min) / range) * (H - padY * 2),
  }));
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const cx = ((p.x + c.x) / 2).toFixed(1);
    line += ` C ${cx} ${p.y.toFixed(1)} ${cx} ${c.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  const bY = (H - padY).toFixed(1);
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${bY} L ${padX} ${bY} Z`;
  return { line, area, pts, min, max };
}

// ── Shared form widgets ───────────────────────────────────────────────────────
function Select({ label, value, onChange, options, style }) {
  return (
    <div className="form-group" style={style}>
      {label && <label className="form-label">{label}</label>}
      <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text', required, style }) {
  return (
    <div className="form-group" style={style}>
      {label && <label className="form-label">{label}{required && ' *'}</label>}
      <input className="form-input" type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

Object.assign(window, { Icon, NAV_ITEMS, Sidebar, buildChartPaths, Select, Input });
