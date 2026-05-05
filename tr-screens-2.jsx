// ── History + AddData ────────────────────────────────────────────────────────

const ALL_DEALS = [
  { date: '13.03.2026', route: 'Минск → Москва', cargo: 'FMCG',           truck: 'Фура 20т', price: 1400 },
  { date: '12.03.2026', route: 'Минск → Москва', cargo: 'Металл',          truck: 'Фура 20т', price: 1500 },
  { date: '12.03.2026', route: 'Минск → Москва', cargo: 'Одежда',          truck: 'Фура 20т', price: 1350 },
  { date: '11.03.2026', route: 'Минск → Москва', cargo: 'Продукты',        truck: 'Фура 20т', price: 1450 },
  { date: '11.03.2026', route: 'Минск → Москва', cargo: 'Химия',           truck: 'Фура 20т', price: 1600 },
  { date: '10.03.2026', route: 'Минск → Москва', cargo: 'FMCG',           truck: 'Фура 20т', price: 1300 },
  { date: '10.03.2026', route: 'Минск → Москва', cargo: 'Стройматериалы', truck: 'Фура 20т', price: 1550 },
  { date: '09.03.2026', route: 'Минск → Москва', cargo: 'Мебель',          truck: 'Фура 20т', price: 1420 },
  { date: '08.03.2026', route: 'Минск → Казань',  cargo: 'FMCG',           truck: 'Фура 20т', price: 2100 },
  { date: '08.03.2026', route: 'Минск → Казань',  cargo: 'Металл',          truck: 'Фура 20т', price: 2250 },
  { date: '07.03.2026', route: 'Минск → Москва', cargo: 'Одежда',          truck: 'Фура 20т', price: 1380 },
  { date: '07.03.2026', route: 'Минск → Москва', cargo: 'FMCG',           truck: 'Фура 20т', price: 1420 },
  { date: '06.03.2026', route: 'Минск → СПб',    cargo: 'Продукты',        truck: 'Фура 20т', price: 1680 },
  { date: '06.03.2026', route: 'Минск → СПб',    cargo: 'Химия',           truck: 'Фура 20т', price: 1720 },
  { date: '05.03.2026', route: 'Минск → Москва', cargo: 'Металл',          truck: 'Фура 20т', price: 1530 },
  { date: '05.03.2026', route: 'Минск → Москва', cargo: 'FMCG',           truck: 'Фура 20т', price: 1410 },
  { date: '04.03.2026', route: 'Минск → Смоленск',cargo:'Мебель',          truck: 'Фура 20т', price:  890 },
  { date: '04.03.2026', route: 'Минск → Смоленск',cargo:'Одежда',          truck: 'Фура 20т', price:  850 },
  { date: '03.03.2026', route: 'Минск → Москва', cargo: 'Стройматериалы', truck: 'Фура 20т', price: 1560 },
  { date: '03.03.2026', route: 'Минск → Москва', cargo: 'FMCG',           truck: 'Фура 20т', price: 1390 },
  { date: '02.03.2026', route: 'Минск → Казань',  cargo: 'Продукты',       truck: 'Фура 20т', price: 2180 },
  { date: '01.03.2026', route: 'Минск → Москва', cargo: 'Химия',           truck: 'Фура 20т', price: 1590 },
  { date: '28.02.2026', route: 'Минск → СПб',    cargo: 'Металл',          truck: 'Фура 20т', price: 1760 },
  { date: '27.02.2026', route: 'Минск → Москва', cargo: 'FMCG',           truck: 'Фура 20т', price: 1430 },
  { date: '27.02.2026', route: 'Минск → Москва', cargo: 'Одежда',          truck: 'Фура 20т', price: 1340 },
  { date: '26.02.2026', route: 'Минск → Смоленск',cargo:'FMCG',            truck: 'Фура 20т', price:  820 },
  { date: '25.02.2026', route: 'Минск → Казань',  cargo: 'Стройматериалы',truck: 'Фура 20т', price: 2290 },
  { date: '24.02.2026', route: 'Минск → Москва', cargo: 'Металл',          truck: 'Фура 20т', price: 1580 },
  { date: '23.02.2026', route: 'Минск → Москва', cargo: 'FMCG',           truck: 'Фура 20т', price: 1460 },
  { date: '22.02.2026', route: 'Минск → СПб',    cargo: 'Химия',           truck: 'Фура 20т', price: 1700 },
  { date: '21.02.2026', route: 'Минск → Москва', cargo: 'Продукты',        truck: 'Фура 20т', price: 1410 },
  { date: '20.02.2026', route: 'Минск → Москва', cargo: 'Мебель',          truck: 'Фура 20т', price: 1480 },
  { date: '19.02.2026', route: 'Минск → Казань',  cargo: 'FMCG',           truck: 'Фура 20т', price: 2050 },
  { date: '18.02.2026', route: 'Минск → Москва', cargo: 'Одежда',          truck: 'Фура 20т', price: 1370 },
  { date: '17.02.2026', route: 'Минск → Москва', cargo: 'Металл',          truck: 'Фура 20т', price: 1510 },
  { date: '16.02.2026', route: 'Минск → СПб',    cargo: 'FMCG',           truck: 'Фура 20т', price: 1650 },
];

const PER_PAGE = 20;

