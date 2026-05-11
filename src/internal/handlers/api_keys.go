// internal/handlers/api_keys.go — управление API-ключами пользователя.
//
// Формат ключа: `trk_live_<32 hex>`. В БД хранится только SHA-256 хеш.
// Сам ключ показывается ОДИН раз — в ответе на POST /me/api-keys.
package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"tariffradar/internal/middleware"
	"tariffradar/internal/repository"
)

// APIKeysHandler — обработчики API-ключей.
type APIKeysHandler struct {
	repo *repository.APIKeyRepo
}

// NewAPIKeysHandler — конструктор.
func NewAPIKeysHandler(repo *repository.APIKeyRepo) *APIKeysHandler {
	return &APIKeysHandler{repo: repo}
}

// ── DTO ──────────────────────────────────────────────────────────────────────

type apiKeyDTO struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	Prefix     string     `json:"prefix"`
	Key        string     `json:"key,omitempty"` // показывается ТОЛЬКО при создании
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
}

type createAPIKeyReq struct {
	Name      string     `json:"name"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// ── List ─────────────────────────────────────────────────────────────────────

func (h *APIKeysHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	items, err := h.repo.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось получить ключи")
		return
	}

	out := make([]apiKeyDTO, 0, len(items))
	for _, k := range items {
		out = append(out, apiKeyDTO{
			ID: k.ID.String(), Name: k.Name, Prefix: k.Prefix,
			LastUsedAt: k.LastUsedAt, CreatedAt: k.CreatedAt, ExpiresAt: k.ExpiresAt,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

// ── Create ───────────────────────────────────────────────────────────────────

func (h *APIKeysHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	var req createAPIKeyReq
	if !readJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Имя ключа обязательно", "name")
		return
	}

	// Генерируем ключ: trk_live_<32 hex>.
	raw, err := generateAPIKey()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось сгенерировать ключ")
		return
	}
	keyHash := sha256Hex(raw)
	prefix := raw[:16] // например, trk_live_abc1234

	k := &repository.APIKey{
		UserID:    userID,
		Name:      req.Name,
		Prefix:    prefix,
		ExpiresAt: req.ExpiresAt,
	}
	if err := h.repo.Create(r.Context(), k, keyHash); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось создать ключ")
		return
	}

	writeJSON(w, http.StatusCreated, apiKeyDTO{
		ID: k.ID.String(), Name: k.Name, Prefix: k.Prefix,
		Key:       raw, // показываем полный ключ ОДИН раз
		CreatedAt: k.CreatedAt, ExpiresAt: k.ExpiresAt,
	})
}

// ── Delete ───────────────────────────────────────────────────────────────────

func (h *APIKeysHandler) Delete(w http.ResponseWriter, r *http.Request) {
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
		if errors.Is(err, repository.ErrAPIKeyNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Ключ не найден")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось удалить ключ")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── helpers ──────────────────────────────────────────────────────────────────

// generateAPIKey — создаёт ключ формата "trk_live_<32hex>".
func generateAPIKey() (string, error) {
	b := make([]byte, 16) // 16 байт = 32 hex-символа
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "trk_live_" + hex.EncodeToString(b), nil
}

// sha256Hex — SHA-256 хеш в hex.
func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}
