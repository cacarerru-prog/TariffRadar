// ── Dashboard + Benchmark ────────────────────────────────────────────────────

const CHART_DATA = {
  '7Д':  [1462, 1431, 1408, 1388, 1422, 1431, 1450],
  '30Д': [1568, 1545, 1572, 1595, 1612, 1585, 1558, 1523, 1502, 1478, 1461, 1492, 1515, 1482, 1455, 1432, 1408, 1441, 1462, 1431, 1410, 1388, 1422, 1451, 1431, 1408, 1382, 1450],
  '90Д': [1620,1598,1635,1652,1678,1645,1621,1608,1595,1582,1570,1601,1622,1593,1568,1545,1572,1595,1612,1585,1558,1542,1521,1503,1478,1461,1492,1515,1482,1455,1432,1408,1441,1462,1431,1410,1388,1422,1451,1431,1408,1382,1450,1422,1405,1431,1452,1471,1450,1432,1410,1388,1422,1451,1431,1408,1382,1401,1428,1450,1432,1410,1388,1422,1451,1431,1408,1382,1401,1450,1432,1408,1441,1462,1431,1410,1388,1422,1451,1408,1441,1462,1431,1450,1432,1420,1440,1451,1408,1450],
  '1Г':  [1410,1388,1420,1480,1530,1590,1640,1610,1580,1540,1490,1450],
};

const LABEL_MAP = {
  '7Д':  ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
  '30Д': ['18 фев','','','','','23 фев','','','','','28 фев','','','','','5 мар','','','','','10 мар','','','','','','','13 мар'],
  '90Д': [],
  '1Г':  ['Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек','Янв','Фев','Мар'],
};

