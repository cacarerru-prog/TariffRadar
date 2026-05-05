// internal/repository/insights.go — SQL-агрегации для аналитики.
//
// Запросы:
//   - Trends:      топ растущих/падающих маршрутов за период (по change_pct).
//   - Seasonality: средняя ставка по месяцам за последние 12 месяцев.
//   - ByCargo:     средняя ставка по типу груза для конкретного маршрута.
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InsightsRepo — агрегаты для экрана Insights.
type InsightsRepo struct {
	db *pgxpool.Pool
}

// NewInsightsRepo — конструктор.
func NewInsightsRepo(db *pgxpool.Pool) *InsightsRepo {
	return &InsightsRepo{db: db}
}

// TrendItem — одна строка в топе трендов.
type TrendItem struct {
	FromCity  string
	ToCity    string
	ChangePct float64 // в процентах, может быть отрицательным
}

// Trends — возвращает все маршруты с расчётом change_pct за period дней.
// Сортировка и обрезка топа делается на стороне сервиса.
//
// Логика:
//   - Текущий период:   [now - period; now]
//   - Предыдущий:       [now - 2*period; now - period]
//   - change_pct = (avg_curr - avg_prev) / avg_prev * 100
//
// Возвращаются только маршруты, в которых были сделки в обоих периодах
// (иначе change_pct посчитать нельзя).
func (r *InsightsRepo) Trends(ctx context.Context, periodDays int) ([]TrendItem, error) {
	const query = `
		WITH curr AS (
			SELECT route_id, AVG(price)::FLOAT8 AS avg_price
			FROM deals
			WHERE deal_date >= $1 AND deal_date <= $2
			GROUP BY route_id
		),
		prev AS (
			SELECT route_id, AVG(price)::FLOAT8 AS avg_price
			FROM deals
			WHERE deal_date >= $3 AND deal_date < $1
			GROUP BY route_id
		)
		SELECT
			r.from_city,
			r.to_city,
			((c.avg_price - p.avg_price) / p.avg_price * 100)::NUMERIC(6,2)::FLOAT8 AS change_pct
		FROM curr c
		JOIN prev p     ON p.route_id = c.route_id
		JOIN routes r   ON r.id = c.route_id
		WHERE p.avg_price > 0
		  AND r.type = 'FTL'`

	now := time.Now()
	currStart := now.AddDate(0, 0, -periodDays)
	prevStart := now.AddDate(0, 0, -periodDays*2)

	rows, err := r.db.Query(ctx, query, currStart, now, prevStart)
	if err != nil {
		return nil, fmt.Errorf("insights.Trends query: %w", err)
	}
	defer rows.Close()

	var items []TrendItem
	for rows.Next() {
		var t TrendItem
		if err := rows.Scan(&t.FromCity, &t.ToCity, &t.ChangePct); err != nil {
			return nil, fmt.Errorf("insights.Trends scan: %w", err)
		}
		items = append(items, t)
	}
	return items, rows.Err()
}

// SeasonalityPoint — точка сезонности (одна на месяц).
type SeasonalityPoint struct {
	Month int // 1..12
	Avg   float64
}

// Seasonality — средняя ставка по месяцам за последние 12 месяцев.
// Группировка по месяцу календаря (без года) — для определения сезонных паттернов.
func (r *InsightsRepo) Seasonality(ctx context.Context, fromCity, toCity, routeType string) ([]SeasonalityPoint, error) {
	const query = `
		SELECT
			EXTRACT(MONTH FROM d.deal_date)::INT     AS month,
			AVG(d.price)::NUMERIC(12,2)::FLOAT8       AS avg
		FROM deals d
		JOIN routes r ON r.id = d.route_id
		WHERE r.from_city = $1
		  AND r.to_city   = $2
		  AND r.type      = $3
		  AND d.deal_date >= $4
		GROUP BY month
		ORDER BY month`

	yearAgo := time.Now().AddDate(-1, 0, 0)
	rows, err := r.db.Query(ctx, query, fromCity, toCity, routeType, yearAgo)
	if err != nil {
		return nil, fmt.Errorf("insights.Seasonality query: %w", err)
	}
	defer rows.Close()

	var points []SeasonalityPoint
	for rows.Next() {
		var p SeasonalityPoint
		if err := rows.Scan(&p.Month, &p.Avg); err != nil {
			return nil, fmt.Errorf("insights.Seasonality scan: %w", err)
		}
		points = append(points, p)
	}
	return points, rows.Err()
}

// CargoStat — средняя ставка по одному типу груза.
type CargoStat struct {
	Cargo string
	Avg   float64
}

// ByCargo — средняя ставка по типу груза для конкретного маршрута за period дней.
// Используется для горизонтальных баров на Insights.
func (r *InsightsRepo) ByCargo(ctx context.Context, fromCity, toCity, routeType string, periodDays int) ([]CargoStat, error) {
	const query = `
		SELECT
			d.cargo_type,
			AVG(d.price)::NUMERIC(12,2)::FLOAT8 AS avg
		FROM deals d
		JOIN routes r ON r.id = d.route_id
		WHERE r.from_city = $1
		  AND r.to_city   = $2
		  AND r.type      = $3
		  AND d.deal_date >= $4
		GROUP BY d.cargo_type
		ORDER BY avg DESC`

	from := time.Now().AddDate(0, 0, -periodDays)
	rows, err := r.db.Query(ctx, query, fromCity, toCity, routeType, from)
	if err != nil {
		return nil, fmt.Errorf("insights.ByCargo query: %w", err)
	}
	defer rows.Close()

	var items []CargoStat
	for rows.Next() {
		var c CargoStat
		if err := rows.Scan(&c.Cargo, &c.Avg); err != nil {
			return nil, fmt.Errorf("insights.ByCargo scan: %w", err)
		}
		items = append(items, c)
	}
	return items, rows.Err()
}
