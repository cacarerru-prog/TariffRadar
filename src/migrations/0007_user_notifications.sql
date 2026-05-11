-- +goose Up
-- +goose StatementBegin

-- ── Настройки уведомлений пользователя ───────────────────────────────────────
CREATE TABLE user_notifications (
    user_id         UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    price_alerts    BOOLEAN      NOT NULL DEFAULT TRUE,
    weekly_digest   BOOLEAN      NOT NULL DEFAULT TRUE,
    benchmark_tips  BOOLEAN      NOT NULL DEFAULT FALSE,
    new_deals       BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_notifications IS 'Настройки уведомлений пользователя (1:1 с users)';

CREATE TRIGGER user_notifications_set_updated_at
    BEFORE UPDATE ON user_notifications
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- Автосоздание записи при INSERT в users (defaults применятся автоматически).
CREATE OR REPLACE FUNCTION trg_users_create_notifications()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_notifications (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_notifications
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trg_users_create_notifications();

-- Backfill: для уже существующих пользователей.
INSERT INTO user_notifications (user_id)
SELECT id FROM users
WHERE NOT EXISTS (SELECT 1 FROM user_notifications n WHERE n.user_id = users.id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS users_create_notifications ON users;
DROP FUNCTION IF EXISTS trg_users_create_notifications();
DROP TABLE IF EXISTS user_notifications;
-- +goose StatementEnd
