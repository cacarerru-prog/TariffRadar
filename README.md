# TariffRadar — Дипломный проект Александра Качевского

## 📦 Что это

**TariffRadar** — B2B SaaS-платформа (marketplace + analytics) для размещения грузов и анализа тарифов логистических компаний на рынке Беларуси.

- **Marketplace:** пользователи размещают грузы, находят перевозчиков, видят предложения
- **Analytics:** мониторинг рынка, тренды, сезонность, инсайты по тарифам
## 🎓 Контекст

- **Студент:** Качевский Александр Андреевич
- **ВУЗ:** БГУИР, кафедра ИКТ, группа 263102
- **Тема:** "Система мониторинга и сравнения тарифов логистических компаний на языке Go"
- **Дедлайн:** 1–10 июня 2026
- **MVP готов:** ~9 мая 2026

## 📁 Структура проекта

```
диплом/
├── README.md                           ← этот файл
├── CLAUDE.md                           ← инструкции для Claude AI
├── TARIFFRADAR_BACKEND_CONTEXT.md      ← ПОЛНЫЙ контекст для реализации
├── commit.sh / COMMIT.bat              ← скрипты для git коммитов
├── .gitignore
├── src/                                ← Go проект (будет создан)
├── практика/                           ← готовые учебные материалы
│   ├── Глава_1.docx / .pdf
│   ├── Лист Задания.docx
│   └── [титульники, рефераты]
└── TariffRadar4 (2).html               ← готовый фронтенд (React 18 + моки)
```

## 🚀 Быстрый старт

### Для разработки бэкенда (Go)

1. **Прочитай контекст:** `TARIFFRADAR_BACKEND_CONTEXT.md` — это полное описание проекта, API контрактов и требований
2. **Используй Claude Code:** с промптом из этого документа
3. **Сделай коммит:** `./commit.sh` (или `COMMIT.bat` на Windows)

### Структура Go проекта (будет в `/src/`)

```
src/
├── main.go
├── go.mod / go.sum
├── migrations/          ← goose миграции
│   ├── 0001_init.sql
│   ├── 0002_auth.sql
│   ├── 0003_deals.sql
│   ├── 0004_webhooks.sql
│   └── [0005–0010 в работе]
├── internal/
│   ├── handlers/        ← HTTP handlers
│   ├── services/        ← бизнес-логика
│   ├── repositories/    ← работа с БД
│   └── models/          ← структуры данных
├── tests/               ← unit + integration tests
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## 📋 Технический стек

| Компонент | Технология |
|---|---|
| Язык | Go 1.21 |
| БД | PostgreSQL 15 |
| Кэш | Redis 7 |
| HTTP | net/http (stdlib) + Chi v5 |
| Миграции | goose |
| Аутентификация | JWT (RS256) |
| Тестирование | testing stdlib + testify |
| Контейнеризация | Docker + docker-compose |

## 🎯 API Endpoints (примеры)

### Marketplace
- `POST /api/v1/deals` — размещение груза
- `GET /api/v1/deals` — список сделок с фильтром
- `GET /api/v1/my-routes` — мои сохранённые маршруты

### Analytics
- `GET /api/v1/analytics/market-trends` — тренды рынка
- `GET /api/v1/analytics/route/{from}/{to}` — статистика маршрута
- `GET /api/v1/analytics/insights` — инсайты (тренды, сезонность)
- `GET /api/v1/analytics/benchmark` — бенчмарк против рынка

### Экспорт
- `POST /api/v1/export` — запрос на экспорт (CSV/XLSX)
- `GET /api/v1/export/{id}/download` — скачать файл

### Вебхуки
- `POST /api/v1/webhooks` — подписка на события
- `GET /api/v1/webhooks/{id}/deliveries` — лог доставки

### User & Auth
- `POST /api/v1/auth/login` — вход
- `POST /api/v1/auth/refresh` — обновить token
- `GET /api/v1/user/profile` — профиль пользователя
- `GET /api/v1/user/subscription` — информация о подписке

## 📚 Главные документы

- **CLAUDE.md** — правила оформления диплома, инструкции для Claude
- **TARIFFRADAR_BACKEND_CONTEXT.md** — **ГЛАВНЫЙ документ** для разработки, всё про API контракты, entity модель, requirements
- **TariffRadar_Vision.pdf** — видение продукта, бизнес-модель, UX-концепция
- **пример-диплома1.pdf** — пример оформления других дипломов БГУИР

## 🔑 Ключевые требования

✅ **API response time** < 200 мс  
✅ **50+ одновременных пользователей**  
✅ **99.9% доступность**  
✅ **История тарифов** 12+ месяцев  
✅ **JWT аутентификация** с ролями (viewer, analyst, admin)  
✅ **Rate limiting** по subscription тирам  
✅ **Webhook delivery** с retry логикой  
✅ **Export** в CSV и Excel  
✅ **Redis кэширование** (5мин, 15мин, 24ч)  
✅ **Materialized views** для performance  
✅ **Docker** и docker-compose  

## 🛠️ Разработка

### Инициализация репо

```bash
cd диплом
./commit.sh  # или COMMIT.bat на Windows
```

### Запуск локально (после реализации)

```bash
cd src
docker-compose up -d

# Миграции автоматически запустятся
# Сервер доступен на http://localhost:8080
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### Запуск тестов

```bash
cd src
go test ./... -v -cover
```


## 👥 Контакты

- **Студент:** Качевский Александр (@cacarer.ru@gmail.com)
- **Руководитель:** М.В. Козак (главы 1–3)
- **Консультант ТЭО:** А.Г. Мазайский (глава 5)
- **Нормоконтроль:** Е.А. Масейчик

## 📖 Для Claude Code

**Главный контекстный документ:** [`TARIFFRADAR_BACKEND_CONTEXT.md`](TARIFFRADAR_BACKEND_CONTEXT.md)

Используй его как основной ориентир при реализации всего бэкенда.

---

**Last updated:** 1 мая 2026  
**Repository:** D:\диплом\
