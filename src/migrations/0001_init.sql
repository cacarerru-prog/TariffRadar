-- +goose Up
-- +goose StatementBegin

-- Расширение для генерации UUID на стороне БД (нужно для users.id).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Таблица пользователей ────────────────────────────────────────────────────
CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255),
    company       VARCHAR(255),
    phone         VARCHAR(50),
    role          VARCHAR(20)  NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('viewer', 'analyst', 'admin')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  users           IS 'Пользователи системы';
COMMENT ON COLUMN users.role      IS 'Роль: viewer (только чтение) | analyst (добавляет данные) | admin';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt-хеш пароля';

-- Триггер автоматического обновления updated_at при UPDATE.
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS users_set_updated_at ON users;
DROP FUNCTION IF EXISTS trg_set_updated_at();
DROP TABLE IF EXISTS users;
-- +goose StatementEnd
