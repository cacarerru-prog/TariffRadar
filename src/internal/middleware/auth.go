// internal/middleware/auth.go — middleware аутентификации.
//
// Что делает:
//  1. Извлекает токен из `Authorization: Bearer <token>`.
//  2. Если токен начинается с `trk_` — валидирует как API-ключ через APIKeyRepo + UserRepo.
//     Иначе — валидирует как JWT через AuthService.
//  3. Кладёт user_id и role в context.Context запроса.
//
// Если токен невалиден или отсутствует — отвечает 401.
package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"tariffradar/internal/models"
	"tariffradar/internal/repository"
	"tariffradar/internal/service"
)

// ctxKey — приватный тип для ключей контекста (защита от коллизий).
type ctxKey int

const (
	ctxUserID ctxKey = iota
	ctxRole
)

// Auth — middleware, требующее валидный JWT или API-ключ.
// apiKeys и users могут быть nil — тогда поддерживаются только JWT (для совместимости).
func Auth(authSvc *service.AuthService, apiKeys *repository.APIKeyRepo, users *repository.UserRepo) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				writeUnauthorized(w, "Требуется заголовок Authorization")
				return
			}

			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				writeUnauthorized(w, "Ожидается формат 'Bearer <token>'")
				return
			}

			token := parts[1]

			// Авторизация по API-ключу.
			if strings.HasPrefix(token, "trk_") {
				if apiKeys == nil || users == nil {
					writeUnauthorized(w, "API-ключи не поддерживаются")
					return
				}
				userID, role, ok := authenticateAPIKey(r.Context(), token, apiKeys, users)
				if !ok {
					writeUnauthorized(w, "Невалидный API-ключ")
					return
				}
				ctx := context.WithValue(r.Context(), ctxUserID, userID)
				ctx = context.WithValue(ctx, ctxRole, role)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Авторизация по JWT.
			claims, err := authSvc.ValidateToken(token)
			if err != nil {
				writeUnauthorized(w, "Невалидный или истёкший токен")
				return
			}
			// Проверка blacklist (после logout).
			if authSvc.IsTokenBlacklisted(r.Context(), token) {
				writeUnauthorized(w, "Сессия завершена — войдите снова")
				return
			}

			userID, parseErr := uuid.Parse(claims.Subject)
			if parseErr != nil {
				writeUnauthorized(w, "Невалидный токен: некорректный user_id")
				return
			}

			ctx := context.WithValue(r.Context(), ctxUserID, userID)
			ctx = context.WithValue(ctx, ctxRole, claims.Role)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// authenticateAPIKey — проверяет API-ключ, возвращает user_id и роль владельца.
func authenticateAPIKey(ctx context.Context, rawKey string, keys *repository.APIKeyRepo, users *repository.UserRepo) (uuid.UUID, models.Role, bool) {
	sum := sha256.Sum256([]byte(rawKey))
	hash := hex.EncodeToString(sum[:])

	k, err := keys.FindByHash(ctx, hash)
	if err != nil {
		return uuid.Nil, "", false
	}

	u, err := users.FindByID(ctx, k.UserID)
	if err != nil {
		return uuid.Nil, "", false
	}

	return k.UserID, u.Role, true
}

// UserIDFromContext — достаёт user_id из контекста (после Auth-middleware).
func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(ctxUserID).(uuid.UUID)
	return v, ok
}

// RoleFromContext — достаёт role из контекста.
func RoleFromContext(ctx context.Context) (models.Role, bool) {
	v, ok := ctx.Value(ctxRole).(models.Role)
	return v, ok
}

// writeUnauthorized — отдаёт стандартный 401-ответ.
func writeUnauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":{"code":"unauthorized","message":"` + message + `"}}`))
}
