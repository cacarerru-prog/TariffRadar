// internal/repository/plans.go — работа с тарифными планами и подписками.
package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrPlanNotFound — план с таким кодом отсутствует.
var ErrPlanNotFound = errors.New("план не найден")

// Plan — тарифный план.
type Plan struct {
	Code             string
	Name             string
	PriceBYN         float64
	RoutesMax        int
	ExportsPerMonth  int
	WebhooksMax      int
	HistoryDays      int
	RateLimit        int
}

// UserPlan — план текущего пользователя + использование лимитов.
type UserPlan struct {
	Plan            Plan
	Status          string
	WebhooksUsed    int
	RoutesUsed      int
}

// PlanRepo — репозиторий планов и подписок.
type PlanRepo struct {
	db *pgxpool.Pool
}

// NewPlanRepo — конструктор.
func NewPlanRepo(db *pgxpool.Pool) *PlanRepo {
	return &PlanRepo{db: db}
}

// GetByCode — возвращает план по коду (free/pro/enterprise).
func (r *PlanRepo) GetByCode(ctx context.Context, code string) (*Plan, error) {
	const query = `
		SELECT code, name, price_byn, routes_max, exports_per_month, webhooks_max, history_days, rate_limit
		FROM plans WHERE code = $1`

	var p Plan
	err := r.db.QueryRow(ctx, query, code).Scan(
		&p.Code, &p.Name, &p.PriceBYN,
		&p.RoutesMax, &p.ExportsPerMonth, &p.WebhooksMax,
		&p.HistoryDays, &p.RateLimit,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPlanNotFound
		}
		return nil, fmt.Errorf("plans.GetByCode: %w", err)
	}
	return &p, nil
}

// GetUserPlan — план пользователя + текущее использование лимитов.
// Если у пользователя нет подписки — возвращает free (на случай гонок при регистрации).
func (r *PlanRepo) GetUserPlan(ctx context.Context, userID uuid.UUID) (*UserPlan, error) {
	const query = `
		SELECT
			p.code, p.name, p.price_byn,
			p.routes_max, p.exports_per_month, p.webhooks_max, p.history_days, p.rate_limit,
			COALESCE(s.status, 'active') AS status,
			(SELECT COUNT(*) FROM webhooks    WHERE user_id = $1) AS webhooks_used,
			(SELECT COUNT(*) FROM user_routes WHERE user_id = $1) AS routes_used
		FROM plans p
		LEFT JOIN user_subscriptions s ON s.user_id = $1
		WHERE p.code = COALESCE(s.plan_code, 'free')`

	var up UserPlan
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&up.Plan.Code, &up.Plan.Name, &up.Plan.PriceBYN,
		&up.Plan.RoutesMax, &up.Plan.ExportsPerMonth, &up.Plan.WebhooksMax,
		&up.Plan.HistoryDays, &up.Plan.RateLimit,
		&up.Status, &up.WebhooksUsed, &up.RoutesUsed,
	)
	if err != nil {
		return nil, fmt.Errorf("plans.GetUserPlan: %w", err)
	}
	return &up, nil
}

// EnsureSubscription — создаёт подписку на free, если её ещё нет.
// Вызывается при регистрации; idempotent.
func (r *PlanRepo) EnsureSubscription(ctx context.Context, userID uuid.UUID) error {
	const query = `
		INSERT INTO user_subscriptions (user_id, plan_code)
		VALUES ($1, 'free')
		ON CONFLICT (user_id) DO NOTHING`

	if _, err := r.db.Exec(ctx, query, userID); err != nil {
		return fmt.Errorf("plans.EnsureSubscription: %w", err)
	}
	return nil
}

// SetUserPlan — переключает пользователя на указанный план (используется биллингом/админкой).
// expiresAt = nil означает бессрочную подписку.
func (r *PlanRepo) SetUserPlan(ctx context.Context, userID uuid.UUID, planCode string, expiresAt *string) error {
	const query = `
		INSERT INTO user_subscriptions (user_id, plan_code, expires_at, status)
		VALUES ($1, $2, $3, 'active')
		ON CONFLICT (user_id) DO UPDATE
		SET plan_code  = EXCLUDED.plan_code,
		    expires_at = EXCLUDED.expires_at,
		    status     = 'active',
		    started_at = now()`

	if _, err := r.db.Exec(ctx, query, userID, planCode, expiresAt); err != nil {
		return fmt.Errorf("plans.SetUserPlan: %w", err)
	}
	return nil
}
