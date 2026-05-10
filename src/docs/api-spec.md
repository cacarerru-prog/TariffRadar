# Спецификация REST API — TariffRadar

Версия: 1.0
Базовый URL: `/api/v1`
Формат данных: `application/json; charset=utf-8`
Аутентификация: `Authorization: Bearer <JWT>`

## Соглашения

- Все суммы — целые числа в копейках/центах валюты (избегаем floating point); валюта в отдельном поле
- Даты — формат `2006-01-02` (ISO 8601, без времени), временные метки — RFC 3339 (`2026-04-26T13:45:00Z`)
- Пагинация: `?page=1&per_page=20` (дефолт 20, максимум 100)
- Сортировка: `?sort=-date` (минус = убывание)
- Ошибки — единый формат:
  ```json
  { "error": { "code": "validation_failed", "message": "Поле 'price' обязательно", "field": "price" } }
  ```

---

## 1. Аутентификация — `/auth`

### `POST /auth/register`
Регистрация нового пользователя.

**Request:**
```json
{ "email": "user@example.com", "password": "secret123", "name": "Иван Иванов", "company": "ЛогистикГрупп, ООО" }
```
**Response 201:**
```json
{ "id": "uuid", "email": "user@example.com", "name": "Иван Иванов", "role": "viewer" }
```

### `POST /auth/login`
Вход. Возвращает JWT.

**Request:** `{ "email": "...", "password": "..." }`
**Response 200:**
```json
{ "token": "eyJhbGciOi...", "expires_at": "2026-04-27T13:45:00Z", "user": { "id": "...", "email": "...", "name": "...", "role": "viewer" } }
```

### `POST /auth/logout`
Инвалидация JWT (добавление в blacklist в Redis).

### `GET /auth/me`
Профиль текущего пользователя (для экрана **Settings → Профиль**).

---

## 2. Главная — Dashboard

### `GET /api/v1/market/stats`
KPI-карточки + line-chart на главной.

**Query:** `from=Минск&to=Москва&type=FTL&period=30Д` (период: `7Д | 30Д | 90Д | 1Г`)

**Response 200:**
```json
{
  "as_of": "2026-04-26",
  "route": { "from": "Минск, Беларусь", "to": "Москва, Россия", "type": "FTL" },
  "stats": {
    "avg": 1450,
    "currency": "EUR",
    "min": 1300,
    "max": 1650,
    "change_pct": -8.0,
    "change_abs": -130,
    "deals_count": 124
  },
  "series": {
    "period": "30Д",
    "labels": ["18 фев", "23 фев", "28 фев", "5 мар", "10 мар", "13 мар"],
    "values": [1568, 1545, 1572, 1432, 1408, 1450]
  }
}
```

---

## 3. Поиск маршрута — Search

### `GET /api/v1/routes/search`
Получение KPI по конкретному маршруту (тот же контракт, что `/market/stats`, но для произвольного from/to).

### `GET /api/v1/routes/suggestions`
Автодополнение городов.

**Query:** `?q=Мин`
**Response:** `["Минск, Беларусь", "Минеральные Воды, Россия"]`

---

## 4. Benchmark

### `POST /api/v1/benchmark`
Сравнение ставки пользователя с рынком.

**Request:**
```json
{ "from": "Минск, Беларусь", "to": "Москва, Россия", "type": "FTL", "user_rate": 1620, "currency": "EUR" }
```
**Response 200:**
```json
{
  "market": { "avg": 1450, "min": 1300, "max": 1650, "currency": "EUR", "deals_count": 124 },
  "user_rate": 1620,
  "diff_abs": 170,
  "diff_pct": 11.7,
  "verdict": "above_market",   // "below_market" | "at_market" | "above_market"
  "percentile": 88,
  "recommendation": "Ваша ставка на 12% выше средней. Возможна экономия ~170 EUR на рейс."
}
```

---

## 5. История сделок — DealHistory

### `GET /api/v1/deals`
Анонимизированная история сделок.

