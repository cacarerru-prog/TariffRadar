// internal/repository/webhooks.go — работа с таблицей webhooks.
package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrWebhookNotFound — webhook не найден или принадлежит другому пользователю.
var ErrWebhookNotFound = errors.New("webhook не найден")

// Webhook — модель webhook'а в БД.
type Webhook struct {
	ID      uuid.UUID
	UserID  uuid.UUID
	URL     string
	Events  []string
	Filters map[string]any
	Secret  string
	Active  bool
}

// WebhookRepo — репозиторий webhooks.
type WebhookRepo struct {
	db *pgxpool.Pool
}

// NewWebhookRepo — конструктор.
func NewWebhookRepo(db *pgxpool.Pool) *WebhookRepo {
	return &WebhookRepo{db: db}
}

// Create — добавляет webhook.
func (r *WebhookRepo) Create(ctx context.Context, w *Webhook) error {
	filters, err := json.Marshal(w.Filters)
	if err != nil {
		return fmt.Errorf("webhooks.Create marshal filters: %w", err)
	}

	const query = `
		INSERT INTO webhooks (user_id, url, events, filters, secret)
		VALUES ($1, $2, $3, $4::JSONB, $5)
		RETURNING id, active`

	if err := r.db.QueryRow(ctx, query,
		w.UserID, w.URL, w.Events, string(filters), w.Secret,
	).Scan(&w.ID, &w.Active); err != nil {
		return fmt.Errorf("webhooks.Create: %w", err)
	}
	return nil
}

// ListByUser — все webhooks пользователя.
func (r *WebhookRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]Webhook, error) {
	const query = `
		SELECT id, user_id, url, events, filters::TEXT, secret, active
		FROM webhooks
		WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("webhooks.ListByUser: %w", err)
	}
	defer rows.Close()

	var out []Webhook
	for rows.Next() {
		var w Webhook
		var filtersJSON string
		if err := rows.Scan(&w.ID, &w.UserID, &w.URL, &w.Events, &filtersJSON, &w.Secret, &w.Active); err != nil {
			return nil, fmt.Errorf("webhooks.ListByUser scan: %w", err)
		}
		_ = json.Unmarshal([]byte(filtersJSON), &w.Filters)
		out = append(out, w)
	}
	return out, rows.Err()
}

// Delete — удаляет webhook (только если он принадлежит указанному пользователю).
func (r *WebhookRepo) Delete(ctx context.Context, userID, id uuid.UUID) error {
	const query = `DELETE FROM webhooks WHERE id = $1 AND user_id = $2`
	tag, err := r.db.Exec(ctx, query, id, userID)
	if err != nil {
		return fmt.Errorf("webhooks.Delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrWebhookNotFound
	}
	return nil
}

// ListActiveByEvent — возвращает все активные webhooks, подписанные на event.
// Используется диспетчером для рассылки уведомлений.
func (r *WebhookRepo) ListActiveByEvent(ctx context.Context, event string) ([]Webhook, error) {
	// $1 = ANY(events) — проверяем, что event присутствует в массиве postgres.
	const query = `
		SELECT id, user_id, url, events, filters::TEXT, secret, active
		FROM webhooks
		WHERE active = TRUE AND $1 = ANY(events)
		ORDER BY created_at`

	rows, err := r.db.Query(ctx, query, event)
	if err != nil {
		return nil, fmt.Errorf("webhooks.ListActiveByEvent: %w", err)
	}
	defer rows.Close()

	var out []Webhook
	for rows.Next() {
		var w Webhook
		var filtersJSON string
		if err := rows.Scan(&w.ID, &w.UserID, &w.URL, &w.Events, &filtersJSON, &w.Secret, &w.Active); err != nil {
			return nil, fmt.Errorf("webhooks.ListActiveByEvent scan: %w", err)
		}
		_ = json.Unmarshal([]byte(filtersJSON), &w.Filters)
		out = append(out, w)
	}
	return out, rows.Err()
}

// SaveDelivery — сохраняет запись о попытке доставки webhook'а.
// status = 0 означает сетевую ошибку (ответ от подписчика не получен).
func (r *WebhookRepo) SaveDelivery(ctx context.Context, webhookID uuid.UUID, payload []byte, status int) error {
	const query = `
		INSERT INTO webhook_deliveries (webhook_id, payload, response_status, attempt, delivered_at)
		VALUES ($1, $2::JSONB, $3, 1, now())`

	if _, err := r.db.Exec(ctx, query, webhookID, string(payload), status); err != nil {
		return fmt.Errorf("webhooks.SaveDelivery: %w", err)
	}
	return nil
}
