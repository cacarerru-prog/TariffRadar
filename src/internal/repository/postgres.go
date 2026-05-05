// internal/repository/postgres.go — пул соединений с PostgreSQL.
//
// Используем pgx/v5 — это быстрая, идиоматичная Go-библиотека для PG.
// Под капотом — connection pool: соединения создаются по требованию и
// переиспользуются между запросами. Это критично для производительности.
//
// Что делает NewPostgres:
//  1. Парсит DSN и создаёт конфиг пула.
//  2. Настраивает таймауты и количество соединений (под наши требования —
//     «50+ одновременных пользователей», ставим max=20 коннектов).
//  3. Делает Ping, чтобы убедиться, что БД доступна на старте.
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPostgres — создаёт и настраивает пул соединений с PostgreSQL.
// Возвращает ошибку, если не удалось подключиться.
func NewPostgres(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("postgres: парсинг DSN: %w", err)
	}

	// Настройки пула.
	cfg.MaxConns = 20                       // максимум 20 одновременных соединений
	cfg.MinConns = 2                        // держим 2 соединения наготове
	cfg.MaxConnLifetime = 30 * time.Minute  // переоткрывать соединения каждые 30 минут
	cfg.MaxConnIdleTime = 5 * time.Minute   // закрывать соединения, простаивающие > 5 минут
	cfg.HealthCheckPeriod = 1 * time.Minute // как часто проверять живость соединений

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("postgres: создание пула: %w", err)
	}

	// Контрольный Ping — убеждаемся, что БД реально отвечает.
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("postgres: ping не прошёл: %w", err)
	}

	return pool, nil
}
