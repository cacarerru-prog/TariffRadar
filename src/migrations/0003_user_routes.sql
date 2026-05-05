-- +goose Up
-- +goose StatementBegin

-- ── Избранные маршруты пользователя ──────────────────────────────────────────
-- Связь many-to-many между users и routes.
-- При удалении пользователя или маршрута запись чистится каскадом.
CREATE TABLE user_routes (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    route_id   BIGINT       NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (user_id, route_id)
);

COMMENT ON TABLE user_routes IS 'Избранные маршруты пользователя — экран Мои маршруты';

CREATE INDEX idx_user_routes_user ON user_routes (user_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS user_routes;
-- +goose StatementEnd
