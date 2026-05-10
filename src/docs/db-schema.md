# Схема базы данных — TariffRadar

СУБД: **PostgreSQL 15**
Кэш: **Redis 7**
Миграции: **goose** (файлы в `migrations/`)

## ER-диаграмма (текстовая)

```
users ───< user_routes >─── routes ───< deals
  │                            │           │
  │                            │           └── cargo_types (справочник)
  │                            │           └── truck_types  (справочник)
  │                            │           └── currencies   (справочник)
  │
  ├──< user_subscriptions >─── plans (справочник)
  ├──< user_notifications
  ├──< api_keys
  └──< webhooks
```

## Таблицы

### `users` — пользователи
| Поле | Тип | Ограничения | Назначение |
|---|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` | Идентификатор |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Логин |
| `password_hash` | VARCHAR(255) | NOT NULL | Хеш bcrypt |
| `name` | VARCHAR(255) | | Имя пользователя |
| `company` | VARCHAR(255) | | Название компании |
| `phone` | VARCHAR(50) | | Телефон |
| `role` | VARCHAR(20) | NOT NULL, CHECK in ('viewer','analyst','admin'), default `'viewer'` | Роль |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Индексы:** `idx_users_email` (UNIQUE, уже создан через UNIQUE constraint).

---

### `routes` — справочник маршрутов
Хранит уникальные комбинации from/to/type. Создаётся автоматически при добавлении первой сделки.

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `from_city` | VARCHAR(100) | NOT NULL |
| `to_city` | VARCHAR(100) | NOT NULL |
| `type` | VARCHAR(10) | NOT NULL, CHECK in ('FTL','LTL') |
| `created_at` | TIMESTAMPTZ | default `now()` |

**Constraint:** `UNIQUE(from_city, to_city, type)`
**Индекс:** `idx_routes_from_to` на `(from_city, to_city)`

---

### `deals` — сделки (главная таблица)
| Поле | Тип | Ограничения | Назначение |
|---|---|---|---|
| `id` | BIGSERIAL | PK | |
| `route_id` | BIGINT | FK → `routes(id)`, NOT NULL | |
| `user_id` | UUID | FK → `users(id)`, NOT NULL | Кто добавил (НЕ возвращается в API) |
| `deal_date` | DATE | NOT NULL | Дата перевозки |
| `cargo_type` | VARCHAR(50) | NOT NULL | FK на `cargo_types.code` |
| `truck_type` | VARCHAR(50) | NOT NULL | FK на `truck_types.code` |
| `price` | NUMERIC(12,2) | NOT NULL, CHECK > 0 | Сумма |
| `currency` | CHAR(3) | NOT NULL | EUR/USD/BYN/RUB |
| `comment` | TEXT | | |
| `created_at` | TIMESTAMPTZ | default `now()` | |

**Индексы (критичны для производительности):**
- `idx_deals_route_date` на `(route_id, deal_date DESC)` — для агрегации по маршруту
- `idx_deals_date` на `deal_date DESC` — для общих выборок
- `idx_deals_user` на `user_id` — для «моих сделок»

**Партиционирование (для роста таблицы > 10 млн строк):**
По `deal_date` помесячно — `PARTITION BY RANGE (deal_date)`. Для MVP не делаем, добавим в будущем.

---

### Справочники (seed-данные миграциями)

#### `cargo_types`
| code | label_ru |
|---|---|
| `fmcg` | FMCG |
| `metal` | Металл |
| `clothes` | Одежда |
| `food` | Продукты |
| `chemistry` | Химия |
| `building` | Стройматериалы |
| `furniture` | Мебель |

#### `truck_types`
| code | label_ru |
|---|---|
| `truck_20t` | Фура 20т |
| `truck_10t` | Фура 10т |
| `refrig_20t` | Рефрижератор 20т |
| `tent_20t` | Тентованный 20т |

#### `currencies`
`EUR`, `USD`, `BYN`, `RUB`

#### `cities` (опционально, для автодополнения)
| code | name_ru | country |
|---|---|---|
| `minsk` | Минск, Беларусь | BY |
| `brest` | Брест, Беларусь | BY |
| `moscow` | Москва, Россия | RU |
| ... | ... | ... |

---

### `user_routes` — избранные маршруты пользователя
| Поле | Тип | Ограничения |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `user_id` | UUID | FK → users, NOT NULL |
| `route_id` | BIGINT | FK → routes, NOT NULL |
| `created_at` | TIMESTAMPTZ | default `now()` |

**Constraint:** `UNIQUE(user_id, route_id)`

---

### `plans` — тарифные планы (справочник)
| code | name | price_byn | routes_max | exports_per_month | webhooks_max | history_days | rate_limit |
|---|---|---|---|---|---|---|---|
| `free` | Free | 0 | 5 | 0 | 0 | 30 | 60 |
| `pro` | Pro | 199 | 50 | 100 | 5 | 365 | 1000 |
| `enterprise` | Enterprise | 999 | 999999 | 999999 | 999999 | 9999 | 10000 |

---

### `user_subscriptions`
| Поле | Тип |
|---|---|
| `id` | BIGSERIAL PK |
| `user_id` | UUID FK |
| `plan_code` | VARCHAR(20) FK → plans |
| `started_at` | TIMESTAMPTZ |
| `expires_at` | TIMESTAMPTZ NULL |
| `status` | VARCHAR(20) — `active | expired | cancelled` |

---

### `user_notifications` — настройки уведомлений
Один к одному с пользователем.

| Поле | Тип | default |
|---|---|---|
| `user_id` | UUID PK FK | |
| `price_alerts` | BOOLEAN | `true` |
| `weekly_digest` | BOOLEAN | `true` |
| `benchmark_tips` | BOOLEAN | `false` |
| `new_deals` | BOOLEAN | `false` |

---

### `api_keys`
| Поле | Тип |
|---|---|
| `id` | UUID PK |
| `user_id` | UUID FK |
| `name` | VARCHAR(100) — пользовательское имя ключа |
| `key_hash` | VARCHAR(255) — хеш SHA-256 от ключа |
| `last_used_at` | TIMESTAMPTZ NULL |
| `created_at` | TIMESTAMPTZ |
| `expires_at` | TIMESTAMPTZ NULL |

---

### `webhooks`
| Поле | Тип |
|---|---|
| `id` | UUID PK |
| `user_id` | UUID FK |
| `url` | VARCHAR(500) NOT NULL |
| `events` | TEXT[] — `['deal.created']` |
| `filters` | JSONB — `{ "from": "Минск", "to": "Москва", "type": "FTL" }` |
| `secret` | VARCHAR(255) — для HMAC-подписи payload'а |
| `active` | BOOLEAN default `true` |
| `created_at` | TIMESTAMPTZ |

---

### `webhook_deliveries` (журнал доставки)
| Поле | Тип |
|---|---|
| `id` | BIGSERIAL PK |
| `webhook_id` | UUID FK |
| `payload` | JSONB |
| `response_status` | INT |
| `attempt` | INT |
| `delivered_at` | TIMESTAMPTZ |

---

## Материализованные представления (MView)

Для быстрых агрегаций и SLA по REST API ≤ 200 мс.

### `mv_route_stats_30d`
Средняя/мин/макс ставка и количество сделок по маршруту за 30 дней.

```sql
CREATE MATERIALIZED VIEW mv_route_stats_30d AS
SELECT
  route_id,
  AVG(price)::NUMERIC(12,2) AS avg_price,
  MIN(price)              AS min_price,
  MAX(price)              AS max_price,
  COUNT(*)                AS deals_count,
  currency
