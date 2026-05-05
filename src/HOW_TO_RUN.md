# Как поднять и проверить TariffRadar Backend

Пошаговая инструкция для **Windows PowerShell**. Все команды проверены и работают копипастом.

> **Важно про PowerShell:** в Windows команда `curl` — это псевдоним для `Invoke-WebRequest`, а не настоящий `curl`. Поэтому привычный bash-синтаксис с `\"` и обратными слешами **не работает**. В этой инструкции используется **`Invoke-RestMethod`** — нативный PowerShell-способ, либо явно `curl.exe`, если хочешь именно curl.

Время на полный запуск с нуля — **15–25 минут**.

---

## Шаг 1. Установить ПО

### 1.1 Go 1.21+
- Скачать MSI: https://go.dev/dl/
- Проверка: `go version`

### 1.2 Docker Desktop
- https://www.docker.com/products/docker-desktop/
- Запустить, дождаться зелёного значка в трее.
- Проверка: `docker --version` и `docker compose version`

### 1.3 Goose (CLI для миграций)
```powershell
go install github.com/pressly/goose/v3/cmd/goose@latest
```
Если `goose` не находится — добавь в PATH `$env:USERPROFILE\go\bin`:
```powershell
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$env:USERPROFILE\go\bin", "User")
```
После этого **перезапусти PowerShell**.

### 1.4 (опционально) `make`
```powershell
# Через Scoop
scoop install make
```

---

## Шаг 2. Подготовить проект

```powershell
cd D:\диплом\src
Copy-Item .env.example .env
```

Открой `.env` в любом редакторе и **поменяй `JWT_SECRET`** — любая случайная строка от 32 символов:
```
JWT_SECRET=my-super-long-secret-string-for-tariffradar-1234567890
```

---

## Шаг 3. Подтянуть зависимости

```powershell
go mod tidy
```

Скачает chi, pgx, redis, jwt, excelize и т.д. Минута-две.

---

## Шаг 4. Поднять Postgres + Redis

```powershell
docker compose up -d
docker ps
```

Должны быть два контейнера: `tariffradar-postgres` и `tariffradar-redis`, оба `(healthy)`.

---

## Шаг 5. Применить миграции

```powershell
goose -dir migrations postgres "postgres://tariffradar:secret@localhost:5432/tariffradar?sslmode=disable" up
```

В выводе должны появиться 5 строк `OK`:
```
OK   0001_init.sql
OK   0002_routes_and_deals.sql
OK   0003_user_routes.sql
OK   0004_webhooks.sql
OK   0005_marketplace_loads.sql
goose: successfully migrated database to version: 5
```

**Проверка таблиц:**
```powershell
docker exec -it tariffradar-postgres psql -U tariffradar -c "\dt"
```

Должно быть **8 строк**: `deals`, `goose_db_version`, `marketplace_loads`, `routes`, `user_routes`, `users`, `webhook_deliveries`, `webhooks`.

---

## Шаг 6. Засеять тестовые данные

```powershell
go run scripts/seed/main.go
```

Создаст пользователя `seed@tariffradar.test / seed-password-12345` (роль `analyst`) и **200 случайных сделок**.

Проверка:
```powershell
docker exec -it tariffradar-postgres psql -U tariffradar -c "SELECT COUNT(*) FROM deals;"
```

---

## Шаг 7. Запустить сервер

```powershell
go run cmd/server/main.go
```

Вывод:
```
[info] окружение: development, порт: 8080
[info] postgres: подключено
[info] redis: подключено
[info] HTTP-сервер слушает на :8080
```

**Не закрывай это окно.** Останов через Ctrl+C.

---

## Шаг 8. Проверка эндпоинтов (PowerShell-варианты)

Открой **второе** окно PowerShell.

### 8.1 Health
```powershell
Invoke-RestMethod http://localhost:8080/health
```

### 8.2 Swagger UI
В браузере: **http://localhost:8080/docs**

### 8.3 Регистрация
```powershell
$body = @{
    email    = "test@me.by"
    password = "qwerty12345"
    name     = "Тест"
    company  = "ООО Тест"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8080/api/v1/auth/register `
    -Method Post `
    -Body $body `
    -ContentType "application/json; charset=utf-8"
