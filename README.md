# TariffRadar

B2B SaaS-платформа для мониторинга и сравнения тарифов логистических компаний на рынке Беларуси.

Система решает задачу информационной асимметрии в логистике: компании не знают, переплачивают ли они за перевозку. TariffRadar агрегирует рыночные данные по тарифам, строит аналитику и позволяет сравнить свои ставки с рынком в реальном времени.

---

## Возможности

### Аналитика рынка
- **Dashboard** — сводная страница с KPI-метриками и графиком динамики тарифов (7Д / 30Д / 90Д / 1Г)
- **Insights** — тренды, сезонность, аномалии по маршрутам
- **Поиск** — текущие ставки на конкретном направлении с фильтрацией

### Marketplace
- **Сделки** — лента грузов с фильтрами по маршруту, типу и цене
- **Marketplace** — полный каталог предложений перевозчиков
- **Мои маршруты** — сохранённые направления с мониторингом изменений

### Бенчмарк
- **Benchmark** — вводишь свою ставку, система сравнивает с рынком: показывает минимум, среднее, максимум и гистограмму распределения сделок
- Видно сразу: ваша ставка выше или ниже рынка и на сколько процентов

### Прочее
- **Добавление данных** — внесение своих тарифов для анализа
- **Подписки** — три тарифных плана (Viewer / Analyst / Enterprise)
- **Экспорт** — выгрузка данных в CSV и Excel
- **Вебхуки** — подписка на события (изменение тарифов, новые сделки)

---

## Маршруты

Система охватывает направления: **Беларусь → Россия**

Города отправки: Минск, Брест, Гродно, Витебск, Гомель  
Города назначения: Москва, Санкт-Петербург, Казань, Смоленск, Новосибирск, Екатеринбург

Валюты: EUR, USD, BYN, RUB

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
├── src/                      # Go бэкенд
│   ├── cmd/server/           # Точка входа
│   ├── internal/
│   │   ├── handlers/         # HTTP handlers
│   │   ├── service/          # Бизнес-логика
│   │   ├── repository/       # Слой БД
│   │   ├── models/           # Структуры данных
│   │   ├── middleware/       # Auth, rate limiting
│   │   └── config/           # Конфигурация
│   ├── migrations/           # SQL миграции (goose)
│   ├── scripts/seed/         # Сидирование данных
│   ├── docs/                 # OpenAPI спецификация
│   ├── docker-compose.yml
│   └── Makefile
├── frontend/                 # React фронтенд (Vite)
│   ├── src/
│   │   ├── pages/            # 10 страниц приложения
│   │   ├── components/       # UI-компоненты (layout, modal, toast)
│   │   ├── api/              # Клиенты к бэкенд API
│   │   └── context/          # Auth контекст
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

