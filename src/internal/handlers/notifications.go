// internal/handlers/notifications.go — GET/PATCH /me/notifications.
package handlers

import (
	"net/http"

	"tariffradar/internal/middleware"
	"tariffradar/internal/repository"
)

// NotificationsHandler — обработчики настроек уведомлений.
type NotificationsHandler struct {
	repo *repository.NotificationsRepo
}

// NewNotificationsHandler — конструктор.
func NewNotificationsHandler(repo *repository.NotificationsRepo) *NotificationsHandler {
	return &NotificationsHandler{repo: repo}
}

// notificationsDTO — JSON-формат, шарится между GET и PATCH.
type notificationsDTO struct {
	PriceAlerts    bool `json:"price_alerts"`
	WeeklyDigest   bool `json:"weekly_digest"`
	BenchmarkTips  bool `json:"benchmark_tips"`
	NewDeals       bool `json:"new_deals"`
}

// Get — GET /api/v1/me/notifications.
func (h *NotificationsHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	s, err := h.repo.Get(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось загрузить настройки уведомлений")
		return
	}

	writeJSON(w, http.StatusOK, notificationsDTO{
		PriceAlerts:   s.PriceAlerts,
		WeeklyDigest:  s.WeeklyDigest,
		BenchmarkTips: s.BenchmarkTips,
		NewDeals:      s.NewDeals,
	})
}

// Patch — PATCH /api/v1/me/notifications. Принимает полный объект.
func (h *NotificationsHandler) Patch(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	var req notificationsDTO
	if !readJSON(w, r, &req) {
		return
	}

	if err := h.repo.Update(r.Context(), userID, repository.NotificationSettings{
		PriceAlerts:   req.PriceAlerts,
		WeeklyDigest:  req.WeeklyDigest,
		BenchmarkTips: req.BenchmarkTips,
		NewDeals:      req.NewDeals,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось сохранить настройки")
		return
	}

	writeJSON(w, http.StatusOK, req)
}
