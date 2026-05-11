// internal/repository/tokens.go — короткоживущие токены в Redis.
//
// Используется для email-верификации и сброса пароля.
// Ключ: "<namespace>:<token>" → user_id (string), с TTL.
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// ErrTokenNotFound — токена нет в Redis (истёк или фейк).
var ErrTokenNotFound = errors.New("токен не найден или истёк")

// TokenRepo — хранит короткоживущие токены в Redis.
type TokenRepo struct {
	r *redis.Client
}

// NewTokenRepo — конструктор.
func NewTokenRepo(r *redis.Client) *TokenRepo {
	return &TokenRepo{r: r}
}

// Set — сохраняет (namespace, token) → user_id с TTL.
func (t *TokenRepo) Set(ctx context.Context, namespace, token string, userID uuid.UUID, ttl time.Duration) error {
	key := namespace + ":" + token
	if err := t.r.Set(ctx, key, userID.String(), ttl).Err(); err != nil {
		return fmt.Errorf("tokens.Set: %w", err)
	}
	return nil
}

// Blacklist — добавляет произвольную строку в blacklist на TTL.
// Используется для инвалидации JWT при logout.
func (t *TokenRepo) Blacklist(ctx context.Context, value string, ttl time.Duration) error {
	if err := t.r.Set(ctx, "blacklist:"+value, "1", ttl).Err(); err != nil {
		return fmt.Errorf("tokens.Blacklist: %w", err)
	}
	return nil
}

// IsBlacklisted — проверяет, был ли value заблэклисчен.
func (t *TokenRepo) IsBlacklisted(ctx context.Context, value string) bool {
	n, err := t.r.Exists(ctx, "blacklist:"+value).Result()
	if err != nil {
		return false
	}
	return n > 0
}

// Consume — атомарно возвращает user_id и удаляет ключ (одноразовое использование).
func (t *TokenRepo) Consume(ctx context.Context, namespace, token string) (uuid.UUID, error) {
	key := namespace + ":" + token
	val, err := t.r.GetDel(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return uuid.Nil, ErrTokenNotFound
		}
		return uuid.Nil, fmt.Errorf("tokens.Consume: %w", err)
	}
	id, err := uuid.Parse(val)
	if err != nil {
		return uuid.Nil, fmt.Errorf("tokens.Consume parse: %w", err)
	}
	return id, nil
}