function LineChart({ data, labels = [] }) {
  const W = 580, H = 150;
  const { line, area, pts, min, max } = buildChartPaths(data, W, H, 4, 8);
  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const uid = Math.random().toString(36).slice(2, 7);
  const gradId = `g${uid}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {gridLevels.map(t => {
        const y = (8 + t * (H - 16)).toFixed(1);
        const val = Math.round(max - t * (max - min - 40));
        return (
          <g key={t}>
            <line x1={4} y1={y} x2={W - 4} y2={y} stroke="#F1F5F9" strokeWidth={1} />
            <text x={4} y={parseFloat(y) - 3} fontSize={9} fill="#CBD5E1">{val}</text>
          </g>
        );
      })}
      {labels.filter(l => l).map((l, i) => {
        const idx = labels.indexOf(l, i === 0 ? 0 : i);
        if (idx !== i) return null;
        const x = (4 + (i / (data.length - 1)) * (W - 8)).toFixed(1);
        return <text key={i} x={x} y={H - 1} fontSize={9} fill="#94A3B8" textAnchor="middle">{l}</text>;
      })}
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinejoin="round" />
      {pts.length <= 12 && pts.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={3} fill="#2563EB" stroke="#fff" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

function Dashboard({ onNav }) {
  const [tab, setTab] = useState('30Д');
  const data = CHART_DATA[tab];
  const labels = LABEL_MAP[tab];

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Рынок грузоперевозок</div>
          <div className="page-subtitle">Актуальные ставки и аналитика по направлениям</div>
        </div>
        <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>● Данные на 13.03.2026</span>
      </div>

      {/* Route search bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Select label="Откуда" value="minsk" onChange={() => {}} options={[{ value: 'minsk', label: 'Минск, Беларусь' }]} style={{ minWidth: 160 }} />
          <Select label="Куда" value="moscow" onChange={() => {}} options={[{ value: 'moscow', label: 'Москва, Россия' }]} style={{ minWidth: 160 }} />
          <Select label="Тип перевозки" value="ftl" onChange={() => {}} options={[{ value: 'ftl', label: 'FTL (полная фура)' }]} style={{ minWidth: 160 }} />
          <button className="btn-primary" onClick={() => {}}>Показать</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Средняя ставка</div>
          <div className="stat-value">1 450 <span>EUR</span></div>
          <div className="stat-sub">за рейс</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Диапазон цен</div>
          <div className="stat-value" style={{ fontSize: 22 }}>1 300–1 650</div>
          <div className="stat-sub">EUR</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Изменение за 30 дней</div>
          <div className="stat-value" style={{ color: '#DC2626' }}>−8% <span style={{ fontSize: 14 }}>−130 EUR</span></div>
          <div className="stat-sub">к прошлому периоду</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Количество сделок</div>
          <div className="stat-value">124</div>
          <div className="stat-sub">за 30 дней</div>
        </div>
      </div>

      {/* Chart card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="card-title" style={{ margin: 0 }}>Динамика средней ставки</span>
          <div className="chart-tabs">
            {['7Д', '30Д', '90Д', '1Г'].map(t => (
              <button key={t} className={`chart-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>
        <LineChart data={data} labels={labels} />
      </div>

      {/* Quick actions row */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <div className="card" style={{ flex: 1, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onClick={() => onNav('benchmark')}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', marginBottom: 4 }}>→ Сравнить свою ставку</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>Benchmark: узнайте, переплачиваете ли вы</div>
        </div>
        <div className="card" style={{ flex: 1, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onClick={() => onNav('add')}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', marginBottom: 4 }}>+ Добавить сделку</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>Поделитесь данными и получите полный доступ</div>
        </div>
        <div className="card" style={{ flex: 1, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onClick={() => onNav('history')}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', marginBottom: 4 }}>≡ История сделок</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>124 анонимных записи за последние 30 дней</div>
        </div>
      </div>
    </div>
  );
}

// ── Benchmark ────────────────────────────────────────────────────────────────
function RangeBar({ userRate }) {
  const MIN = 1100, MAX = 1800;
  const rangeFrom = 1300, rangeTo = 1650, avg = 1450;
  const toX = v => ((v - MIN) / (MAX - MIN) * 100).toFixed(2);
  const fromPct = toX(rangeFrom), toPct = toX(rangeTo), avgPct = toX(avg), userPct = toX(userRate);
  const isAbove = userRate > avg;

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>
        <span>Диапазон рынка</span><span>Диапазон рынка</span>
      </div>
      <div style={{ position: 'relative', height: 40 }}>
        {/* Track */}
        <div style={{ position: 'absolute', top: 18, left: 0, right: 0, height: 6, background: '#F1F5F9', borderRadius: 3 }} />
        {/* Range fill */}
        <div style={{ position: 'absolute', top: 18, left: `${fromPct}%`, width: `${toPct - fromPct}%`, height: 6, background: '#BFDBFE', borderRadius: 3 }} />
        {/* Avg marker */}
        <div style={{ position: 'absolute', top: 12, left: `${avgPct}%`, transform: 'translateX(-50%)', width: 2, height: 18, background: '#2563EB', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 32, left: `${avgPct}%`, transform: 'translateX(-50%)', fontSize: 10, color: '#2563EB', fontWeight: 600, whiteSpace: 'nowrap' }}>Avg {avg}</div>
        {/* User marker */}
        <div style={{ position: 'absolute', top: 10, left: `${userPct}%`, transform: 'translateX(-50%)', width: 14, height: 14, background: isAbove ? '#DC2626' : '#16A34A', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        <div style={{ position: 'absolute', top: 32, left: `${userPct}%`, transform: 'translateX(-50%)', fontSize: 10, color: isAbove ? '#DC2626' : '#16A34A', fontWeight: 600, whiteSpace: 'nowrap' }}>Вы: {userRate}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginTop: 28 }}>
        <span>{rangeFrom}</span><span>{rangeTo}</span>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#64748B' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 6, background: '#BFDBFE', display: 'inline-block', borderRadius: 2 }} />Диапазон рынка</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#DC2626', display: 'inline-block', borderRadius: '50%' }} />Ваша ставка</span>
      </div>
    </div>
  );
}

function Benchmark() {
  const [rate, setRate] = useState('1650');
  const [compared, setCompared] = useState(false);
  const [loading, setLoading] = useState(false);
  const marketAvg = 1450, marketLow = 1300, marketHigh = 1650;

  const userRate = parseInt(rate) || 0;
  const diff = userRate - marketAvg;
  const diffPct = ((diff / marketAvg) * 100).toFixed(0);
  const isAbove = diff > 0;

  const handleCompare = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setCompared(true); }, 600);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Сравните свою ставку с рынком</div>
        <div className="page-subtitle">Введите параметры вашей перевозки и узнайте, переплачиваете ли вы</div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Параметры вашей перевозки</div>
        <div className="form-row">
          <Select label="Откуда" value="minsk" onChange={() => {}} options={[{ value: 'minsk', label: 'Минск, Беларусь' }]} style={{ flex: 1 }} />
          <Select label="Куда" value="moscow" onChange={() => {}} options={[{ value: 'moscow', label: 'Москва, Россия' }]} style={{ flex: 1 }} />
          <Select label="Тип перевозки" value="ftl" onChange={() => {}} options={[{ value: 'ftl', label: 'FTL (полная фура)' }]} style={{ flex: 1 }} />
          <Input label="Дата перевозки" value="13.03.2026" onChange={() => {}} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div className="form-group" style={{ flex: 1, maxWidth: 200 }}>
            <label className="form-label">Ваша ставка</label>
            <div style={{ display: 'flex', gap: 0 }}>
              <input className="form-input" style={{ borderRadius: '6px 0 0 6px', borderRight: 0 }} value={rate} onChange={e => { setRate(e.target.value); setCompared(false); }} type="number" />
              <div style={{ height: 36, padding: '0 10px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0 6px 6px 0', display: 'flex', alignItems: 'center', fontSize: 13, color: '#64748B', flexShrink: 0 }}>EUR</div>
            </div>
          </div>
          <button className="btn-primary" style={{ marginBottom: 0 }} onClick={handleCompare} disabled={loading}>
            {loading ? 'Анализ...' : 'Сравнить'}
          </button>
        </div>
      </div>

      {compared && (
        <div>
          <div className="card-title" style={{ marginBottom: 12 }}>Результат сравнения</div>
          <div className="bench-results">
            <div className="bench-card">
              <div className="bench-card-label">Средняя рыночная ставка</div>
              <div className="bench-card-value">{marketAvg.toLocaleString()} EUR</div>
              <div className="bench-card-sub">за рейс</div>
            </div>
            <div className={`bench-card${isAbove ? ' highlight' : ''}`} style={!isAbove ? { background: '#F0FDF4', borderColor: '#BBF7D0' } : {}}>
              <div className="bench-card-label">Ваша ставка {isAbove ? 'выше' : 'ниже'} рынка</div>
              <div className="bench-diff" style={{ color: isAbove ? '#DC2626' : '#16A34A', fontSize: 28, fontWeight: 700 }}>
                {isAbove ? '+' : ''}{diffPct}%
              </div>
              <div style={{ fontSize: 13, color: isAbove ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                {isAbove ? '+' : ''}{diff.toLocaleString()} EUR
              </div>
            </div>
            <div className="bench-card">
              <div className="bench-card-label">Диапазон рыночных ставок</div>
              <div className="bench-card-value" style={{ fontSize: 20 }}>{marketLow.toLocaleString()}–{marketHigh.toLocaleString()}</div>
              <div className="bench-card-sub">EUR</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <RangeBar userRate={userRate} />
          </div>

          <div className={`info-banner${isAbove ? ' warning' : ''}`} style={!isAbove ? { background: '#F0FDF4', borderColor: '#BBF7D0', color: '#166534' } : {}}>
            <Icon.info />
            <div>
              <strong>{isAbove ? 'Выше рынка' : 'Ниже рынка'} —</strong>{' '}
              {isAbove
                ? 'Ваша ставка выше средней рыночной. Возможно, есть возможность получить более выгодные предложения.'
                : 'Ваша ставка ниже средней рыночной. Вы работаете эффективнее большинства участников рынка.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Dashboard, Benchmark, LineChart });
