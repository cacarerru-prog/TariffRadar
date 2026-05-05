// internal/repository/benchmark.go — расчёт перцентиля ставки на маршруте.
//
// Перцентиль считается одним SQL-запросом:
//   - сколько процентов сделок стоят ДЕШЕВЛЕ заданной ставки
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// BenchmarkRepo — репозиторий для benchmark-расчётов.
type BenchmarkRepo struct {
	db *pgxpool.Pool
}

// NewBenchmarkRepo — конструктор.
func NewBenchmarkRepo(db *pgxpool.Pool) *BenchmarkRepo {
	return &BenchmarkRepo{db: db}
}

// PercentileResult — результат расчёта перцентиля.
type PercentileResult struct {
	Percentile float64 // 0..100
	DealsTotal int64   // сколько сделок учтено
}

// Percentile — возвращает процент сделок, которые ДЕШЕВЛЕ указанной ставки.
// Если перцентиль = 88, значит 88% сделок дешевле — пользователь переплачивает.
// Если перцентиль = 30, значит только 30% сделок дешевле — выгодная цена.
func (r *BenchmarkRepo) Percentile(ctx context.Context, fromCity, toCity, routeType string, userRate float64, periodDays int) (*PercentileResult, error) {
	const query = `
		SELECT
			COALESCE(
				COUNT(*) FILTER (WHERE d.price < $5)::FLOAT8 / NULLIF(COUNT(*), 0) * 100,
				0
			)::NUMERIC(5,2)::FLOAT8 AS percentile,
			COUNT(*)                AS deals_total
		FROM deals d
		JOIN routes r ON r.id = d.route_id
		WHERE r.from_city = $1
		  AND r.to_city   = $2
		  AND r.type      = $3
		  AND d.deal_date >= $4`

	from := time.Now().AddDate(0, 0, -periodDays)

	var res PercentileResult
	err := r.db.QueryRow(ctx, query,
		fromCity, toCity, routeType, from, userRate,
	).Scan(&res.Percentile, &res.DealsTotal)
	if err != nil {
		return nil, fmt.Errorf("benchmark.Percentile: %w", err)
	}
	return &res, nil
}
