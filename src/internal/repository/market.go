// internal/repository/market.go — SQL-агрегации для рыночной статистики.
//
// Здесь живут запросы, которые читают много строк из deals и сворачивают их в:
//   - StatsRow:  средняя/мин/макс ставка + кол-во сделок за период
//   - SeriesRow: ряд значений по дням или месяцам (для line-chart)
//
// Запросы максимально простые (без MView пока) — добавим материализованные
// представления, когда таблица вырастет. Индекс idx_deals_route_date уже есть.
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// MarketRepo — агрегатные запросы по рынку.
type MarketRepo struct {
	db *pgxpool.Pool
}

// NewMarketRepo — конструктор.
func NewMarketRepo(db *pgxpool.Pool) *MarketRepo {
	return &MarketRepo{db: db}
}

// RouteFilter — параметры фильтра для всех агрегатов.
type RouteFilter struct {
	FromCity string
	ToCity   string
	Type     string // FTL | LTL
	Currency string // если "" — берётся валюта самой частой сделки (или EUR)
	From     time.Time
	To       time.Time
}

// StatsRow — результат агрегации (avg/min/max/count) по маршруту.
type StatsRow struct {
	Avg        float64
	Min        float64
	Max        float64
	DealsCount int64
	Currency   string
}

// SeriesPoint — одна точка временного ряда.
type SeriesPoint struct {
	Bucket time.Time // начало интервала (день или месяц)
	Avg    float64   // средняя ставка в этом интервале
}

// Stats — возвращает агрегаты по маршруту за указанный период.
// Если на маршруте нет ни одной сделки — возвращает пустую структуру (не nil),
// чтобы handler мог отдать 200 с нулевыми значениями (а не 404).
func (r *MarketRepo) Stats(ctx context.Context, f RouteFilter) (*StatsRow, error) {
	const query = `
		SELECT
			COALESCE(AVG(d.price)::NUMERIC(12,2), 0)::FLOAT8 AS avg,
			COALESCE(MIN(d.price), 0)::FLOAT8                AS min,
			COALESCE(MAX(d.price), 0)::FLOAT8                AS max,
			COUNT(*)                                          AS deals_count,
			COALESCE(MODE() WITHIN GROUP (ORDER BY d.currency), 'EUR') AS currency
		FROM deals d
		JOIN routes r ON r.id = d.route_id
		WHERE r.from_city = $1
		  AND r.to_city   = $2
		  AND r.type      = $3
		  AND d.deal_date BETWEEN $4 AND $5`

	var s StatsRow
	err := r.db.QueryRow(ctx, query,
		f.FromCity, f.ToCity, f.Type, f.From, f.To,
	).Scan(&s.Avg, &s.Min, &s.Max, &s.DealsCount, &s.Currency)
	if err != nil {
		return nil, fmt.Errorf("market.Stats: %w", err)
	}
	return &s, nil
}

// Bucket — гранулярность временного ряда.
type Bucket string

const (
	BucketDay   Bucket = "day"
	BucketMonth Bucket = "month"
)

// Series — возвращает значения средней ставки, сгруппированные по дням или месяцам.
// Использует date_trunc + GROUP BY для агрегации внутри интервалов.
func (r *MarketRepo) Series(ctx context.Context, f RouteFilter, b Bucket) ([]SeriesPoint, error) {
	if b != BucketDay && b != BucketMonth {
		return nil, fmt.Errorf("market.Series: неизвестный bucket %q", b)
	}

	// date_trunc('day', deal_date) или date_trunc('month', deal_date)
	query := fmt.Sprintf(`
		SELECT
			date_trunc('%s', d.deal_date)::DATE          AS bucket,
			AVG(d.price)::NUMERIC(12,2)::FLOAT8           AS avg
		FROM deals d
		JOIN routes r ON r.id = d.route_id
		WHERE r.from_city = $1
		  AND r.to_city   = $2
		  AND r.type      = $3
		  AND d.deal_date BETWEEN $4 AND $5
		GROUP BY bucket
		ORDER BY bucket`, string(b))

	rows, err := r.db.Query(ctx, query, f.FromCity, f.ToCity, f.Type, f.From, f.To)
	if err != nil {
		return nil, fmt.Errorf("market.Series query: %w", err)
	}
	defer rows.Close()

	var points []SeriesPoint
	for rows.Next() {
		var p SeriesPoint
		if err := rows.Scan(&p.Bucket, &p.Avg); err != nil {
			return nil, fmt.Errorf("market.Series scan: %w", err)
		}
		points = append(points, p)
	}
	return points, rows.Err()
}
