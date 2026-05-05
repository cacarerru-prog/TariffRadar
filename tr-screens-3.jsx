// ── Insights + Subscription ──────────────────────────────────────────────────

const SEASON_DATA = [1380, 1410, 1455, 1510, 1560, 1520, 1480, 1450, 1430, 1460, 1490, 1450];
const SEASON_LABELS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

const CARGO_BARS = [
  { label: 'FMCG',            val: 1420, max: 1700 },
  { label: 'Металл',          val: 1580, max: 1700 },
  { label: 'Стройматериалы',  val: 1470, max: 1700 },
  { label: 'Одежда',          val: 1310, max: 1700 },
  { label: 'Химия',           val: 1620, max: 1700 },
];

function AreaChart({ data, labels, W = 520, H = 130 }) {
  const { line, area, min, max } = buildChartPaths(data, W, H, 4, 10);
  const uid = 'a' + Math.random().toString(36).slice(2, 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map(t => {
        const y = (10 + t * (H - 20)).toFixed(1);
        const v = Math.round(max - t * (max - min - 40));
        return <line key={t} x1={4} y1={y} x2={W - 4} y2={y} stroke="#F1F5F9" strokeWidth={1} />;
      })}
      <path d={area} fill={`url(#${uid})`} />
      <path d={line} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinejoin="round" />
      {labels.map((l, i) => {
        const x = (4 + (i / (data.length - 1)) * (W - 8)).toFixed(1);
        return <text key={i} x={x} y={H - 1} fontSize={9} fill="#94A3B8" textAnchor="middle">{l}</text>;
      })}
    </svg>
  );
}

function HBar({ label, val, maxVal }) {
  const pct = ((val / maxVal) * 100).toFixed(1);
  return (
    <div className="hbar-row">
      <div className="hbar-label">{label}</div>
      <div className="hbar-track">
        <div className="hbar-fill" style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
      <div className="hbar-val">{val.toLocaleString()} EUR</div>
    </div>
  );
}

