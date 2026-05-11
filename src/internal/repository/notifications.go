// internal/repository/notifications.go — настройки уведомлений пользователя.
package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NotificationSettings — флаги уведомлений.
type NotificationSettings struct {
	PriceAlerts    bool
	WeeklyDigest   bool
	BenchmarkTips  bool
	NewDeals       bool
}

// NotificationsRepo — репозиторий настроек уведомлений.
type NotificationsRepo struct {
	db *pgxpool.Pool
}

// NewNotificationsRepo — конструктор.
func NewNotificationsRepo(db *pgxpool.Pool) *NotificationsRepo {
	return &NotificationsRepo{db: db}
}

// Get — возвращает настройки пользователя.
// Если записи нет (миграция применена после создания пользователя) — создаёт с дефолтами.
func (r *NotificationsRepo) Get(ctx context.Context, userID uuid.UUID) (*NotificationSettings, error) {
	const query = `
		INSERT INTO user_notifications (user_id)
		VALUES ($1)
		ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
		RETURNING price_alerts, weekly_digest, benchmark_tips, new_deals`

	var s NotificationSettings
	if err := r.db.QueryRow(ctx, query, userID).Scan(
		&s.PriceAlerts, &s.WeeklyDigest, &s.BenchmarkTips, &s.NewDeals,
	); err != nil {
		return nil, fmt.Errorf("notifications.Get: %w", err)
	}
	return &s, nil
}

// Update — обновляет настройки. Все 4 поля передаются явно, чтобы handler контролировал что именно меняется.
func (r *NotificationsRepo) Update(ctx context.Context, userID uuid.UUID, s NotificationSettings) error {
	const query = `
		INSERT INTO user_notifications (user_id, price_alerts, weekly_digest, benchmark_tips, new_deals)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE
		SET price_alerts   = EXCLUDED.price_alerts,
		    weekly_digest  = EXCLUDED.weekly_digest,
		    benchmark_tips = EXCLUDED.benchmark_tips,
		    new_deals      = EXCLUDED.new_deals`

	if _, err := r.db.Exec(ctx, query, userID, s.PriceAlerts, s.WeeklyDigest, s.BenchmarkTips, s.NewDeals); err != nil {
		return fmt.Errorf("notifications.Update: %w", err)
	}
	return nil
}
