-- +goose Up
-- +goose StatementBegin

ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.email_verified IS 'Подтвердил ли пользователь email через ссылку из welcome-письма';

-- Существующие пользователи считаются верифицированными (миграция в проде после регистраций).
UPDATE users SET email_verified = TRUE WHERE created_at < now();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
-- +goose StatementEnd
