-- 0010: добавляем недостающий индекс на FK user_routes.route_id.
-- user_routes.user_id уже покрыт idx_user_routes_user (0003).
-- route_id нужен для запросов «все пользователи, следящие за маршрутом».

CREATE INDEX IF NOT EXISTS idx_user_routes_route ON user_routes (route_id);