function DealHistory() {
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState('30 дней');
  const totalPages = Math.ceil(ALL_DEALS.length / PER_PAGE);
  const pageData = ALL_DEALS.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">История сделок</div>
        <div className="page-subtitle">Анонимные данные о реальных ставках</div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Select label="Откуда" value="minsk" onChange={() => {}} options={[{ value: 'minsk', label: 'Минск, Беларусь' }]} style={{ flex: 1, minWidth: 140 }} />
          <Select label="Куда" value="moscow" onChange={() => {}} options={[{ value: 'all', label: 'Все направления' }, { value: 'moscow', label: 'Москва, Россия' }, { value: 'spb', label: 'Санкт-Петербург' }, { value: 'kazan', label: 'Казань' }]} style={{ flex: 1, minWidth: 140 }} />
          <Select label="Тип перевозки" value="ftl" onChange={() => {}} options={[{ value: 'ftl', label: 'FTL (полная фура)' }]} style={{ flex: 1, minWidth: 140 }} />
          <Select label="Период" value={period} onChange={setPeriod} options={['30 дней', '60 дней', '90 дней', '6 месяцев']} style={{ minWidth: 110 }} />
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.filter /> Фильтры
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Маршрут</th>
                <th>Тип груза</th>
                <th>Тип ТС</th>
                <th style={{ textAlign: 'right' }}>Цена, EUR</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, i) => (
                <tr key={i}>
                  <td style={{ color: '#64748B', fontSize: 12 }}>{row.date}</td>
                  <td style={{ fontWeight: 500 }}>{row.route}</td>
                  <td><span className="badge badge-blue">{row.cargo}</span></td>
                  <td style={{ color: '#64748B' }}>{row.truck}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>{row.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => i + 1).map(n => (
              <button key={n} className={`page-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            {totalPages > 9 && <><span style={{ padding: '0 4px', color: '#94A3B8' }}>…</span><button className="page-btn" onClick={() => setPage(totalPages)}>{totalPages}</button></>}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B' }}>
            Показать по:
            <select className="form-select" style={{ height: 28, padding: '0 8px', fontSize: 12, width: 60 }}>
              <option>20</option><option>50</option><option>100</option>
            </select>
            <span>из {ALL_DEALS.length} записей</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AddData ───────────────────────────────────────────────────────────────────
function AddData() {
  const [form, setForm] = useState({
    from: 'Минск, Беларусь', to: 'Москва, Россия', type: 'FTL (полная фура)',
    date: '13.03.2026', cargo: 'FMCG', truck: 'Фура 20т',
    price: '1 600', currency: 'EUR', comment: '',
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const set = key => val => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.from.trim()) e.from = true;
    if (!form.to.trim()) e.to = true;
    if (!form.price.trim()) e.price = true;
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }
  };

  const fieldStyle = (key) => ({
    border: `1px solid ${errors[key] ? '#FCA5A5' : '#E2E8F0'}`,
    background: errors[key] ? '#FFF5F5' : '#fff',
  });

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Добавить данные о перевозке</div>
        <div className="page-subtitle">Ваши данные помогают делать аналитику точнее</div>
      </div>

      {success && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#166534', fontSize: 13 }}>
          <Icon.check /> Данные успешно сохранены. Спасибо за вклад в аналитику рынка!
        </div>
      )}

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Откуда *</label>
            <select className="form-select" style={fieldStyle('from')} value={form.from} onChange={e => set('from')(e.target.value)}>
              <option>Минск, Беларусь</option><option>Брест, Беларусь</option><option>Гродно, Беларусь</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Куда *</label>
            <select className="form-select" style={fieldStyle('to')} value={form.to} onChange={e => set('to')(e.target.value)}>
              <option>Москва, Россия</option><option>Санкт-Петербург</option><option>Казань</option><option>Новосибирск</option><option>Екатеринбург</option><option>Смоленск</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Тип перевозки *</label>
            <select className="form-select" value={form.type} onChange={e => set('type')(e.target.value)}>
              <option>FTL (полная фура)</option><option>LTL (сборный груз)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Дата перевозки *</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" style={{ width: '100%', paddingRight: 32 }} value={form.date} onChange={e => set('date')(e.target.value)} />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }}><Icon.calendar /></span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Тип груза</label>
            <select className="form-select" value={form.cargo} onChange={e => set('cargo')(e.target.value)}>
              <option>FMCG</option><option>Металл</option><option>Одежда</option><option>Продукты</option><option>Химия</option><option>Стройматериалы</option><option>Мебель</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Тип ТС</label>
            <select className="form-select" value={form.truck} onChange={e => set('truck')(e.target.value)}>
              <option>Фура 20т</option><option>Фура 10т</option><option>Рефрижератор 20т</option><option>Тентованный 20т</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Цена перевозки *</label>
            <input className="form-input" style={fieldStyle('price')} value={form.price} onChange={e => set('price')(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Валюта</label>
            <select className="form-select" value={form.currency} onChange={e => set('currency')(e.target.value)}>
              <option>EUR</option><option>USD</option><option>BYN</option><option>RUB</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Доп. комментарий <span style={{ color: '#94A3B8' }}>(необязательно)</span></label>
          <textarea className="form-textarea" rows={3} placeholder="Например, особые условия, надбавки и т.д." value={form.comment} onChange={e => set('comment')(e.target.value)} />
        </div>

        <div className="info-banner" style={{ marginBottom: 20 }}>
          <Icon.info />
          <span>Ваши данные анонимны и не передаются третьим лицам.</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={handleSubmit}>Сохранить данные</button>
          <button className="btn-secondary" onClick={() => setForm({ from: 'Минск, Беларусь', to: 'Москва, Россия', type: 'FTL (полная фура)', date: '13.03.2026', cargo: 'FMCG', truck: 'Фура 20т', price: '', currency: 'EUR', comment: '' })}>Очистить</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DealHistory, AddData });
