// internal/handlers/insights.go — обработчики /api/v1/insights/*.
package handlers

import (
	"net/http"

	"tariffradar/internal/service"
)

// InsightsHandler — обработчики аналитики.
type InsightsHandler struct {
	insights *service.InsightsService
}

// NewInsightsHandler — конструктор.
func NewInsightsHandler(insights *service.InsightsService) *InsightsHandler {
	return &InsightsHandler{insights: insights}
}

// ── GET /api/v1/insights/trends ──────────────────────────────────────────────
//
// Query: ?period=30D&limit=5
//
// Возвращает топ растущих и падающих маршрутов.
func (h *InsightsHandler) Trends(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	periodDays := 30
	switch q.Get("period") {
	case "7D", "7Д":
		periodDays = 7
	case "30D", "30Д", "":
		periodDays = 30
	case "90D", "90Д":
		periodDays = 90
	default:
		writeError(w, http.StatusBadRequest, "invalid_period",
			"Период должен быть одним из: 7D, 30D, 90D")
		return
	}

	limit := atoiDefault(q.Get("limit"), 5)
	if limit < 1 {
		limit = 5
	}
	if limit > 20 {
		limit = 20
	}

	result, err := h.insights.GetTrends(r.Context(), periodDays, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось рассчитать тренды")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// ── GET /api/v1/insights/seasonality ─────────────────────────────────────────
//
// Query: ?from=Минск,%20Беларусь&to=Москва,%20Россия&type=FTL
func (h *InsightsHandler) Seasonality(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	from, to := q.Get("from"), q.Get("to")
	if from == "" || to == "" {
		writeError(w, http.StatusBadRequest, "missing_params",
			"Обязательны параметры 'from' и 'to'")
		return
	}
	routeType := q.Get("type")
	if routeType == "" {
		routeType = "FTL"
	}

	result, err := h.insights.GetSeasonality(r.Context(), from, to, routeType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось рассчитать сезонность")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// ── GET /api/v1/insights/by-cargo ────────────────────────────────────────────
//
// Query: ?from=&to=&type=FTL&period=30D
func (h *InsightsHandler) ByCargo(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	from, to := q.Get("from"), q.Get("to")
	if from == "" || to == "" {
		writeError(w, http.StatusBadRequest, "missing_params",
			"Обязательны параметры 'from' и 'to'")
		return
	}
	routeType := q.Get("type")
	if routeType == "" {
		routeType = "FTL"
	}

	periodDays := 30
	switch q.Get("period") {
	case "7D", "7Д":
		periodDays = 7
	case "90D", "90Д":
		periodDays = 90
	}

	result, err := h.insights.GetByCargo(r.Context(), from, to, routeType, periodDays)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось рассчитать по типу груза")
		return
	}
	writeJSON(w, http.StatusOK, result)
}
