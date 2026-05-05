# TariffRadar

B2B SaaS-платформа для мониторинга и сравнения тарифов логистических компаний на рынке Беларуси.

**Marketplace** — размещение грузов, поиск перевозчиков, просмотр предложений.  
**Analytics** — тренды рынка, сезонность, бенчмарк, инсайты по тарифам.

---

## Стек

| Слой | Технология |
|---|---|
| Бэкенд | Go 1.21, Chi v5, net/http |
| База данных | PostgreSQL 15 |
| Кэш | Redis 7 |
| Аутентификация | JWT (RS256) |
| Фронтенд | React 18, Vite |
| Контейнеризация | Docker, docker-compose |

---

## Структура

```
TariffRadar/
├── src/                    # Go бэкенд
│   ├── cmd/server/         # Точка входа
│   ├── internal/
│   │   ├── handlers/       # HTTP handlers
│   │   ├── service/        # Бизнес-логика
│   │   ├── repository/     # Слой БД
│   │   ├── models/         # Структуры данных
│   │   ├── middleware/     # Auth, rate limiting
│   │   └── config/         # Конфигурация
│   ├── migrations/         # SQL миграции (goose)
│   ├── scripts/seed/       # Сидирование данных
│   ├── docs/               # OpenAPI спецификация
│   ├── docker-compose.yml
│   └── Makefile
├── frontend/               # React фронтенд (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── index.html
└── README.md
```

---

## Требования

- Go 1.21+
- Node.js 18+
- Docker и docker-compose

---

## Запуск

Открой **4 окна PowerShell**.

### Окно 1 — База данных

```powershell
cd src
docker compose up
```

Дождись статуса `healthy` у контейнеров `tariffradar-postgres` и `tariffradar-redis`.

### Окно 2 — Бэкенд

```powershell
cd src
Copy-Item .env.example .env
go mod tidy
goose -dir migrations postgres "postgres://tariffradar:secret@localhost:5432/tariffradar?sslmode=disable" up
go run scripts/seed/main.go
go run cmd/server/main.go
```

Сервер запустится на **http://localhost:8080**

> Если `goose` не найден: `go install github.com/pressly/goose/v3/cmd/goose@latest`

### Окно 3 — Фронтенд

```powershell
cd frontend
npm install
npm run dev
```

Фронтенд запустится на **http://localhost:5173**

### Окно 4 — Проверка API (опционально)

```powershell
# Health check
Invoke-RestMethod http://localhost:8080/health

# Логин
$body = @{ email = "seed@tariffradar.test"; password = "seed-password-12345" } | ConvertTo-Json
$resp = Invoke-RestMethod -Uri http://localhost:8080/api/v1/auth/login -Method Post -Body $body -ContentType "application/json"
$headers = @{ Authorization = "Bearer $($resp.token)" }

# Профиль
Invoke-RestMethod http://localhost:8080/api/v1/me -Headers $headers
```

Swagger UI: **http://localhost:8080/docs**

### Остановка

```powershell
docker compose down
```

---

## API

| Группа | Пример endpoint |
|---|---|
| Auth | `POST /api/v1/auth/login` |
| Deals | `GET /api/v1/deals`, `POST /api/v1/deals` |
| Analytics | `GET /api/v1/analytics/market-trends` |
| Benchmark | `GET /api/v1/analytics/benchmark` |
| Export | `POST /api/v1/export` |
| Webhooks | `POST /api/v1/webhooks` |

Полная спецификация: [`src/docs/openapi.yaml`](./src/docs/openapi.yaml)