**Query:** `?from=Минск&to=Москва&period=30D&page=1&per_page=20&sort=-date`

**Response 200:**
```json
{
  "data": [
    { "date": "2026-03-13", "route": "Минск → Москва", "cargo": "FMCG", "truck": "Фура 20т", "price": 1400, "currency": "EUR" }
  ],
  "pagination": { "page": 1, "per_page": 20, "total": 124, "total_pages": 7 }
}
```

### `POST /api/v1/deals`
Добавление сделки (экран **Добавить данные**). Роли: `analyst`, `admin`.

**Request:**
```json
{
  "from": "Минск, Беларусь",
  "to": "Москва, Россия",
  "type": "FTL",
  "date": "2026-03-13",
  "cargo": "FMCG",
  "truck": "Фура 20т",
  "price": 1600,
  "currency": "EUR",
  "comment": "Срочный рейс"
}
```
**Response 201:** созданная сделка (без раскрытия пользователя — поле `user_id` не возвращается в выдаче).

**Validation:**
- `from`, `to`, `type`, `date`, `cargo`, `truck`, `price`, `currency` — все обязательные
- `price > 0`
- `date` — не в будущем, не старше 1 года
- `currency` ∈ {EUR, USD, BYN, RUB}
- `cargo` ∈ {FMCG, Металл, Одежда, Продукты, Химия, Стройматериалы, Мебель}
- `truck` ∈ {Фура 20т, Фура 10т, Рефрижератор 20т, Тентованный 20т}

> **Замечание по `truck`:** это пользовательский ввод (юзер выбирает в форме AddData),
> а не вычисляемое сервером поле. Поэтому клиент обязан его передать.
> Без него POST вернёт 400 `validation_failed` с `field: "truck"`.

---

## 6. Insights

### `GET /api/v1/insights/trends`
Топ растущих/падающих маршрутов (для экрана **Insights**).

**Query:** `?period=30D&limit=5`

**Response 200:**
```json
{
  "rising":  [{ "route": "Минск → Казань", "change_pct": 12.0 }],
  "falling": [{ "route": "Минск → Москва", "change_pct": -8.0 }]
}
```

### `GET /api/v1/insights/seasonality`
Сезонность ставки по месяцам (AreaChart на Insights).

**Query:** `?from=Минск&to=Москва&type=FTL`

**Response:** `{ "labels": ["Янв",...,"Дек"], "values": [1410,...,1450], "min": 1380, "max": 1560, "currency": "EUR" }`

### `GET /api/v1/insights/by-cargo`
Средняя ставка по типу груза (горизонтальные бары).

**Response:** `[{ "label": "FMCG", "value": 1430, "currency": "EUR" }, ...]`

---

## 7. Мои маршруты — MyRoutes

### `GET /api/v1/my/routes`
Сохранённые маршруты пользователя.

**Response 200:**
```json
[
  { "id": "uuid", "from": "Минск, Беларусь", "to": "Москва, Россия", "type": "FTL", "stats": { "avg": 1450, "change_pct": -8.0, "deals_count": 124 } }
]
```

### `POST /api/v1/my/routes`
Добавить маршрут в избранное. **Body:** `{ "from", "to", "type" }`.

### `DELETE /api/v1/my/routes/:id`
Удалить маршрут из избранного.

---

## 8. Подписки — Subscription

### `GET /api/v1/subscription/plans`
Доступные тарифы (Free / Pro / Enterprise) — статичный справочник.

### `GET /api/v1/subscription/me`
Текущая подписка пользователя.
**Response:** `{ "plan": "free", "renews_at": null, "limits": { "routes_max": 5, "exports_per_month": 0 } }`

### `POST /api/v1/subscription/upgrade`
Заглушка для MVP — возвращает `501 Not Implemented` либо переключает на pro/enterprise в dev-режиме.

---

## 9. Экспорт — Export

### `GET /api/v1/export/deals`
Экспорт сделок в CSV или Excel.

