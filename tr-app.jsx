// ── Search ────────────────────────────────────────────────────────────────────
function SearchRoute({ onNav }) {
  const [from, setFrom] = useState('Минск, Беларусь');
  const [to, setTo] = useState('Москва, Россия');
  const [type, setType] = useState('FTL (полная фура)');
  const [searched, setSearched] = useState(false);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Поиск маршрута</div>
        <div className="page-subtitle">Найдите актуальные ставки по вашему направлению</div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Параметры маршрута</div>
        <div className="form-row">
          <Select label="Откуда" value={from} onChange={setFrom} options={['Минск, Беларусь','Брест, Беларусь','Гродно, Беларусь']} style={{ flex: 1 }} />
          <Select label="Куда" value={to} onChange={setTo} options={['Москва, Россия','Санкт-Петербург','Казань','Новосибирск','Екатеринбург','Смоленск']} style={{ flex: 1 }} />
          <Select label="Тип перевозки" value={type} onChange={setType} options={['FTL (полная фура)','LTL (сборный груз)']} style={{ flex: 1 }} />
          <button className="btn-primary" onClick={() => setSearched(true)}>Найти</button>
        </div>
      </div>
      {searched && (
        <div>
          <div className="stats-row" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-label">Средняя ставка</div><div className="stat-value">1 450 <span>EUR</span></div><div className="stat-sub">за рейс</div></div>
            <div className="stat-card"><div className="stat-label">Диапазон</div><div className="stat-value" style={{fontSize:22}}>1 300–1 650</div><div className="stat-sub">EUR</div></div>
            <div className="stat-card"><div className="stat-label">Изменение 30д</div><div className="stat-value" style={{color:'#DC2626'}}>−8%</div><div className="stat-sub">−130 EUR</div></div>
            <div className="stat-card"><div className="stat-label">Сделок</div><div className="stat-value">124</div><div className="stat-sub">за 30 дней</div></div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="card" style={{ flex: 1, cursor: 'pointer' }} onClick={() => onNav('benchmark')}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2563EB' }}>→ Сравнить свою ставку (Benchmark)</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Узнайте, переплачиваете ли вы</div>
            </div>
            <div className="card" style={{ flex: 1, cursor: 'pointer' }} onClick={() => onNav('history')}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2563EB' }}>≡ История сделок по маршруту</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>124 анонимных записи за 30 дней</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Routes ─────────────────────────────────────────────────────────────────
function MyRoutes({ onNav }) {
  const saved = [
    { from: 'Минск, Беларусь', to: 'Москва, Россия',          avg: 1450, change: -8,  deals: 124 },
    { from: 'Минск, Беларусь', to: 'Санкт-Петербург, Россия', avg: 1690, change: -6,  deals:  48 },
    { from: 'Минск, Беларусь', to: 'Казань, Россия',           avg: 2150, change: +12, deals:  31 },
  ];
  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><div className="page-title">Мои маршруты</div><div className="page-subtitle">Отслеживайте ставки по сохранённым направлениям</div></div>
        <button className="btn-primary" onClick={() => onNav('search')}>+ Добавить маршрут</button>
      </div>
      {saved.map((r, i) => (
        <div key={i} className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.from} → {r.to}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>FTL · {r.deals} сделок за 30 дней</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{r.avg.toLocaleString()} EUR</div>
            <div style={{ fontSize: 12, color: r.change < 0 ? '#DC2626' : '#16A34A', fontWeight: 600 }}>{r.change > 0 ? '+' : ''}{r.change}% за 30 дней</div>
          </div>
          <button className="btn-outline" onClick={() => onNav('benchmark')} style={{ flexShrink: 0 }}>Benchmark</button>
        </div>
      ))}
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────
function Settings() {
  const [section, setSection] = useState('profile');
  const [profile, setProfile] = useState({ name: 'Алексей Ковалёв', email: 'a.kovalev@logistic.by', company: 'ЛогистикГрупп, ООО', phone: '+375 29 123-45-67' });
  const [notif, setNotif] = useState({ priceAlerts: true, weeklyDigest: true, benchmarkTips: false, newDeals: false });
  const [theme, setTheme] = useState(() => localStorage.getItem('tr_theme') || 'light');
  const [saved, setSaved] = useState(false);
  const setP = k => v => setProfile(p => ({ ...p, [k]: v }));

  const applyTheme = t => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('tr_theme', t);
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const navSections = [
    { id: 'profile',      label: 'Профиль',       icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7.5" cy="5" r="3"/><path d="M1.5 14c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/></svg> },
    { id: 'appearance',   label: 'Внешний вид',   icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="7.5" cy="7.5" r="6"/><path d="M7.5 1.5v2M7.5 11.5v2M1.5 7.5h2M11.5 7.5h2"/></svg> },
    { id: 'notifications',label: 'Уведомления',   icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7.5 1.5A4.5 4.5 0 003 6c0 3.5-1.5 5-1.5 5h12S12 9.5 12 6a4.5 4.5 0 00-4.5-4.5z"/><path d="M6 11.5a1.5 1.5 0 003 0"/></svg> },
    { id: 'api',          label: 'API',            icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="4" width="11" height="8" rx="1"/><path d="M5 4V3a2.5 2.5 0 015 0v1"/><path d="M5 8h5M7.5 7v2"/></svg> },
    { id: 'security',     label: 'Безопасность',  icon: () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7.5 1.5l5 2v4c0 3-2.5 5.5-5 6.5-2.5-1-5-3.5-5-6.5v-4l5-2z"/></svg> },
  ];

  const Toggle = ({ value, onChange, label, sub }) => (
    <div className="settings-divider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid #F1F5F9' }}>
      <div>
        <div className="toggle-label-main" style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{label}</div>
        {sub && <div className="toggle-label-sub" style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{sub}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? '#2563EB' : '#CBD5E1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 16 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
      </div>
    </div>
  );

  const SH = ({ title, sub }) => (
    <div className="settings-section-header" style={{ marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{sub}</div>}
    </div>
  );

  const content = {
    profile: (
      <div>
        <SH title="Профиль" sub="Ваши личные данные и контактная информация" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 16, background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>АК</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{profile.email}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <button className="btn-secondary" style={{ height: 28, fontSize: 11, padding: '0 10px' }}>Изменить фото</button>
              <button className="btn-secondary" style={{ height: 28, fontSize: 11, padding: '0 10px', color: '#DC2626', borderColor: '#FECACA' }}>Удалить фото</button>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 5, padding: '3px 8px' }}>FREE</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['Имя и фамилия','name'],['Компания','company'],['Email','email'],['Телефон','phone']].map(([label,key]) => (
            <div className="form-group" key={key}>
              <label className="form-label">{label}</label>
              <input className="form-input" value={profile[key]} onChange={e => setP(key)(e.target.value)} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <button className="btn-primary" style={{ height: 38, padding: '0 24px' }} onClick={handleSave}>Сохранить изменения</button>
        </div>
      </div>
    ),

    appearance: (
      <div>
        <SH title="Внешний вид" sub="Выберите тему оформления интерфейса" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
          {[
            {
              id: 'light', label: 'Светлая тема', desc: 'Классический интерфейс',
              icon: (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="6" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5"/>
                  <path d="M14 3v3M14 22v3M3 14h3M22 14h3M6.2 6.2l2.1 2.1M19.7 19.7l2.1 2.1M6.2 21.8l2.1-2.1M19.7 8.3l2.1-2.1" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ),
              palette: ['#FFFFFF', '#F8FAFC', '#E2E8F0', '#2563EB'],
            },
            {
              id: 'dark', label: 'Тёмная тема', desc: 'Удобна при слабом освещении',
              icon: (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M23 15.3A10 10 0 0112.7 5a10 10 0 100 18A10 10 0 0023 15.3z" fill="#60A5FA" stroke="#93C5FD" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              ),
              palette: ['#0D1117', '#161B22', '#21262D', '#60A5FA'],
            },
          ].map(t => {
            const active = theme === t.id;
            return (
              <div key={t.id} onClick={() => applyTheme(t.id)} style={{
                border: `2px solid ${active ? '#2563EB' : '#E2E8F0'}`,
                borderRadius: 12, padding: 20, cursor: 'pointer',
                background: active ? '#EFF6FF' : '#FAFAFA',
                transition: 'all 0.15s', position: 'relative',
              }}>
                {active && (
                  <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</div>
                )}
                <div style={{ marginBottom: 14 }}>{t.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#2563EB' : '#0F172A', marginBottom: 3 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>{t.desc}</div>
                {/* Palette swatches */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {t.palette.map((c, i) => (
                    <div key={i} style={{ width: 22, height: 22, borderRadius: 6, background: c, border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15)' }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9', fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>💾</span> Тема применяется мгновенно и сохраняется при следующем входе.
        </div>
      </div>
    ),

    notifications: (
      <div>
        <SH title="Уведомления" sub="Настройте, о чём вас оповещать" />
        <Toggle value={notif.priceAlerts}   onChange={v=>setNotif(n=>({...n,priceAlerts:v}))}   label="Ценовые алерты"          sub="Уведомление при изменении ставки >5% на отслеживаемых маршрутах" />
        <Toggle value={notif.weeklyDigest}  onChange={v=>setNotif(n=>({...n,weeklyDigest:v}))}  label="Еженедельный дайджест"    sub="Сводка по рынку каждый понедельник на email" />
        <Toggle value={notif.benchmarkTips} onChange={v=>setNotif(n=>({...n,benchmarkTips:v}))} label="Советы по Benchmark"      sub="Персональные рекомендации на основе ваших сделок" />
        <Toggle value={notif.newDeals}      onChange={v=>setNotif(n=>({...n,newDeals:v}))}      label="Новые сделки на маршруте" sub="При появлении новых данных по вашим направлениям" />
        <div style={{ marginTop: 20 }}>
          <button className="btn-primary" style={{ height: 38, padding: '0 24px' }} onClick={handleSave}>Сохранить</button>
        </div>
      </div>
    ),

    api: (
      <div>
        <SH title="API доступ" sub="Используйте данные TariffRadar в своих системах" />
        <div style={{ marginBottom: 16 }}>
          <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Ваш API ключ</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value="sk-tr-••••••••••••••••3f2a" readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#64748B' }} />
            <button className="btn-secondary">Копировать</button>
            <button className="btn-secondary" style={{ color: '#DC2626', borderColor: '#FECACA' }}>Обновить</button>
          </div>
        </div>
        <div className="info-banner" style={{ fontSize: 12, marginBottom: 16 }}><Icon.info />API доступен только на тарифах Pro и Business. <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Обновить подписку →</span></div>
        <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Документация</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>GET /v1/routes · GET /v1/rates · POST /v1/deals</div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Лимит: 1 000 запросов/день на Pro, безлимит на Business</div>
        </div>
      </div>
    ),

    security: (
      <div>
        <SH title="Безопасность" sub="Управляйте паролем и сессиями" />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Изменить пароль</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
            {['Текущий пароль','Новый пароль','Подтвердите пароль'].map(label => (
              <div className="form-group" key={label}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="password" placeholder="••••••••" />
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 14, height: 38, padding: '0 20px' }} onClick={handleSave}>Изменить пароль</button>
        </div>
        <div style={{ height: 1, background: '#F1F5F9', margin: '20px 0' }} />
        <div style={{ padding: 16, background: '#FEF2F2', borderRadius: 8, border: '1px solid #FEE2E2' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>Опасная зона</div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>Все данные и история будут удалены безвозвратно</div>
          <button style={{ height: 34, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '0 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Удалить аккаунт</button>
        </div>
      </div>
    ),
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      {/* Settings left nav */}
      <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid #E2E8F0', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '0 10px', marginBottom: 8 }}>Настройки</div>
        {navSections.map(s => {
          const IC = s.icon;
          const active = section === s.id;
          return (
            <div key={s.id} className={`settings-nav-item${active ? ' active' : ''}`}
              onClick={() => setSection(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: active ? '#2563EB' : '#64748B', background: active ? '#EFF6FF' : 'transparent', fontWeight: active ? 600 : 400, fontSize: 13, transition: 'all 0.12s' }}>
              <IC />{s.label}
            </div>
          );
        })}
      </div>

      {/* Settings content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28, maxWidth: 620 }}>
        {saved && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '11px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 9, color: '#166534', fontSize: 13 }}>
            <Icon.check /> Изменения сохранены
          </div>
        )}
        {content[section]}
      </div>
    </div>
  );
}

// ── Login screen ─────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Введите email'); return; }
    if (!password.trim()) { setError('Введите пароль'); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 900);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, background: '#0F1F3D', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.radar />
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>TariffRadar</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Добро пожаловать</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>Войдите в свой аккаунт TariffRadar</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input" type="email" placeholder="you@company.com"
                value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                style={{ width: '100%' }} autoFocus
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Пароль</label>
                <span style={{ fontSize: 12, color: '#2563EB', cursor: 'pointer' }}>Забыли пароль?</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  style={{ width: '100%', paddingRight: 38 }}
                />
                <span onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94A3B8', userSelect: 'none', fontSize: 11 }}>
                  {showPass ? 'скрыть' : 'показать'}
                </span>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#DC2626' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ height: 42, fontSize: 14, marginTop: 4, width: '100%', borderRadius: 8 }} disabled={loading}>
              {loading ? 'Входим…' : 'Войти'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
              <span style={{ fontSize: 11, color: '#94A3B8' }}>или</span>
              <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
            </div>

            <button type="button" className="btn-secondary" style={{ height: 40, width: '100%', justifyContent: 'center', borderRadius: 8, gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.59 2.41v2h2.58c1.5-1.38 2.37-3.42 2.37-5.87z" fill="#4285F4"/><path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2.01c-.71.48-1.63.76-2.71.76-2.08 0-3.84-1.4-4.47-3.29H.86v2.07A8 8 0 008 16z" fill="#34A853"/><path d="M3.53 9.52A4.82 4.82 0 013.28 8c0-.53.09-1.04.25-1.52V4.41H.86A8 8 0 000 8c0 1.29.31 2.51.86 3.59l2.67-2.07z" fill="#FBBC05"/><path d="M8 3.19c1.17 0 2.22.4 3.05 1.2l2.29-2.29C11.97.72 10.16 0 8 0A8 8 0 00.86 4.41L3.53 6.48C4.16 4.59 5.92 3.19 8 3.19z" fill="#EA4335"/></svg>
              Войти через Google
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
          Нет аккаунта? <span style={{ color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}>Зарегистрироваться →</span>
        </div>
      </div>
    </div>
  );
}

// ── Tweaks injection ──────────────────────────────────────────────────────────
const ACCENT_PRESETS = {
  cobalt:  { accent: '#2563EB', hover: '#1D4ED8', light: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', chartStroke: '#2563EB' },
  teal:    { accent: '#0D9488', hover: '#0F766E', light: '#F0FDFA', border: '#99F6E4', text: '#0F766E', chartStroke: '#0D9488' },
  violet:  { accent: '#7C3AED', hover: '#6D28D9', light: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9', chartStroke: '#7C3AED' },
  amber:   { accent: '#D97706', hover: '#B45309', light: '#FFFBEB', border: '#FDE68A', text: '#92400E', chartStroke: '#D97706' },
};

const SIDEBAR_PRESETS = {
  light: {
    bg: '#ffffff', border: '#E2E8F0',
    itemColor: '#64748B', hoverBg: '#F1F5F9', hoverColor: '#0F172A',
    activeBgFn: a => a.light, activeColorFn: a => a.accent,
    logoText: '#0F172A', bottomBorder: '#E2E8F0',
  },
  navy: {
    bg: '#0F1F3D', border: '#1a3460',
    itemColor: 'rgba(255,255,255,0.55)', hoverBg: 'rgba(255,255,255,0.09)', hoverColor: 'rgba(255,255,255,0.92)',
    activeBgFn: () => 'rgba(255,255,255,0.14)', activeColorFn: () => '#ffffff',
    logoText: '#ffffff', bottomBorder: 'rgba(255,255,255,0.1)',
  },
  graphite: {
    bg: '#1E293B', border: '#334155',
    itemColor: 'rgba(255,255,255,0.5)', hoverBg: 'rgba(255,255,255,0.07)', hoverColor: 'rgba(255,255,255,0.9)',
    activeBgFn: () => 'rgba(255,255,255,0.11)', activeColorFn: () => 'rgba(255,255,255,0.95)',
    logoText: '#ffffff', bottomBorder: '#334155',
  },
};

const DENSITY_PRESETS = {
  compact: {
    cardPad: '10px 12px', pagePad: '16px', rowPadV: '6px',
    statSize: '21px', statsGap: '8px', cardGap: '10px', pageTitle: '19px',
  },
  comfortable: {
    cardPad: '16px', pagePad: '24px', rowPadV: '9px',
    statSize: '26px', statsGap: '12px', cardGap: '12px', pageTitle: '22px',
  },
  spacious: {
    cardPad: '24px 28px', pagePad: '36px', rowPadV: '13px',
    statSize: '32px', statsGap: '16px', cardGap: '16px', pageTitle: '26px',
  },
};

function applyTweakCSS({ accent: accentKey, sidebar: sidebarKey, density: densityKey }) {
  const a = ACCENT_PRESETS[accentKey]  || ACCENT_PRESETS.cobalt;
  const s = SIDEBAR_PRESETS[sidebarKey] || SIDEBAR_PRESETS.light;
  const d = DENSITY_PRESETS[densityKey] || DENSITY_PRESETS.comfortable;

  const activeBg    = s.activeBgFn(a);
  const activeColor = s.activeColorFn(a);

  const css = `
    /* Accent */
    .btn-primary                          { background: ${a.accent} !important; }
    .btn-primary:hover                    { background: ${a.hover}  !important; }
    .btn-outline                          { color: ${a.accent} !important; border-color: ${a.accent} !important; }
    .btn-outline:hover                    { background: ${a.light}  !important; }
    .form-select:focus, .form-input:focus { border-color: ${a.accent} !important; box-shadow: 0 0 0 3px ${a.accent}22 !important; }
    .page-btn.active                      { background: ${a.accent} !important; border-color: ${a.accent} !important; }
    .hbar-fill                            { background: ${a.accent} !important; }
    .badge-blue                           { background: ${a.light}  !important; color: ${a.accent} !important; }
    .info-banner                          { background: ${a.light}  !important; border-color: ${a.border} !important; color: ${a.text} !important; }
    .chart-tab.active                     { color: ${a.accent} !important; }
    path[stroke="#2563EB"]                { stroke: ${a.chartStroke} !important; }

    /* Sidebar */
    .sidebar                              { background: ${s.bg}    !important; border-right-color: ${s.border} !important; }
    .sidebar-logo                         { border-bottom-color: ${s.bottomBorder} !important; }
    .sidebar-bottom                       { border-top-color:    ${s.bottomBorder} !important; }
    .logo-text                            { color: ${s.logoText}   !important; }
    .nav-item                             { color: ${s.itemColor}  !important; }
    .nav-item:hover                       { background: ${s.hoverBg}    !important; color: ${s.hoverColor} !important; }
    .nav-item.active                      { background: ${activeBg}     !important; color: ${activeColor}  !important; }

    /* Density */
    .card                                 { padding: ${d.cardPad}   !important; }
    .page                                 { padding: ${d.pagePad}   !important; }
    td                                    { padding: ${d.rowPadV} 12px !important; }
    .stat-value                           { font-size: ${d.statSize}  !important; }
    .stats-row                            { gap: ${d.statsGap}       !important; }
    .page-title                           { font-size: ${d.pageTitle} !important; }
  `;

  let el = document.getElementById('tr-tweaks-style');
  if (!el) { el = document.createElement('style'); el.id = 'tr-tweaks-style'; document.head.appendChild(el); }
  el.textContent = css;
}

// ── Tweaks panel content ──────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "cobalt",
  "sidebar": "navy",
  "density": "comfortable"
}/*EDITMODE-END*/;

function TariffTweaks() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => { applyTweakCSS(tweaks); }, [tweaks.accent, tweaks.sidebar, tweaks.density]);
  // Apply on first mount too
  useEffect(() => { applyTweakCSS(tweaks); }, []);

  const accentOptions = [
    { value: 'cobalt',  label: 'Cobalt',  color: '#2563EB' },
    { value: 'teal',    label: 'Teal',    color: '#0D9488' },
    { value: 'violet',  label: 'Violet',  color: '#7C3AED' },
    { value: 'amber',   label: 'Amber',   color: '#D97706' },
  ];

  const sidebarOptions = [
    { value: 'light',    label: 'Light',    desc: 'Clean white' },
    { value: 'navy',     label: 'Navy',     desc: 'Dark enterprise' },
    { value: 'graphite', label: 'Graphite', desc: 'Slate dark' },
  ];

  const densityOptions = [
    { value: 'compact',     label: 'Compact',     desc: 'Dense analytics' },
    { value: 'comfortable', label: 'Default',     desc: 'Balanced' },
    { value: 'spacious',    label: 'Spacious',    desc: 'Airy & executive' },
  ];

  return (
    <TweaksPanel>
      {/* Accent colour */}
      <TweakSection label="Accent Colour">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {accentOptions.map(o => (
            <button key={o.value} onClick={() => setTweak('accent', o.value)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 7, border: '1.5px solid',
              borderColor: tweaks.accent === o.value ? o.color : '#E2E8F0',
              background: tweaks.accent === o.value ? o.color + '12' : '#fff',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: o.color, flexShrink: 0, boxShadow: tweaks.accent === o.value ? `0 0 0 2px ${o.color}44` : 'none' }} />
              <span style={{ fontSize: 12, fontWeight: tweaks.accent === o.value ? 600 : 400, color: tweaks.accent === o.value ? o.color : '#374151' }}>{o.label}</span>
            </button>
          ))}
        </div>
      </TweakSection>

      {/* Sidebar tone */}
      <TweakSection label="Sidebar Tone">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {sidebarOptions.map(o => {
            const active = tweaks.sidebar === o.value;
            const swatches = { light: '#ffffff', navy: '#0F1F3D', graphite: '#1E293B' };
            return (
              <button key={o.value} onClick={() => setTweak('sidebar', o.value)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 7, border: '1.5px solid',
                borderColor: active ? '#2563EB' : '#E2E8F0',
                background: active ? '#EFF6FF' : '#fff',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
              }}>
                <span style={{
                  width: 28, height: 20, borderRadius: 4, background: swatches[o.value],
                  border: '1px solid #E2E8F0', flexShrink: 0, display: 'flex', alignItems: 'center',
                  paddingLeft: 4, gap: 2,
                }}>
                  {[1,2,3].map(i => <span key={i} style={{ width: 3, height: 3, borderRadius: 1, background: o.value === 'light' ? '#CBD5E1' : 'rgba(255,255,255,0.4)' }} />)}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: active ? 600 : 500, color: active ? '#2563EB' : '#374151', display: 'block' }}>{o.label}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{o.desc}</span>
                </span>
                {active && <span style={{ fontSize: 10, color: '#2563EB' }}>✓</span>}
              </button>
            );
          })}
        </div>
      </TweakSection>

      {/* Density */}
      <TweakSection label="Information Density">
        <div style={{ display: 'flex', gap: 5 }}>
          {densityOptions.map(o => {
            const active = tweaks.density === o.value;
            const barCounts = { compact: 4, comfortable: 3, spacious: 2 };
            const barH = { compact: 3, comfortable: 4, spacious: 6 };
            return (
              <button key={o.value} onClick={() => setTweak('density', o.value)} style={{
                flex: 1, padding: '8px 6px', borderRadius: 7, border: '1.5px solid',
                borderColor: active ? '#2563EB' : '#E2E8F0',
                background: active ? '#EFF6FF' : '#fff',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.15s',
              }}>
                {/* Mini density preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: barCounts[o.value] === 4 ? 2 : barCounts[o.value] === 3 ? 3 : 5, marginBottom: 6, alignItems: 'center' }}>
                  {Array.from({ length: barCounts[o.value] }).map((_, i) => (
                    <div key={i} style={{ width: 26, height: barH[o.value], background: active ? '#BFDBFE' : '#E2E8F0', borderRadius: 2 }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: active ? 600 : 500, color: active ? '#2563EB' : '#374151' }}>{o.label}</div>
              </button>
            );
          })}
        </div>
      </TweakSection>
    </TweaksPanel>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [loggedIn, setLoggedIn] = useState(() => {
    try { return localStorage.getItem('tr_loggedIn') !== 'false'; } catch { return true; }
  });
  const [screen, setScreen] = useState(() => {
    try { return localStorage.getItem('tr_screen') || 'dashboard'; } catch { return 'dashboard'; }
  });

  const navigate = s => {
    if (s === 'logout') {
      setLoggedIn(false);
      try { localStorage.setItem('tr_loggedIn', 'false'); } catch {}
      return;
    }
    setScreen(s);
    try { localStorage.setItem('tr_screen', s); } catch {}
  };

  const handleLogin = () => {
    setLoggedIn(true);
    setScreen('dashboard');
    try { localStorage.setItem('tr_loggedIn', 'true'); localStorage.setItem('tr_screen', 'dashboard'); } catch {}
  };

  if (!loggedIn) return <Login onLogin={handleLogin} />;

  const screens = {
    dashboard:    <Dashboard onNav={navigate} />,
    search:       <SearchRoute onNav={navigate} />,
    benchmark:    <Benchmark />,
    history:      <DealHistory />,
    insights:     <Insights />,
    routes:       <MyRoutes onNav={navigate} />,
    add:          <AddData />,
    subscription: <Subscription />,
    settings:     <Settings />,
  };

  return (
    <div className="app">
      <Sidebar active={screen} onNav={navigate} />
      <div className="main" style={screen === 'settings' ? { overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {}}>
        {screens[screen] || screens.dashboard}
      </div>
      <TariffTweaks />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