```

> **Повторный запуск:** если база не сбрасывалась, `test@me.by` уже существует → вернётся `409 user_exists`. Это нормально — просто пропусти этот шаг и войди через шаг 8.4 под `seed@tariffradar.test`.

### 8.4 Логин — получить JWT (сохранить в переменную $token)
```powershell
$loginBody = @{
    email    = "seed@tariffradar.test"
    password = "seed-password-12345"
} | ConvertTo-Json

$loginResp = Invoke-RestMethod -Uri http://localhost:8080/api/v1/auth/login `
    -Method Post `
    -Body $loginBody `
    -ContentType "application/json; charset=utf-8"

$token = $loginResp.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "Token получен: $($token.Substring(0, 30))..."
```

### 8.5 Профиль текущего пользователя
```powershell
Invoke-RestMethod http://localhost:8080/api/v1/me -Headers $headers
```

### 8.6 KPI рынка (Dashboard)
```powershell
Invoke-RestMethod "http://localhost:8080/api/v1/market/stats?from=Минск, Беларусь&to=Москва, Россия&type=FTL&period=30Д"
```

### 8.7 История сделок
```powershell
Invoke-RestMethod "http://localhost:8080/api/v1/deals?from=Минск, Беларусь&to=Москва, Россия&period=30D&page=1&per_page=10"
```

### 8.8 Тренды
```powershell
Invoke-RestMethod "http://localhost:8080/api/v1/insights/trends?period=30D&limit=5"
```

### 8.9 Сезонность
```powershell
Invoke-RestMethod "http://localhost:8080/api/v1/insights/seasonality?from=Минск, Беларусь&to=Москва, Россия&type=FTL"
```

### 8.10 По типу груза
```powershell
Invoke-RestMethod "http://localhost:8080/api/v1/insights/by-cargo?from=Минск, Беларусь&to=Москва, Россия&type=FTL&period=30D"
```

### 8.11 Benchmark (сравнение ставки)
```powershell
$benchBody = @{
    from      = "Минск, Беларусь"
    to        = "Москва, Россия"
    type      = "FTL"
    user_rate = 1620
    currency  = "EUR"
    period    = "30D"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8080/api/v1/benchmark `
    -Method Post `
    -Body $benchBody `
    -ContentType "application/json; charset=utf-8"
```

### 8.12 Добавить сделку (защищённый, нужен $headers)
```powershell
$dealBody = @{
    from     = "Минск, Беларусь"
    to       = "Москва, Россия"
    type     = "FTL"
    date     = "2026-04-25"
    cargo    = "FMCG"          # ОБЯЗАТЕЛЬНО — без этого 400
    truck    = "Фура 20т"      # ОБЯЗАТЕЛЬНО — без этого 400
    price    = 1480
    currency = "EUR"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8080/api/v1/deals `
    -Method Post `
    -Headers $headers `
    -Body $dealBody `
    -ContentType "application/json; charset=utf-8"
```

> Если пропустить `cargo` или `truck` — API вернёт **400 validation_failed**. Это намеренно: эти поля выбираются пользователем в форме AddData на фронте, и бэк не вычисляет их сам.

### 8.13 Мои маршруты
**Добавить:**
```powershell
$routeBody = @{
    from = "Минск, Беларусь"
    to   = "Казань, Россия"
    type = "FTL"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8080/api/v1/my/routes `
    -Method Post `
    -Headers $headers `
    -Body $routeBody `
    -ContentType "application/json; charset=utf-8"
```

**Получить список:**
```powershell
Invoke-RestMethod http://localhost:8080/api/v1/my/routes -Headers $headers
```

**Удалить (подставь id из списка):**
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/v1/my/routes/1 -Method Delete -Headers $headers
```

### 8.14 Экспорт CSV
```powershell
Invoke-WebRequest "http://localhost:8080/api/v1/export/deals?format=csv&period=30D" -OutFile deals.csv
Invoke-Item deals.csv   # откроет в Excel
```

### 8.15 Экспорт Excel
```powershell
Invoke-WebRequest "http://localhost:8080/api/v1/export/deals?format=xlsx&period=30D" -OutFile deals.xlsx
Invoke-Item deals.xlsx
```

### 8.16 Webhook
**Создать:**
```powershell
$hookBody = @{
    url     = "https://example.com/hook"
    events  = @("price.changed")
    filters = @{
        from          = "Минск"
        threshold_pct = 5
    }
} | ConvertTo-Json

$hook = Invoke-RestMethod -Uri http://localhost:8080/api/v1/webhooks `
    -Method Post `
    -Headers $headers `
    -Body $hookBody `
    -ContentType "application/json; charset=utf-8"

Write-Host "Webhook создан, secret: $($hook.secret)"
$hookId = $hook.id
```

**Список:**
```powershell
Invoke-RestMethod http://localhost:8080/api/v1/webhooks -Headers $headers
```

**Удалить:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/webhooks/$hookId" -Method Delete -Headers $headers
```

---

## Шаг 9. Тесты

```powershell
go test ./... -v
```

Должны пройти 3 пакета (`config`, `handlers`, `service`).

С покрытием:
```powershell
go test ./... -cover
```

---

## Шаг 10. Подключить фронт

CORS уже настроен на `http://localhost:3000` и `http://localhost:5173` (см. `.env`, `CORS_ALLOWED_ORIGINS`). Для статичного фронта:

```powershell
cd D:\диплом
python -m http.server 3000
# или, если нет Python
npx serve .
```

Открой `http://localhost:3000/TariffRadar4%20(2).html`. Если нужно открывать с другого порта — добавь его в `CORS_ALLOWED_ORIGINS` в `.env` и перезапусти сервер.

---

## Альтернатива — через `curl.exe` (настоящий curl)

Если ты привык к curl-синтаксису, в Windows **обязательно пиши `curl.exe`**, иначе вызовется PowerShell-alias и команда сломается.

Эскейпинг кавычек в PowerShell — через одинарные кавычки вокруг JSON:

```powershell
curl.exe -X POST http://localhost:8080/api/v1/auth/login `
    -H "Content-Type: application/json" `
    -d '{\"email\":\"seed@tariffradar.test\",\"password\":\"seed-password-12345\"}'
```

Но это пишется муторно — `Invoke-RestMethod` из Шага 8 удобнее.

---

## Если что-то пошло не так

### «Сервер не стартует, ошибка JWT_SECRET»
В `.env` поставь `JWT_SECRET` от 32 символов.

### «postgres: ping не прошёл»
```powershell
docker ps
docker compose logs postgres
```

### «таблиц не существует» / `\dt` показывает мало строк
Возможно, миграции применились частично из-за неправильных имён файлов. Сделай чистый сброс:
```powershell
docker compose down -v
docker compose up -d
goose -dir migrations postgres "postgres://tariffradar:secret@localhost:5432/tariffradar?sslmode=disable" up
go run scripts/seed/main.go
```
После этого `\dt` должен показать 7 таблиц.

### `Invoke-RestMethod : The remote server returned an error: (400) Bad Request.` на POST /deals
Скорее всего ты не указал `cargo` или `truck` — теперь они обязательные. Заполни оба поля в `$dealBody`.

### `go mod tidy` ругается на сеть
```powershell
$env:GOPROXY = "https://proxy.golang.org,direct"
go mod tidy
```

### Хочу всё сбросить
```powershell
docker compose down -v
docker compose up -d
goose -dir migrations postgres "postgres://tariffradar:secret@localhost:5432/tariffradar?sslmode=disable" up
go run scripts/seed/main.go
```

---

## Чеклист — что должно работать после Шага 8

- [x] `/health` отвечает `{"status":"ok",...}`
- [x] Регистрация и логин выдают JWT
- [x] `/market/stats` отдаёт KPI и series
- [x] `/deals` (GET) возвращает анонимизированные сделки с пагинацией
- [x] `/deals` (POST) принимает сделку с заполненным `cargo` и `truck`, возвращает 400 без них
- [x] Benchmark выдаёт verdict и recommendation
- [x] Insights: trends, seasonality, by-cargo
- [x] Мои маршруты — CRUD
- [x] Экспорт CSV/XLSX скачивается с кириллицей
- [x] Webhooks — CRUD, secret выдаётся при создании
- [x] Маркетплейс: `GET /marketplace/loads` отдаёт список (публично), `POST` создаёт объявление (JWT)
- [x] Swagger UI открывается на `/docs`
- [x] Тесты `go test ./...` зелёные

Это **полный MVP бэка** — основа главы 3 диплома.
