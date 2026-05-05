-- +goose Up
-- +goose StatementBegin

-- ── Справочник маршрутов ─────────────────────────────────────────────────────
CREATE TABLE routes (
    id         BIGSERIAL    PRIMARY KEY,
    from_city  VARCHAR(100) NOT NULL,
    to_city    VARCHAR(100) NOT NULL,
    type       VARCHAR(10)  NOT NULL CHECK (type IN ('FTL', 'LTL')),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (from_city, to_city, type)
);

COMMENT ON TABLE routes IS 'Справочник маршрутов: уникальные пары откуда-куда + тип перевозки';

CREATE INDEX idx_routes_from_to ON routes (from_city, to_city);

-- ── Сделки ───────────────────────────────────────────────────────────────────
CREATE TABLE deals (
    id         BIGSERIAL    PRIMARY KEY,
    route_id   BIGINT       NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
    user_id    UUID         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    deal_date  DATE         NOT NULL,
    cargo_type VARCHAR(50)  NOT NULL,
    truck_type VARCHAR(50)  NOT NULL,
    price      NUMERIC(12,2) NOT NULL CHECK (price > 0),
    currency   CHAR(3)      NOT NULL CHECK (currency IN ('EUR', 'USD', 'BYN', 'RUB')),
    comment    TEXT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  deals           IS 'Сделки на перевозку — основной источник данных для аналитики';
COMMENT ON COLUMN deals.user_id   IS 'Кто добавил сделку (используется только внутри, в API не возвращается)';
COMMENT ON COLUMN deals.deal_date IS 'Дата фактической перевозки';

CREATE INDEX idx_deals_route_date ON deals (route_id, deal_date DESC);
CREATE INDEX idx_deals_date       ON deals (deal_date DESC);
CREATE INDEX idx_deals_user       ON deals (user_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS routes;
-- +goose StatementEnd
