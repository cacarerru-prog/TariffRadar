# TariffRadar

**B2B двусторонний SaaS маркетплейс + аналитическая платформа для логистики**

---

## 📌 О проекте

TariffRadar — платформа для отслеживания тарифов и заключения сделок в логистической отрасли.

**Функционал:**
- 📦 Маркетплейс грузов (размещение, поиск, сделки)
- 📊 Аналитика рынка (мониторинг тарифов, тренды, бенчмарк)
- 💳 Система подписок (Free, Pro, Business)
- 📈 История сделок с экспортом CSV/Excel
- 🔐 Аутентификация и управление ролями

---

## 🛠️ Технологический стек

| Компонент | Технология |
|-----------|-----------|
| Backend | Go 1.21 |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Frontend | React 18 + Vite + Tailwind CSS |
| HTTP Router | go-chi/chi v5 |
| Migrations | goose |
| API Docs | Swagger / OpenAPI 3.0 |
| Containerization | Docker Compose |

---

## 📂 Структура проекта

```
TariffRadar/
├── src/                      ← Go backend
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── handlers/         HTTP handlers
│   │   ├── service/          Business logic
│   │   ├── repository/       Database layer
│   │   └── models/           Data structures
│   ├── migrations/           Database migrations
│   ├── config/               Configuration
│   └── docker-compose.yml
├── frontend/                 ← React frontend
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── styles/
│   └── package.json
├── docs/                     ← Documentation
│   ├── API.md
│   └── db-schema.md
└── README.md                 ← This file
```

---

## 🚀 Quick Start

### Requirements
- Go 1.21+
- Docker & Docker Compose
- Node.js 18+
- Git

### 1. Clone repository

```bash
git clone git@github.com:cacarerru-prog/TariffRadar.git
cd TariffRadar
```

### 2. Start database (PostgreSQL 15 + Redis 7)

```bash
cd src
docker-compose up -d
```

### 3. Run Go server

```bash
go mod download
go run cmd/server/main.go
```

Server runs on `http://localhost:8080`

API Docs: `http://localhost:8080/docs`

### 4. Run React frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## 📚 API Endpoints

### Authentication
- `POST /auth/register` — Register user
- `POST /auth/login` — Login (returns JWT token)
- `GET /auth/me` — Current user profile

### Deals
- `GET /api/v1/deals` — List deals (with filters & pagination)
- `POST /api/v1/deals` — Create deal

### Market Analytics
- `GET /api/v1/market/stats` — Market statistics by route
- `GET /api/v1/insights/trends` — Trend analysis
- `GET /api/v1/insights/seasonality` — Seasonality analysis

### Benchmark
- `POST /api/v1/benchmark` — Compare tariff with market

### Export
- `GET /api/v1/export/deals` — Download deals as Excel/CSV

### Webhooks
- `GET /api/v1/webhooks` — List webhooks
- `POST /api/v1/webhooks` — Create webhook
- `DELETE /api/v1/webhooks/{id}` — Delete webhook

### Health
- `GET /health` — System health check (DB, Redis, API)

---

## 🔐 Environment Variables (.env)

Create `.env` file in `src/`:

```env
# Server
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=tariff_user
DB_PASSWORD=tariff_password
DB_NAME=tariffradar_db
DB_MAX_CONNS=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## 📖 Documentation

- **[docs/API.md](docs/API.md)** — Complete API specification
- **[docs/db-schema.md](docs/db-schema.md)** — Database schema and ERD
- **[src/HOW_TO_RUN.md](src/HOW_TO_RUN.md)** — Detailed setup instructions

---

## 🏗️ Architecture

### Layered Architecture
- **Handlers** — HTTP request handling, validation, response formatting
- **Service** — Business logic (deals, analytics, benchmarking)
- **Repository** — Database operations, caching with Redis
- **Models** — Data structures and domain objects

### Key Entities
- **User** — Platform user (shipper or logistics company)
- **Route** — Shipping route (from city → to city)
- **Deal** — Completed shipping transaction
- **RouteStats** — Market statistics by route
- **TariffData** — Historical tariff data for analytics

---

## 🧪 Testing

```bash
cd src
go test ./...
```

---

## 🐳 Docker

Run entire stack with Docker Compose:

```bash
cd src
docker-compose up
```

Includes:
- PostgreSQL 15 on port 5432
- Redis 7 on port 6379
- Go API (manual run from step 3)

---

## 📝 License

[LICENSE file](LICENSE)

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/name`
3. Commit changes: `git commit -m "Description"`
4. Push to branch: `git push origin feature/name`
5. Open Pull Request

---

## 🆘 Troubleshooting

### Database connection failed
- Ensure PostgreSQL is running: `docker-compose up -d`
- Check credentials in `.env` file

### Redis connection failed
- Ensure Redis is running: `docker-compose logs redis`
- Verify Redis port (default: 6379)

### Frontend won't start
- Clear `node_modules`: `rm -rf node_modules`
- Reinstall: `npm install`
- Check Node.js version: `node --version` (need 18+)

---

## 📊 Project Status

- ✅ Backend core (auth, deals, basic analytics)
- ✅ Frontend skeleton (pages, components)
- 🟡 Analytics features (insights, benchmark)
- 🟡 API documentation
- 🟡 Comprehensive tests

---

**For more details, see `/docs` folder.**

