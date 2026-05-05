// internal/handlers/market.go — обработчики /api/v1/market/*.
package handlers

import (
	"errors"
	"net/http"

	"tariffradar/internal/service"
)

// MarketHandler — обработчики рыночной статистики.
type MarketHandler struct {
	market *service.MarketService
}

// NewMarketHandler — конструктор.
func NewMarketHandler(market *service.MarketService) *MarketHandler {
	return &MarketHandler{market: market}
}

// ── GET /api/v1/market/stats ─────────────────────────────────────────────────
//
// Query-параметры:
//
//	from   — город отправления (например, "Минск, Беларусь")
//	to     — город назначения
//	type   — "FTL" | "LTL" (по умолчанию "FTL")
//	period — "7Д" | "30Д" | "90Д" | "1Г" (по умолчанию "30Д")
//
// Возвращает: KPI + series для line-chart.
func (h *MarketHandler) Stats(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	from := q.Get("from")
	to := q.Get("to")
	if from == "" || to == "" {
		writeError(w, http.StatusBadRequest, "missing_params",
			"Обязательны параметры 'from' и 'to'")
		return
	}

	routeType := q.Get("type")
	if routeType == "" {
		routeType = "FTL"
	}
	if routeType != "FTL" && routeType != "LTL" {
		writeError(w, http.StatusBadRequest, "invalid_type",
			"Параметр 'type' должен быть 'FTL' или 'LTL'")
		return
	}

	result, err := h.market.GetStats(r.Context(), from, to, routeType, q.Get("period"))
	if err != nil {
		if errors.Is(err, service.ErrInvalidPeriod) {
			writeError(w, http.StatusBadRequest, "invalid_period", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось получить статистику")
		return
	}

	writeJSON(w, http.StatusOK, result)
}
