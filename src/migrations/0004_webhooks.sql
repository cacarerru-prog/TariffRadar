-- +goose Up
-- +goose StatementBegin

-- ── Webhooks (уведомления при изменении тарифов) ─────────────────────────────
CREATE TABLE webhooks (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url        VARCHAR(500) NOT NULL,
    events     TEXT[]       NOT NULL DEFAULT '{}',
    filters    JSONB        NOT NULL DEFAULT '{}'::JSONB,
    secret     VARCHAR(255) NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  webhooks         IS 'Зарегистрированные пользователями webhooks';
COMMENT ON COLUMN webhooks.events  IS 'Массив подписанных событий, например {"price.changed"}';
COMMENT ON COLUMN webhooks.filters IS 'JSON-фильтр: {"from":"Минск","threshold_pct":5}';
COMMENT ON COLUMN webhooks.secret  IS 'Используется для HMAC-подписи payload-а при доставке';

CREATE INDEX idx_webhooks_user ON webhooks (user_id);

-- ── Журнал доставок ──────────────────────────────────────────────────────────
CREATE TABLE webhook_deliveries (
    id              BIGSERIAL    PRIMARY KEY,
    webhook_id      UUID         NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    payload         JSONB        NOT NULL,
    response_status INT,
    attempt         INT          NOT NULL DEFAULT 1,
    delivered_at    TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_hook ON webhook_deliveries (webhook_id, delivered_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS webhook_deliveries;
DROP TABLE IF EXISTS webhooks;
-- +goose StatementEnd
