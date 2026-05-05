// internal/service/market.go — бизнес-логика рыночной статистики.
//
// Что делает:
//   - GetStats: возвращает KPI-карточки + line-chart для Dashboard.
//     Под капотом — два SQL-запроса (текущий и предыдущий период) для
//     расчёта change_pct, плюс time-series. Всё кэшируется в Redis на 5 минут.
//   - Форматирует лейблы для графика на русском (дни недели, даты, месяцы).
package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"tariffradar/internal/repository"
)

// ErrInvalidPeriod — возвращается когда передан неизвестный код периода.
// Используется в handler-е для разграничения 400 и 500.
var ErrInvalidPeriod = errors.New("неизвестный период")

// MarketService — сервис рыночной статистики.
type MarketService struct {
	market *repository.MarketRepo
	cache  *repository.Cache
}

// NewMarketService — конструктор.
func NewMarketService(market *repository.MarketRepo, cache *repository.Cache) *MarketService {
	return &MarketService{market: market, cache: cache}
}

// Period — период для статистики и графика.
type Period struct {
	Code   string // "7Д" | "30Д" | "90Д" | "1Г"
	Days   int    // длина периода в днях (для 1Г = 365)
	Bucket repository.Bucket
}

// ParsePeriod — нормализует входящий код периода ("7D", "7Д", "30D"...) в Period.
func ParsePeriod(code string) (Period, error) {
	c := strings.ToUpper(strings.TrimSpace(code))
	switch c {
	case "7D", "7Д":
		return Period{Code: "7Д", Days: 7, Bucket: repository.BucketDay}, nil
	case "30D", "30Д", "":
		return Period{Code: "30Д", Days: 30, Bucket: repository.BucketDay}, nil
	case "90D", "90Д":
		return Period{Code: "90Д", Days: 90, Bucket: repository.BucketDay}, nil
	case "1Г", "1Y", "365D":
		return Period{Code: "1Г", Days: 365, Bucket: repository.BucketMonth}, nil
	default:
		return Period{}, fmt.Errorf("%w %q (допустимо: 7Д, 30Д, 90Д, 1Г)", ErrInvalidPeriod, code)
	}
}

// StatsResult — то, что возвращает GetStats. Готовый payload для JSON-ответа.
type StatsResult struct {
	AsOf   string    `json:"as_of"`
	Route  RouteDTO  `json:"route"`
	Stats  StatsDTO  `json:"stats"`
	Series SeriesDTO `json:"series"`
}

// RouteDTO — описание маршрута в ответе.
type RouteDTO struct {
	From string `json:"from"`
	To   string `json:"to"`
	Type string `json:"type"`
}

// StatsDTO — KPI-карточки.
type StatsDTO struct {
	Avg        float64 `json:"avg"`
	Currency   string  `json:"currency"`
	Min        float64 `json:"min"`
	Max        float64 `json:"max"`
	ChangePct  float64 `json:"change_pct"`
	ChangeAbs  float64 `json:"change_abs"`
	DealsCount int64   `json:"deals_count"`
}

// SeriesDTO — line-chart.
type SeriesDTO struct {
	Period string    `json:"period"`
	Labels []string  `json:"labels"`
	Values []float64 `json:"values"`
}

// GetStats — главный метод сервиса.
//
// Логика:
//  1. Сформировать ключ кэша stats:{from}:{to}:{type}:{period}.
//  2. Если в Redis есть свежий ответ — вернуть его.
//  3. Иначе — выполнить два SQL-запроса (текущий и предыдущий период)
//     и time-series, посчитать change_pct, отформатировать лейблы.
//  4. Положить результат в кэш на 5 минут.
func (s *MarketService) GetStats(ctx context.Context, from, to, routeType, periodCode string) (*StatsResult, error) {
	period, err := ParsePeriod(periodCode)
	if err != nil {
		return nil, err
	}

	cacheKey := fmt.Sprintf("stats:%s:%s:%s:%s", from, to, routeType, period.Code)

	var result StatsResult
	const cacheTTL = 5 * time.Minute

	err = s.cache.GetOrSet(ctx, cacheKey, cacheTTL, &result, func() (any, error) {
		return s.computeStats(ctx, from, to, routeType, period)
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// computeStats — вычисляет статистику без кэша (вызывается из GetOrSet при cache-miss).
func (s *MarketService) computeStats(ctx context.Context, from, to, routeType string, p Period) (*StatsResult, error) {
	now := time.Now()

	// Текущий период: [now - days; now]
	curFilter := repository.RouteFilter{
		FromCity: from, ToCity: to, Type: routeType,
		From: now.AddDate(0, 0, -p.Days),
		To:   now,
	}
	curStats, err := s.market.Stats(ctx, curFilter)
	if err != nil {
		return nil, err
	}

	// Предыдущий период: [now - 2*days; now - days] — для расчёта изменения.
	prevFilter := curFilter
	prevFilter.From = now.AddDate(0, 0, -p.Days*2)
	prevFilter.To = now.AddDate(0, 0, -p.Days)
	prevStats, err := s.market.Stats(ctx, prevFilter)
	if err != nil {
		return nil, err
	}

	// Расчёт изменений.
	var changeAbs, changePct float64
	if prevStats.Avg > 0 {
		changeAbs = curStats.Avg - prevStats.Avg
		changePct = (changeAbs / prevStats.Avg) * 100
		// Округление до 1 знака.
		changePct = float64(int(changePct*10)) / 10
		changeAbs = float64(int(changeAbs*100)) / 100
	}

	// Time-series для графика.
	points, err := s.market.Series(ctx, curFilter, p.Bucket)
	if err != nil {
		return nil, err
	}
	labels, values := formatSeries(points, p, now)

	return &StatsResult{
		AsOf:  now.Format("2006-01-02"),
		Route: RouteDTO{From: from, To: to, Type: routeType},
		Stats: StatsDTO{
			Avg:        round2(curStats.Avg),
			Currency:   curStats.Currency,
			Min:        round2(curStats.Min),
			Max:        round2(curStats.Max),
			ChangePct:  changePct,
			ChangeAbs:  changeAbs,
			DealsCount: curStats.DealsCount,
		},
		Series: SeriesDTO{
			Period: p.Code,
			Labels: labels,
			Values: values,
		},
	}, nil
}

// ── Форматирование лейблов графика ───────────────────────────────────────────

var (
	weekdaysRu = []string{"Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"}
	monthsRu   = []string{"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"}
)

// formatSeries — превращает сырые точки из БД в готовые labels + values.
// Если в БД нет данных за какой-то день, точка остаётся без значения.
func formatSeries(points []repository.SeriesPoint, p Period, now time.Time) ([]string, []float64) {
	labels := make([]string, 0, len(points))
	values := make([]float64, 0, len(points))

	for _, pt := range points {
		var label string
		switch p.Code {
		case "7Д":
			// Дни недели: Пн, Вт, Ср...
			label = weekdaysRu[pt.Bucket.Weekday()]
		case "30Д", "90Д":
			// "13 мар", "5 апр" — день + сокращённый месяц.
			label = fmt.Sprintf("%d %s", pt.Bucket.Day(), monthsRu[pt.Bucket.Month()-1])
		case "1Г":
			// "Апр", "Май"...
			label = monthsRu[pt.Bucket.Month()-1]
		default:
			label = pt.Bucket.Format("2006-01-02")
		}
		labels = append(labels, label)
		values = append(values, round2(pt.Avg))
	}

	return labels, values
}

// round2 — округление до 2 знаков после запятой (для копеек/центов).
func round2(v float64) float64 {
	return float64(int(v*100)) / 100
}
