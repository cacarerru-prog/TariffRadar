// internal/service/benchmark.go — сравнение ставки пользователя с рынком.
//
// Что делает:
//   - Берёт KPI рынка (avg/min/max/count) из MarketRepo.
//   - Рассчитывает перцентиль ставки (BenchmarkRepo).
//   - Формирует verdict (below/at/above market) и текстовую рекомендацию.
package service

import (
	"context"
	"fmt"
	"time"

	"tariffradar/internal/repository"
)

// BenchmarkService — сервис benchmark.
type BenchmarkService struct {
	market    *repository.MarketRepo
	benchmark *repository.BenchmarkRepo
}

// NewBenchmarkService — конструктор.
func NewBenchmarkService(market *repository.MarketRepo, benchmark *repository.BenchmarkRepo) *BenchmarkService {
	return &BenchmarkService{market: market, benchmark: benchmark}
}

// BenchmarkInput — входные параметры.
type BenchmarkInput struct {
	From       string
	To         string
	Type       string
	UserRate   float64
	Currency   string
	PeriodDays int
}

// MarketDTO — сводка рынка для Benchmark.
type MarketDTO struct {
	Avg        float64 `json:"avg"`
	Min        float64 `json:"min"`
	Max        float64 `json:"max"`
	Currency   string  `json:"currency"`
	DealsCount int64   `json:"deals_count"`
}

// BenchmarkResult — итоговый JSON для ответа.
type BenchmarkResult struct {
	Market         MarketDTO `json:"market"`
	UserRate       float64   `json:"user_rate"`
	DiffAbs        float64   `json:"diff_abs"`
	DiffPct        float64   `json:"diff_pct"`
	Verdict        string    `json:"verdict"` // below_market | at_market | above_market
	Percentile     int       `json:"percentile"`
	Recommendation string    `json:"recommendation"`
}

// Calculate — главный метод сервиса.
func (s *BenchmarkService) Calculate(ctx context.Context, in BenchmarkInput) (*BenchmarkResult, error) {
	if in.PeriodDays <= 0 {
		in.PeriodDays = 30
	}
	if in.UserRate <= 0 {
		return nil, fmt.Errorf("user_rate должен быть положительным")
	}

	// Текущий период для статистики рынка.
	now := nowFunc()
	stats, err := s.market.Stats(ctx, repository.RouteFilter{
		FromCity: in.From, ToCity: in.To, Type: in.Type,
		From: now.AddDate(0, 0, -in.PeriodDays),
		To:   now,
	})
	if err != nil {
		return nil, err
	}

	// Перцентиль ставки.
	pct, err := s.benchmark.Percentile(ctx, in.From, in.To, in.Type, in.UserRate, in.PeriodDays)
	if err != nil {
		return nil, err
	}

	// Расчёт отклонения от средней.
	var diffAbs, diffPct float64
	if stats.Avg > 0 {
		diffAbs = round2(in.UserRate - stats.Avg)
		diffPct = round2((diffAbs / stats.Avg) * 100)
	}

	verdict, recommendation := buildVerdict(in.UserRate, stats.Avg, stats.Min, stats.Max, diffPct)

	return &BenchmarkResult{
		Market: MarketDTO{
			Avg:        round2(stats.Avg),
			Min:        round2(stats.Min),
			Max:        round2(stats.Max),
			Currency:   stats.Currency,
			DealsCount: stats.DealsCount,
		},
		UserRate:       in.UserRate,
		DiffAbs:        diffAbs,
		DiffPct:        diffPct,
		Verdict:        verdict,
		Percentile:     int(pct.Percentile),
		Recommendation: recommendation,
	}, nil
}

// buildVerdict — формирует вердикт и рекомендацию.
// Границы:
//
//	diffPct < -3%   → below_market (выгодная ставка)
//	|diffPct| ≤ 3%  → at_market    (в рынке)
//	diffPct > 3%    → above_market (переплата)
func buildVerdict(userRate, avg, _, _, diffPct float64) (string, string) {
	switch {
	case diffPct < -3:
		return "below_market", fmt.Sprintf(
			"Отличная ставка. На %.1f%% ниже рынка — экономия около %.0f на рейс.",
			-diffPct, avg-userRate)
	case diffPct > 3:
		return "above_market", fmt.Sprintf(
			"Ваша ставка на %.1f%% выше средней. Возможна экономия около %.0f на рейс.",
			diffPct, userRate-avg)
	default:
		return "at_market", "Ваша ставка в рыночном диапазоне."
	}
}

// nowFunc — обёртка над time.Now() для удобства тестирования.
// (В тестах можно подменить.)
var nowFunc = func() time.Time {
	return time.Now()
}
