// internal/repository/api_keys.go — работа с API-ключами.
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrAPIKeyNotFound — ключ не найден или принадлежит другому пользователю.
var ErrAPIKeyNotFound = errors.New("API-ключ не найден")

// APIKey — модель ключа (без секрета — секрет показывается только при создании).
type APIKey struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	Name       string
	Prefix     string
	LastUsedAt *time.Time
	CreatedAt  time.Time
	ExpiresAt  *time.Time
}

// APIKeyRepo — репозиторий API-ключей.
type APIKeyRepo struct {
	db *pgxpool.Pool
}

// NewAPIKeyRepo — конструктор.
func NewAPIKeyRepo(db *pgxpool.Pool) *APIKeyRepo {
	return &APIKeyRepo{db: db}
}

// Create — сохраняет ключ в БД (key_hash и prefix должны быть вычислены до вызова).
func (r *APIKeyRepo) Create(ctx context.Context, k *APIKey, keyHash string) error {
	const query = `
		INSERT INTO api_keys (user_id, name, key_hash, prefix, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`

	if err := r.db.QueryRow(ctx, query,
		k.UserID, k.Name, keyHash, k.Prefix, k.ExpiresAt,
	).Scan(&k.ID, &k.CreatedAt); err != nil {
		return fmt.Errorf("api_keys.Create: %w", err)
	}
	return nil
}

// ListByUser — все ключи пользователя.
func (r *APIKeyRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]APIKey, error) {
	const query = `
		SELECT id, user_id, name, prefix, last_used_at, created_at, expires_at
		FROM api_keys
		WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("api_keys.ListByUser: %w", err)
	}
	defer rows.Close()

	var out []APIKey
	for rows.Next() {
		var k APIKey
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.Prefix, &k.LastUsedAt, &k.CreatedAt, &k.ExpiresAt); err != nil {
			return nil, fmt.Errorf("api_keys.ListByUser scan: %w", err)
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

// Delete — удаляет ключ (только если он принадлежит указанному пользователю).
func (r *APIKeyRepo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	const query = `DELETE FROM api_keys WHERE id = $1 AND user_id = $2`
	tag, err := r.db.Exec(ctx, query, id, userID)
	if err != nil {
		return fmt.Errorf("api_keys.Delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrAPIKeyNotFound
	}
	return nil
}

// FindByHash — ищет ключ по SHA-256 хешу (используется middleware при авторизации).
// Если ключ найден — обновляет last_used_at.
func (r *APIKeyRepo) FindByHash(ctx context.Context, keyHash string) (*APIKey, error) {
	const query = `
		UPDATE api_keys SET last_used_at = now()
		WHERE key_hash = $1
		  AND (expires_at IS NULL OR expires_at > now())
		RETURNING id, user_id, name, prefix, last_used_at, created_at, expires_at`

	var k APIKey
	err := r.db.QueryRow(ctx, query, keyHash).Scan(
		&k.ID, &k.UserID, &k.Name, &k.Prefix, &k.LastUsedAt, &k.CreatedAt, &k.ExpiresAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("api_keys.FindByHash: %w", err)
	}
	return &k, nil
}
