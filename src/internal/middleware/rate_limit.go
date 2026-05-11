// internal/middleware/rate_limit.go — лимит запросов в минуту по тарифу пользователя.
//
// Алгоритм: фиксированное окно в 60s. Redis INCR ключа rl:{user_id}:{minute_unix}.
// При первом запросе ставим EXPIRE 60s. Превышение → 429.
//
// План пользователя берётся из БД (быстрый запрос, ~1мс). Если хотите ещё быстрее —
// можно кэшировать план в Redis на 60s.
package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"tariffradar/internal/repository"
)

// RateLimit — middleware с лимитом по тарифу пользователя.
// Если planRepo вернул ошибку (нет подписки и т.п.) — пропускаем запрос (fail-open).
func RateLimit(redisClient *redis.Client, plans *repository.PlanRepo) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := UserIDFromContext(r.Context())
			if !ok {
				next.ServeHTTP(w, r) // нет user_id — пусть auth middleware решает
				return
			}

			up, err := plans.GetUserPlan(r.Context(), userID)
			if err != nil || up.Plan.RateLimit <= 0 {
				next.ServeHTTP(w, r)
				return
			}

			minute := time.Now().Unix() / 60
			key := fmt.Sprintf("rl:%s:%d", userID, minute)

			n, err := redisClient.Incr(r.Context(), key).Result()
			if err != nil {
				// Redis недоступен — пропускаем (fail-open).
				next.ServeHTTP(w, r)
				return
			}
			if n == 1 {
				_ = redisClient.Expire(r.Context(), key, 65*time.Second).Err()
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(up.Plan.RateLimit))
			w.Header().Set("X-RateLimit-Remaining", strconv.FormatInt(max64(0, int64(up.Plan.RateLimit)-n), 10))

			if n > int64(up.Plan.RateLimit) {
				w.Header().Set("Retry-After", "60")
				w.Header().Set("Content-Type", "application/json; charset=utf-8")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"error":{"code":"rate_limit","message":"Превышен лимит запросов по вашему тарифу"}}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func max64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
