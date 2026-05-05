// internal/repository/user_routes.go — избранные маршруты пользователя.
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrRouteNotFound — маршрут не найден в избранном.
var ErrRouteNotFound = errors.New("маршрут не найден")

// UserRouteRepo — репозиторий «Мои маршруты».
type UserRouteRepo struct {
	db *pgxpool.Pool
}

// NewUserRouteRepo — конструктор.
func NewUserRouteRepo(db *pgxpool.Pool) *UserRouteRepo {
	return &UserRouteRepo{db: db}
}

// SavedRoute — одна запись из избранного, сразу с агрегатами по маршруту.
type SavedRoute struct {
	ID         int64
	FromCity   string
	ToCity     string
	Type       string
	Avg        float64
	ChangePct  float64
	DealsCount int64
	Currency   string
}

// List — возвращает избранные маршруты пользователя со статистикой за 30 дней.
//
// Запрос объединяет user_routes + routes + агрегацию по deals.
// change_pct считается через CASE по 30-дневным окнам.
func (r *UserRouteRepo) List(ctx context.Context, userID uuid.UUID) ([]SavedRoute, error) {
	const query = `
		SELECT
			ur.id,
			r.from_city,
			r.to_city,
			r.type,
			COALESCE(AVG(d.price) FILTER (WHERE d.deal_date >= $2)::FLOAT8, 0) AS avg_curr,
			COALESCE(AVG(d.price) FILTER (WHERE d.deal_date >= $3 AND d.deal_date < $2)::FLOAT8, 0) AS avg_prev,
			COUNT(*) FILTER (WHERE d.deal_date >= $2) AS deals_curr,
			COALESCE(MODE() WITHIN GROUP (ORDER BY d.currency) FILTER (WHERE d.deal_date >= $2), 'EUR') AS currency
		FROM user_routes ur
		JOIN routes r        ON r.id = ur.route_id
		LEFT JOIN deals  d   ON d.route_id = ur.route_id
		WHERE ur.user_id = $1
		GROUP BY ur.id, r.from_city, r.to_city, r.type
		ORDER BY ur.created_at DESC`

	now := time.Now()
	currStart := now.AddDate(0, 0, -30)
	prevStart := now.AddDate(0, 0, -60)

	rows, err := r.db.Query(ctx, query, userID, currStart, prevStart)
	if err != nil {
		return nil, fmt.Errorf("user_routes.List: %w", err)
	}
	defer rows.Close()

	var out []SavedRoute
	for rows.Next() {
		var sr SavedRoute
		var avgCurr, avgPrev float64
		if err := rows.Scan(&sr.ID, &sr.FromCity, &sr.ToCity, &sr.Type,
			&avgCurr, &avgPrev, &sr.DealsCount, &sr.Currency); err != nil {
			return nil, fmt.Errorf("user_routes.List scan: %w", err)
		}
		sr.Avg = avgCurr
		if avgPrev > 0 {
			sr.ChangePct = (avgCurr - avgPrev) / avgPrev * 100
			sr.ChangePct = float64(int(sr.ChangePct*10)) / 10
		}
		out = append(out, sr)
	}
	return out, rows.Err()
}

// Add — добавляет маршрут в избранное (при необходимости создавая запись в routes).
// Если маршрут уже в избранном — возвращает существующую запись (idempotent).
func (r *UserRouteRepo) Add(ctx context.Context, userID uuid.UUID, fromCity, toCity, routeType string) (int64, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("user_routes.Add begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	routeID, err := getOrCreateRouteTx(ctx, tx, fromCity, toCity, routeType)
	if err != nil {
		return 0, err
	}

	const insertQuery = `
		INSERT INTO user_routes (user_id, route_id) VALUES ($1, $2)
		ON CONFLICT (user_id, route_id) DO UPDATE SET created_at = user_routes.created_at
		RETURNING id`

	var id int64
	if err := tx.QueryRow(ctx, insertQuery, userID, routeID).Scan(&id); err != nil {
		return 0, fmt.Errorf("user_routes.Add insert: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("user_routes.Add commit: %w", err)
	}
	return id, nil
}

// Remove — удаляет запись из избранного. Возвращает ErrRouteNotFound, если её нет.
func (r *UserRouteRepo) Remove(ctx context.Context, userID uuid.UUID, id int64) error {
	const query = `DELETE FROM user_routes WHERE id = $1 AND user_id = $2`

	tag, err := r.db.Exec(ctx, query, id, userID)
	if err != nil {
		return fmt.Errorf("user_routes.Remove: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRouteNotFound
	}
	return nil
}
