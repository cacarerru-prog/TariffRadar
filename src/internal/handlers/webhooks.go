// internal/handlers/webhooks.go — управление webhook'ами.
//
// Все эндпоинты требуют JWT и роль analyst+.
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"tariffradar/internal/middleware"
	"tariffradar/internal/models"
	"tariffradar/internal/repository"
)

// WebhooksHandler — обработчики webhooks.
type WebhooksHandler struct {
	repo  *repository.WebhookRepo
	plans *repository.PlanRepo
}

// NewWebhooksHandler — конструктор.
func NewWebhooksHandler(repo *repository.WebhookRepo, plans *repository.PlanRepo) *WebhooksHandler {
	return &WebhooksHandler{repo: repo, plans: plans}
}

// ── DTO ──────────────────────────────────────────────────────────────────────

type webhookDTO struct {
	ID      string         `json:"id"`
	URL     string         `json:"url"`
	Events  []string       `json:"events"`
	Filters map[string]any `json:"filters"`
	Active  bool           `json:"active"`
	Secret  string         `json:"secret,omitempty"` // возвращается ТОЛЬКО при создании
}

type createWebhookReq struct {
	URL     string         `json:"url"`
	Events  []string       `json:"events"`
	Filters map[string]any `json:"filters"`
}

// ── List ─────────────────────────────────────────────────────────────────────

func (h *WebhooksHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	items, err := h.repo.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось получить webhooks")
		return
	}

	out := make([]webhookDTO, 0, len(items))
	for _, it := range items {
		out = append(out, webhookDTO{
			ID:      it.ID.String(),
			URL:     it.URL,
			Events:  it.Events,
			Filters: it.Filters,
			Active:  it.Active,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

// ── Create ───────────────────────────────────────────────────────────────────

func (h *WebhooksHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}
	role, _ := middleware.RoleFromContext(r.Context())
	if role != models.RoleAnalyst && role != models.RoleAdmin {
		writeError(w, http.StatusForbidden, "forbidden",
			"Webhooks доступны только аналитикам и администраторам")
		return
	}

	// Проверка лимита тарифа.
	if h.plans != nil {
		up, err := h.plans.GetUserPlan(r.Context(), userID)
		if err == nil && up.WebhooksUsed >= up.Plan.WebhooksMax {
			writeError(w, http.StatusPaymentRequired, "plan_limit",
				"Достигнут лимит webhooks по вашему тарифу ("+up.Plan.Name+"). Обновите план.")
			return
		}
	}

	var req createWebhookReq
	if !readJSON(w, r, &req) {
		return
	}

	// Валидация URL.
	if req.URL == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "URL обязателен", "url")
		return
	}
	parsed, err := url.Parse(req.URL)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"URL должен начинаться с http:// или https://", "url")
		return
	}

	if len(req.Events) == 0 {
		req.Events = []string{"price.changed"}
	}
	if req.Filters == nil {
		req.Filters = map[string]any{}
	}

	// Генерируем секрет (32 байта → 64 hex-символа).
	secret, err := generateSecret(32)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось сгенерировать секрет")
		return
	}

	hook := &repository.Webhook{
		UserID:  userID,
		URL:     req.URL,
		Events:  req.Events,
		Filters: req.Filters,
		Secret:  secret,
	}
	if err := h.repo.Create(r.Context(), hook); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось создать webhook")
		return
	}

	writeJSON(w, http.StatusCreated, webhookDTO{
		ID: hook.ID.String(), URL: hook.URL, Events: hook.Events,
		Filters: hook.Filters, Active: hook.Active,
		Secret: hook.Secret, // показываем секрет ОДИН раз — при создании
	})
}

// ── Delete ───────────────────────────────────────────────────────────────────

func (h *WebhooksHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "ID должен быть UUID")
		return
	}

	if err := h.repo.Delete(r.Context(), userID, id); err != nil {
		if errors.Is(err, repository.ErrWebhookNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Webhook не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось удалить webhook")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// generateSecret — криптографически случайный hex-секрет.
func generateSecret(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
