// internal/repository/redis.go — клиент Redis.
//
// Redis нужен для трёх целей:
//  1. Кэширование агрегатов (stats:*, trends:*) — ускоряет ответы API.
//  2. Blacklist для JWT — чтобы logout реально работал.
//  3. Rate-limiting — счётчик запросов на пользователя в минуту.
//
// Используем go-redis/v9 — официальный клиент.
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// NewRedis — создаёт клиент Redis и проверяет, что он доступен.
func NewRedis(ctx context.Context, addr, password string, db int) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		DialTimeout:  3 * time.Second,
		ReadTimeout:  2 * time.Second,
		WriteTimeout: 2 * time.Second,
		PoolSize:     10, // 10 соединений в пуле
	})

	// Контрольный Ping.
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("redis: ping не прошёл: %w", err)
	}

	return client, nil
}
