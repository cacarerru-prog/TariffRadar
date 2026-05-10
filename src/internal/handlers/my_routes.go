// internal/handlers/my_routes.go — обработчики «Мои маршруты».
//
// Все эндпоинты требуют JWT.
package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"tariffradar/internal/middleware"
	"tariffradar/internal/repository"
)

// MyRoutesHandler — обработчики избранных маршрутов.
type MyRoutesHandler struct {
	repo  *repository.UserRouteRepo
	plans *repository.PlanRepo
}

// NewMyRoutesHandler — конструктор.
func NewMyRoutesHandler(repo *repository.UserRouteRepo, plans *repository.PlanRepo) *MyRoutesHandler {
	return &MyRoutesHandler{repo: repo, plans: plans}
}

// savedRouteDTO — формат записи в JSON-ответе.
type savedRouteDTO struct {
	ID    int64  `json:"id"`
	From  string `json:"from"`
	To    string `json:"to"`
	Type  string `json:"type"`
	Stats struct {
		Avg        float64 `json:"avg"`
		ChangePct  float64 `json:"change_pct"`
		DealsCount int64   `json:"deals_count"`
		Currency   string  `json:"currency"`
	} `json:"stats"`
}

// List — GET /api/v1/my/routes.
func (h *MyRoutesHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	items, err := h.repo.List(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось получить избранные маршруты")
		return
	}

	out := make([]savedRouteDTO, 0, len(items))
	for _, it := range items {
		var dto savedRouteDTO
		dto.ID = it.ID
		dto.From = it.FromCity
		dto.To = it.ToCity
		dto.Type = it.Type
		dto.Stats.Avg = round2(it.Avg)
		dto.Stats.ChangePct = it.ChangePct
		dto.Stats.DealsCount = it.DealsCount
		dto.Stats.Currency = it.Currency
		out = append(out, dto)
	}
	writeJSON(w, http.StatusOK, out)
}

// addRouteReq — тело POST /api/v1/my/routes.
type addRouteReq struct {
	From string `json:"from"`
	To   string `json:"to"`
	Type string `json:"type"`
}

// Add — POST /api/v1/my/routes.
func (h *MyRoutesHandler) Add(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	var req addRouteReq
	if !readJSON(w, r, &req) {
		return
	}
	if req.From == "" || req.To == "" {
		writeError(w, http.StatusBadRequest, "missing_params", "Обязательны 'from' и 'to'")
		return
	}
	if req.Type == "" {
		req.Type = "FTL"
	}
	if req.Type != "FTL" && req.Type != "LTL" {
		writeError(w, http.StatusBadRequest, "invalid_type", "type должен быть 'FTL' или 'LTL'")
		return
	}

	// Проверка лимита тарифа.
	if h.plans != nil {
		up, err := h.plans.GetUserPlan(r.Context(), userID)
		if err == nil && up.RoutesUsed >= up.Plan.RoutesMax {
			writeError(w, http.StatusPaymentRequired, "plan_limit",
				"Достигнут лимит избранных маршрутов по вашему тарифу ("+up.Plan.Name+"). Обновите план.")
			return
		}
	}

	id, err := h.repo.Add(r.Context(), userID, req.From, req.To, req.Type)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось добавить маршрут")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":   id,
		"from": req.From,
		"to":   req.To,
		"type": req.Type,
	})
}

// Remove — DELETE /api/v1/my/routes/{id}.
func (h *MyRoutesHandler) Remove(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_id", "ID должен быть положительным числом")
		return
	}

	if err := h.repo.Remove(r.Context(), userID, id); err != nil {
		if errors.Is(err, repository.ErrRouteNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Маршрут не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось удалить маршрут")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// round2 — округление до 2 знаков (дублирующая копия для пакета handlers).
// Использован простой helper, чтобы handler не зависел от service.
func round2(v float64) float64 {
	return float64(int(v*100)) / 100
}
