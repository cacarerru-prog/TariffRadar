-- +goose Up
-- +goose StatementBegin

-- ── Справочник тарифных планов ───────────────────────────────────────────────
CREATE TABLE plans (
    code               VARCHAR(20)  PRIMARY KEY,
    name               VARCHAR(50)  NOT NULL,
    price_byn          NUMERIC(10,2) NOT NULL DEFAULT 0,
    routes_max         INT          NOT NULL,
    exports_per_month  INT          NOT NULL,
    webhooks_max       INT          NOT NULL,
    history_days       INT          NOT NULL,
    rate_limit         INT          NOT NULL,
    sort_order         INT          NOT NULL DEFAULT 0
);

COMMENT ON TABLE  plans IS 'Справочник тарифных планов';
COMMENT ON COLUMN plans.code IS 'Уникальный код плана (free, pro, enterprise)';
COMMENT ON COLUMN plans.rate_limit IS 'Лимит запросов к API в минуту';

-- Стандартные тарифы — synced с docs/db-schema.md.
INSERT INTO plans (code, name, price_byn, routes_max, exports_per_month, webhooks_max, history_days, rate_limit, sort_order) VALUES
    ('free',       'Free',       0,    5,      0,      0,      30,   60,    1),
    ('pro',        'Pro',        199,  50,     100,    5,      365,  1000,  2),
    ('enterprise', 'Enterprise', 999,  999999, 999999, 999999, 9999, 10000, 3);

-- ── Подписки пользователей ───────────────────────────────────────────────────
CREATE TABLE user_subscriptions (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan_code  VARCHAR(20)  NOT NULL REFERENCES plans(code),
    started_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ  NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  user_subscriptions IS 'Активная подписка пользователя (один-к-одному с users)';
COMMENT ON COLUMN user_subscriptions.expires_at IS 'NULL = бессрочно (для free и enterprise)';

CREATE INDEX idx_user_subscriptions_plan ON user_subscriptions (plan_code);
CREATE INDEX idx_user_subscriptions_expires ON user_subscriptions (expires_at) WHERE expires_at IS NOT NULL;

CREATE TRIGGER user_subscriptions_set_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- Backfill: всем существующим пользователям без подписки даём free.
INSERT INTO user_subscriptions (user_id, plan_code)
SELECT u.id, 'free'
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_subscriptions s WHERE s.user_id = u.id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS user_subscriptions;
DROP TABLE IF EXISTS plans;
-- +goose StatementEnd
