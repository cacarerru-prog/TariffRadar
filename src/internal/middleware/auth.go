// internal/middleware/auth.go — middleware аутентификации.
//
// Что делает:
//  1. Достаёт JWT-токен из заголовка `Authorization: Bearer <token>`.
//  2. Валидирует его через AuthService.
//  3. Кладёт user_id и role в context.Context запроса — handler'ы
//     могут получить их через UserIDFromContext / RoleFromContext.
//
// Если токен невалиден или отсутствует — отвечает 401.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"tariffradar/internal/models"
	"tariffradar/internal/service"
)

// ctxKey — приватный тип для ключей контекста (защита от коллизий).
type ctxKey int

const (
	ctxUserID ctxKey = iota
	ctxRole
)

// Auth — middleware, требующее валидный JWT.
// Использование (в роутере): r.With(authMW).Get("/api/v1/me", handler)
func Auth(authSvc *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Извлекаем заголовок Authorization.
			header := r.Header.Get("Authorization")
			if header == "" {
				writeUnauthorized(w, "Требуется заголовок Authorization")
				return
			}

			// Формат должен быть "Bearer <token>".
			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				writeUnauthorized(w, "Ожидается формат 'Bearer <token>'")
				return
			}

			// Валидируем токен.
			claims, err := authSvc.ValidateToken(parts[1])
			if err != nil {
				writeUnauthorized(w, "Невалидный или истёкший токен")
				return
			}

			// Парсим UserID из стандартного поля Subject (куда он записан при генерации токена).
			userID, parseErr := uuid.Parse(claims.Subject)
			if parseErr != nil {
				writeUnauthorized(w, "Невалидный токен: некорректный user_id")
				return
			}

			// Кладём данные пользователя в context для handler-ов.
			ctx := context.WithValue(r.Context(), ctxUserID, userID)
			ctx = context.WithValue(ctx, ctxRole, claims.Role)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
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
