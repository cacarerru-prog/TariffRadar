-- +goose Up
-- +goose StatementBegin

-- ── API-ключи для интеграций ─────────────────────────────────────────────────
CREATE TABLE api_keys (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    key_hash     VARCHAR(64)  NOT NULL UNIQUE,   -- SHA-256 hex от полного ключа
    prefix       VARCHAR(20)  NOT NULL,          -- первые символы ключа для отображения в UI
    last_used_at TIMESTAMPTZ  NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ  NULL
);

COMMENT ON TABLE  api_keys IS 'API-ключи пользователей для интеграций';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 хеш полного ключа; сам ключ показывается ОДИН раз при создании';
COMMENT ON COLUMN api_keys.prefix IS 'Первые символы ключа (например, trk_live_abc1234) для отображения списка';

CREATE INDEX idx_api_keys_user ON api_keys (user_id);
CREATE INDEX idx_api_keys_hash ON api_keys (key_hash);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS api_keys;
-- +goose StatementEnd