FROM deals
WHERE deal_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY route_id, currency;
```

**Обновление:** `REFRESH MATERIALIZED VIEW CONCURRENTLY` каждые 5 минут (по требованию ТЗ).

### `mv_route_series_30d`
Series для line-chart (значения по дням за 30 дней).

---

## Кэширование в Redis

| Ключ | TTL | Что хранит |
|---|---|---|
| `stats:{route_id}:{period}` | 5 мин | JSON-ответ `/market/stats` |
| `trends:{period}` | 15 мин | Топ растущих/падающих |
| `seasonality:{route_id}` | 24 ч | Сезонность по месяцам |
| `auth:blacklist:{jwt_id}` | до `expires_at` | Инвалидированные JWT |
| `ratelimit:{user_id}:{minute}` | 1 мин | Счётчик запросов |

---

## Миграции (порядок)

1. `0001_init.sql` — расширение `pgcrypto` (для UUID), таблица `users`
2. `0002_routes.sql` — справочник маршрутов
3. `0003_deals.sql` — таблица сделок + индексы
4. `0004_dictionaries.sql` — `cargo_types`, `truck_types`, `currencies`, `cities`
5. `0005_subscriptions.sql` — `plans`, `user_subscriptions`
6. `0006_user_routes.sql` — избранные
7. `0007_notifications.sql` — `user_notifications`
8. `0008_api_keys.sql`
9. `0009_webhooks.sql` — `webhooks`, `webhook_deliveries`
10. `0010_materialized_views.sql` — MView для агрегаций
