-- migrations/0005_marketplace_loads.sql — таблица объявлений маркетплейса грузов.
-- +goose Up

CREATE TABLE marketplace_loads (
    id            BIGSERIAL     PRIMARY KEY,
    user_id       UUID          REFERENCES users(id) ON DELETE SET NULL,
    from_city     TEXT          NOT NULL,
    to_city       TEXT          NOT NULL,
    load_type     TEXT          NOT NULL CHECK (load_type IN ('FTL','LTL')),
    load_date     DATE          NOT NULL,
    cargo_type    TEXT          NOT NULL,
    weight        TEXT          NOT NULL DEFAULT '',
    truck_type    TEXT          NOT NULL,
    offered_rate  NUMERIC(12,2) NOT NULL,
    currency      CHAR(3)       NOT NULL DEFAULT 'EUR',
    status        TEXT          NOT NULL DEFAULT 'open' CHECK (status IN ('open','taken','cancelled')),
    company       TEXT          NOT NULL DEFAULT '',
    contact_phone TEXT          NOT NULL DEFAULT '',
    benchmark_pct NUMERIC(6,2),
    comment       TEXT          NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mktpl_from_to   ON marketplace_loads(from_city, to_city);
CREATE INDEX idx_mktpl_status    ON marketplace_loads(status);
CREATE INDEX idx_mktpl_load_date ON marketplace_loads(load_date);
CREATE INDEX idx_mktpl_user_id   ON marketplace_loads(user_id) WHERE user_id IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS marketplace_loads;
