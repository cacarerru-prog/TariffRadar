// internal/handlers/plans.go — публичный справочник тарифных планов.
package handlers

import (
	"net/http"

	"tariffradar/internal/repository"
)

// PlansHandler — обработчик списка планов.
type PlansHandler struct {
	plans *repository.PlanRepo
}

// NewPlansHandler — конструктор.
func NewPlansHandler(plans *repository.PlanRepo) *PlansHandler {
	return &PlansHandler{plans: plans}
}

// planDTO — формат плана для публичного списка.
type planDTO struct {
	Code             string  `json:"code"`
	Name             string  `json:"name"`
	PriceBYN         float64 `json:"price_byn"`
	RoutesMax        int     `json:"routes_max"`
	ExportsPerMonth  int     `json:"exports_per_month"`
	WebhooksMax      int     `json:"webhooks_max"`
	HistoryDays      int     `json:"history_days"`
	RateLimit        int     `json:"rate_limit"`
}

// List — GET /api/v1/plans (публично).
func (h *PlansHandler) List(w http.ResponseWriter, r *http.Request) {
	plans, err := h.plans.ListAll(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось загрузить тарифы")
		return
	}

	out := make([]planDTO, 0, len(plans))
	for _, p := range plans {
		out = append(out, planDTO{
			Code: p.Code, Name: p.Name, PriceBYN: p.PriceBYN,
			RoutesMax: p.RoutesMax, ExportsPerMonth: p.ExportsPerMonth,
			WebhooksMax: p.WebhooksMax, HistoryDays: p.HistoryDays, RateLimit: p.RateLimit,
		})
	}
	writeJSON(w, http.StatusOK, out)
}
