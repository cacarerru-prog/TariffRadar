// internal/service/insights.go — бизнес-логика аналитики.
//
// Что делает:
//   - Trends:      сортирует и обрезает топ растущих/падающих маршрутов.
//   - Seasonality: добавляет нули для отсутствующих месяцев и форматирует labels.
//   - ByCargo:     рассчитывает max для прогресс-баров на UI.
//
// Все методы кэшируются в Redis с разным TTL:
//
//	trends      — 15 минут
//	seasonality — 24 часа (меняется редко)
//	by-cargo    — 15 минут
package service

import (
	"context"
	"fmt"
	"sort"
	"time"

	"tariffradar/internal/repository"
)

// InsightsService — сервис аналитики.
type InsightsService struct {
	repo  *repository.InsightsRepo
	cache *repository.Cache
}

// NewInsightsService — конструктор.
func NewInsightsService(repo *repository.InsightsRepo, cache *repository.Cache) *InsightsService {
	return &InsightsService{repo: repo, cache: cache}
}

// ── Trends ───────────────────────────────────────────────────────────────────

// TrendDTO — одна запись в топе.
type TrendDTO struct {
	Route     string  `json:"route"`      // "Минск → Москва"
	ChangePct float64 `json:"change_pct"` // в процентах
}

// TrendsResult — ответ /insights/trends.
type TrendsResult struct {
	Rising  []TrendDTO `json:"rising"`
	Falling []TrendDTO `json:"falling"`
}

// GetTrends — топ растущих и падающих маршрутов за period дней.
func (s *InsightsService) GetTrends(ctx context.Context, periodDays, limit int) (*TrendsResult, error) {
	if periodDays <= 0 {
		periodDays = 30
	}
	if limit <= 0 || limit > 20 {
		limit = 5
	}

	cacheKey := fmt.Sprintf("trends:%dd:%d", periodDays, limit)
	var result TrendsResult

	err := s.cache.GetOrSet(ctx, cacheKey, 15*time.Minute, &result, func() (any, error) {
		items, err := s.repo.Trends(ctx, periodDays)
		if err != nil {
			return nil, err
		}

		// Сортируем по убыванию change_pct.
		sort.Slice(items, func(i, j int) bool {
			return items[i].ChangePct > items[j].ChangePct
		})

		// Топ растущих — голова списка (положительные change_pct).
		rising := make([]TrendDTO, 0, limit)
		for _, it := range items {
			if it.ChangePct <= 0 {
				break
			}
			rising = append(rising, TrendDTO{
				Route:     it.FromCity + " → " + it.ToCity,
				ChangePct: it.ChangePct,
			})
			if len(rising) == limit {
				break
			}
		}

		// Топ падающих — хвост списка (отрицательные change_pct).
		falling := make([]TrendDTO, 0, limit)
		for i := len(items) - 1; i >= 0 && len(falling) < limit; i-- {
			if items[i].ChangePct >= 0 {
				break
			}
			falling = append(falling, TrendDTO{
				Route:     items[i].FromCity + " → " + items[i].ToCity,
				ChangePct: items[i].ChangePct,
			})
		}

		return TrendsResult{Rising: rising, Falling: falling}, nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// ── Seasonality ──────────────────────────────────────────────────────────────

// SeasonalityResult — ответ /insights/seasonality.
type SeasonalityResult struct {
	Labels   []string  `json:"labels"`
	Values   []float64 `json:"values"`
	Min      float64   `json:"min"`
	Max      float64   `json:"max"`
	Currency string    `json:"currency"`
}

// GetSeasonality — сезонность ставки по 12 месяцам.
func (s *InsightsService) GetSeasonality(ctx context.Context, fromCity, toCity, routeType string) (*SeasonalityResult, error) {
	cacheKey := fmt.Sprintf("seasonality:%s:%s:%s", fromCity, toCity, routeType)
	var result SeasonalityResult

	err := s.cache.GetOrSet(ctx, cacheKey, 24*time.Hour, &result, func() (any, error) {
		points, err := s.repo.Seasonality(ctx, fromCity, toCity, routeType)
		if err != nil {
			return nil, err
		}

		// Раскладываем точки по месяцам 1..12 (если в каком-то месяце нет данных — 0).
		byMonth := make(map[int]float64, 12)
		for _, p := range points {
			byMonth[p.Month] = p.Avg
		}

		labels := make([]string, 12)
		values := make([]float64, 12)
		var minV, maxV float64
		first := true

		// Начинаем с текущего месяца минус 11 — чтобы график шёл «снизу вверх» хронологически.
		nowMonth := int(time.Now().Month())
		for i := 0; i < 12; i++ {
			m := ((nowMonth - 11 + i - 1 + 12) % 12) + 1 // нормализация в 1..12
			labels[i] = monthsRu[m-1]
			values[i] = round2(byMonth[m])

			if values[i] > 0 {
				if first || values[i] < minV {
					minV = values[i]
				}
				if first || values[i] > maxV {
					maxV = values[i]
				}
				first = false
			}
		}

		return SeasonalityResult{
			Labels:   labels,
			Values:   values,
			Min:      minV,
			Max:      maxV,
			Currency: "EUR",
		}, nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// ── ByCargo ──────────────────────────────────────────────────────────────────

// CargoBarDTO — одна полоса в графике «по типу груза».
type CargoBarDTO struct {
	Label    string  `json:"label"`
	Value    float64 `json:"value"`
	Max      float64 `json:"max"`
	Currency string  `json:"currency"`
}

// GetByCargo — средняя ставка по типу груза для маршрута.
// max во всех элементах одинаковый — это максимум по выборке (для прогресс-баров на UI).
func (s *InsightsService) GetByCargo(ctx context.Context, fromCity, toCity, routeType string, periodDays int) ([]CargoBarDTO, error) {
	if periodDays <= 0 {
		periodDays = 30
	}
	cacheKey := fmt.Sprintf("by_cargo:%s:%s:%s:%dd", fromCity, toCity, routeType, periodDays)

	var result []CargoBarDTO
	err := s.cache.GetOrSet(ctx, cacheKey, 15*time.Minute, &result, func() (any, error) {
		items, err := s.repo.ByCargo(ctx, fromCity, toCity, routeType, periodDays)
		if err != nil {
			return nil, err
		}

		// Находим максимум — для нормализации прогресс-баров.
		var maxV float64
		for _, it := range items {
			if it.Avg > maxV {
				maxV = it.Avg
			}
		}

		bars := make([]CargoBarDTO, 0, len(items))
		for _, it := range items {
			bars = append(bars, CargoBarDTO{
				Label:    it.Cargo,
				Value:    round2(it.Avg),
				Max:      round2(maxV),
				Currency: "EUR",
			})
		}
		return bars, nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
