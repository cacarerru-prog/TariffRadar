// internal/repository/cache.go — обёртка над Redis для кэширования JSON.
//
// Идея: вместо того чтобы в каждом сервисе писать
//
//	bytes, _ := redis.Get(ctx, key).Bytes()
//	json.Unmarshal(bytes, &result)
//	...
//	data, _ := json.Marshal(value)
//	redis.Set(ctx, key, data, ttl)
//
// — мы инкапсулируем это в Cache.GetOrSet, который сам ходит в Redis,
// проверяет hit/miss, и при miss зовёт fn() и кладёт результат обратно.
//
// Использование:
//
//	var stats StatsDTO
//	err := cache.GetOrSet(ctx, "stats:minsk:moscow:FTL:30D", 5*time.Minute, &stats, func() (any, error) {
//	    return computeStatsFromDB(ctx, ...)
//	})
package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache — обёртка над Redis-клиентом с JSON-сериализацией.
type Cache struct {
	client *redis.Client
}

// NewCache — конструктор.
func NewCache(client *redis.Client) *Cache {
	return &Cache{client: client}
}

// Get — пытается достать значение из кэша.
// Возвращает (true, nil), если кэш-hit, и (false, nil), если miss.
// Ошибка возвращается только при реальном сбое Redis (не при miss).
func (c *Cache) Get(ctx context.Context, key string, dst any) (bool, error) {
	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return false, nil // miss — это не ошибка
		}
		return false, fmt.Errorf("cache.Get redis: %w", err)
	}
	if err := json.Unmarshal(data, dst); err != nil {
		// Битый JSON в кэше — лечим удалением и возвращаем miss.
		_ = c.client.Del(ctx, key).Err()
		return false, nil
	}
	return true, nil
}

// Set — кладёт значение в кэш с указанным TTL.
func (c *Cache) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("cache.Set marshal: %w", err)
	}
	if err := c.client.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("cache.Set redis: %w", err)
	}
	return nil
}

// Del — удаляет ключ (используется при инвалидации).
func (c *Cache) Del(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return c.client.Del(ctx, keys...).Err()
}

// GetOrSet — главный helper: возвращает значение из кэша, либо вычисляет и кладёт.
//
// Параметры:
//
//	key  — ключ в Redis
//	ttl  — срок жизни записи
//	dst  — указатель, в который мы запишем результат (либо из кэша, либо из fn)
//	fn   — функция, которая будет вызвана только при cache-miss; возвращает значение,
//	       которое нужно положить в кэш и одновременно записать в dst.
//
// Если Redis упал — функция всё равно вызовет fn() и вернёт результат
// (приложение продолжит работать, просто медленнее).
func (c *Cache) GetOrSet(
	ctx context.Context,
	key string,
	ttl time.Duration,
	dst any,
	fn func() (any, error),
) error {
	// Шаг 1. Пробуем достать из кэша.
	hit, err := c.Get(ctx, key, dst)
	if err == nil && hit {
		return nil
	}

	// Шаг 2. Cache miss или Redis упал — вычисляем заново.
	value, err := fn()
	if err != nil {
		return err
	}

	// Шаг 3. Перекладываем результат в dst через JSON (унифицированно).
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("cache.GetOrSet marshal value: %w", err)
	}
	if err := json.Unmarshal(data, dst); err != nil {
		return fmt.Errorf("cache.GetOrSet unmarshal to dst: %w", err)
	}

	// Шаг 4. Кладём в кэш (best-effort, ошибку логируем неявно — не падаем из-за неё).
	_ = c.client.Set(ctx, key, data, ttl).Err()
	return nil
}