function Insights() {
  const [routeTab, setRouteTab] = useState('Минск→Москва FTL');

  const rising = [
    { route: 'Минск → Казань',         pct: '+12%', color: '#16A34A' },
    { route: 'Минск → Новосибирск',    pct: '+9%',  color: '#16A34A' },
    { route: 'Минск → Екатеринбург',   pct: '+7%',  color: '#16A34A' },
  ];
  const falling = [
    { route: 'Минск → Москва',         pct: '−8%',  color: '#DC2626' },
    { route: 'Минск → Санкт-Петербург',pct: '−6%',  color: '#DC2626' },
    { route: 'Минск → Смоленск',       pct: '−5%',  color: '#DC2626' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Аналитика и тренды</div>
        <div className="page-subtitle">Ключевые инсайты по рынку грузоперевозок</div>
      </div>

      {/* Top routes */}
      <div className="insights-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#16A34A' }}><Icon.arrowUp /></span> Топ направлений по росту цен
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>за 30 дней</span>
          </div>
          <ul className="trend-list">
            {rising.map((r, i) => (
              <li key={i} className="trend-item">
                <span className="trend-rank">{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{r.route}</span>
                <span style={{ fontWeight: 700, color: r.color, fontSize: 13 }}>{r.pct}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#DC2626' }}><Icon.arrowDown /></span> Топ направлений по снижению цен
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>за 30 дней</span>
          </div>
          <ul className="trend-list">
            {falling.map((r, i) => (
              <li key={i} className="trend-item">
                <span className="trend-rank">{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{r.route}</span>
                <span style={{ fontWeight: 700, color: r.color, fontSize: 13 }}>{r.pct}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Charts row */}
      <div className="insights-grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="card-title" style={{ margin: 0 }}>Сезонность (Средняя ставка)</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Минск → Москва FTL</div>
            </div>
          </div>
          <AreaChart data={SEASON_DATA} labels={SEASON_LABELS} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
            <span>мин: 1 380 EUR</span><span>макс: 1 560 EUR</span>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="card-title" style={{ margin: 0 }}>Средняя ставка по типу груза</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Минск → Москва · 30 дней</div>
            </div>
          </div>
          <div style={{ paddingTop: 4 }}>
            {CARGO_BARS.map(b => <HBar key={b.label} label={b.label} val={b.val} maxVal={b.max} />)}
          </div>
        </div>
      </div>

      {/* Pro upsell */}
      <div style={{ marginTop: 16, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>Разблокируйте полную аналитику с Pro</div>
          <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>90 дней истории · Все маршруты · Экспорт данных · API</div>
        </div>
        <button className="btn-primary" style={{ flexShrink: 0 }}>Попробовать Pro →</button>
      </div>
    </div>
  );
}

// ── Subscription ─────────────────────────────────────────────────────────────
function Subscription() {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState('pro');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      tagline: 'Базовый доступ',
      price: '0',
      features: [
        '5 маршрутов в месяц',
        'Базовая статистика',
        'История за 7 дней',
      ],
      locked: ['Benchmark', 'История сделок', 'Insights', 'API доступ'],
      btnLabel: 'Текущий тариф',
      btnStyle: { background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' },
      isCurrent: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'Расширенный доступ',
      price: '29',
      badge: 'Популярный',
      features: [
        'Неограниченные маршруты',
        'Полная история сделок',
        'История за 90 дней',
        'Benchmark',
        'Insights & аналитика',
        'Экспорт данных (CSV)',
        'API доступ',
      ],
      btnLabel: 'Выбрать Pro',
      btnStyle: { background: '#fff', color: '#2563EB', border: '1px solid rgba(255,255,255,0.5)', fontWeight: 700 },
      featured: true,
    },
    {
      id: 'business',
      name: 'Business',
      tagline: 'Для команды',
      price: '99',
      features: [
        'Все возможности Pro',
        'Доступ для команды (до 10)',
        'История за 180 дней',
        'Персональный менеджер',
        'SLA поддержка',
        'Белый лейбл отчёты',
      ],
      btnLabel: 'Выбрать Business',
      btnStyle: { background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' },
      dark: true,
    },
  ];

  return (
    <div className="page">
      <div className="page-header" style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="page-title">Выберите тариф</div>
        <div className="page-subtitle">Доступ ко всей аналитике и данным рынка</div>
      </div>

      <div className="pricing-grid">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`pricing-card${plan.featured ? ' featured' : ''}${plan.dark ? ' dark' : ''}`}
            style={{
              transform: hovered === plan.id ? 'translateY(-4px)' : 'none',
              boxShadow: hovered === plan.id ? '0 12px 32px rgba(0,0,0,0.15)' : plan.featured ? '0 4px 20px rgba(37,99,235,0.25)' : '',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={() => setHovered(plan.id)}
            onMouseLeave={() => setHovered(null)}
          >
            {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
            <div className="pricing-name" style={{ color: plan.featured || plan.dark ? '#fff' : '#0F172A' }}>{plan.name}</div>
            <div className="pricing-tagline" style={{ color: plan.featured ? 'rgba(255,255,255,0.75)' : plan.dark ? 'rgba(255,255,255,0.6)' : '#64748B' }}>{plan.tagline}</div>
            <div style={{ borderTop: `1px solid ${plan.featured ? 'rgba(255,255,255,0.2)' : plan.dark ? 'rgba(255,255,255,0.1)' : '#F1F5F9'}`, margin: '14px 0' }} />
            <div className="pricing-price" style={{ color: plan.featured || plan.dark ? '#fff' : '#0F172A' }}>
              {plan.price} <span style={{ color: plan.featured ? 'rgba(255,255,255,0.75)' : plan.dark ? 'rgba(255,255,255,0.6)' : '#64748B' }}>EUR/мес</span>
            </div>
            <ul className="pricing-features">
              {plan.features.map(f => (
                <li key={f} style={{ color: plan.featured || plan.dark ? 'rgba(255,255,255,0.9)' : '#374151' }}>
                  <span style={{ color: plan.featured ? '#93C5FD' : plan.dark ? '#60A5FA' : '#16A34A', flexShrink: 0 }}><Icon.check /></span>
                  {f}
                </li>
              ))}
              {plan.locked && plan.locked.map(f => (
                <li key={f} style={{ color: '#CBD5E1', textDecoration: 'line-through', fontSize: 12 }}>
                  <span style={{ color: '#E2E8F0', flexShrink: 0 }}><Icon.check /></span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className="pricing-btn"
              style={{
                ...plan.btnStyle,
                marginTop: 'auto',
                opacity: hovered === plan.id && !plan.isCurrent ? 1 : plan.isCurrent ? 0.8 : 0.95,
                cursor: plan.isCurrent ? 'default' : 'pointer',
              }}
              onClick={() => !plan.isCurrent && setSelected(plan.id)}
            >
              {plan.isCurrent ? plan.btnLabel : selected === plan.id ? '✓ Выбрано' : plan.btnLabel}
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
        Все тарифы можно отменить в любой момент. Без скрытых комиссий.
      </div>
    </div>
  );
}

Object.assign(window, { Insights, Subscription });