**Query:** `?from=Минск&to=Москва&period=90D&format=csv`  (`format`: `csv | xlsx`)
**Response:** файл с заголовком `Content-Disposition: attachment`.

---

## 10. Webhooks (уведомления о новых сделках)

### `GET /api/v1/webhooks`
Список зарегистрированных webhook'ов пользователя.

### `POST /api/v1/webhooks`
Зарегистрировать webhook.
**Body:**
```json
{ "url": "https://my.app/hook", "events": ["deal.created"], "filters": { "from": "Минск", "to": "Москва", "type": "FTL" } }
```
Поля `filters` опциональны — пустое значение означает «любое».

### `DELETE /api/v1/webhooks/:id`
Удалить webhook.

### Payload, отправляемый подписчику

При создании сделки TariffRadar делает `POST` на зарегистрированный URL:

```json
{
  "event": "deal.created",
  "occurred_at": "2026-05-10T14:32:00Z",
  "data": {
    "route": "Минск → Москва",
    "type": "FTL",
    "price": 1450.50,
    "currency": "EUR",
    "cargo": "FMCG",
    "truck": "Фура 20т"
  }
}
```

**Заголовки запроса:**
| Заголовок | Значение |
|---|---|
| `Content-Type` | `application/json` |
| `X-TariffRadar-Event` | `deal.created` |
| `X-TariffRadar-Signature` | `sha256=<HMAC-SHA256 hex>` |

Подпись считается по телу запроса и секрету, указанному при регистрации хука (формат совместим с GitHub webhooks).

---

## 11. Settings

### `PATCH /api/v1/me`
Обновление профиля. **Body:** `{ "name", "company", "phone" }`.

### `PATCH /api/v1/me/password`
Смена пароля. **Body:** `{ "current_password", "new_password" }`.

### `GET /api/v1/me/notifications`, `PATCH /api/v1/me/notifications`
Настройки уведомлений.
**Body:** `{ "price_alerts": true, "weekly_digest": true, "benchmark_tips": false, "new_deals": false }`

### `GET /api/v1/me/plan`
Возвращает текущий тарифный план пользователя + использование лимитов.

**Response 200:**
```json
{
  "code": "free",
  "name": "Free",
  "price_byn": 0,
  "status": "active",
  "limits": {
    "routes_max": 5,
    "webhooks_max": 0,
    "exports_per_month": 0,
    "history_days": 30,
    "rate_limit": 60
  },
  "usage": {
    "routes_used": 2,
    "webhooks_used": 0
  }
}
```

При попытке превысить лимит (создать webhook на free, добавить 6-й маршрут и т.д.) API отвечает `402 Payment Required` с `code: "plan_limit"`.

### `GET /api/v1/me/api-keys`, `POST /api/v1/me/api-keys`, `DELETE /api/v1/me/api-keys/:id`
Управление API-ключами для интеграции.

---

## 12. Health & Service

### `GET /health`
Проверка живости. **Response:** `{ "status": "ok", "version": "1.0.0", "db": "ok", "cache": "ok" }`

### `GET /metrics`
Prometheus-метрики (опционально).

---

## Роли и доступы

| Endpoint | viewer | analyst | admin |
|---|:-:|:-:|:-:|
| GET (любой) | ✓ | ✓ | ✓ |
| POST /deals | — | ✓ | ✓ |
| POST /webhooks | — | ✓ | ✓ |
| GET /export | — | ✓ (Pro+) | ✓ |
| Управление пользователями | — | — | ✓ |

## Лимиты по тарифам

| | Free | Pro | Enterprise |
|---|:-:|:-:|:-:|
| Маршрутов в избранном | 5 | 50 | ∞ |
| Экспорт в месяц | 0 | 100 | ∞ |
| Webhooks | 0 | 5 | ∞ |
| История | 30 дней | 12 мес | 12+ мес |
| API rate-limit | 60/час | 1000/час | 10000/час |
