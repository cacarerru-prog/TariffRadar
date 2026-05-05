// internal/repository/deals.go — работа с таблицей deals (сделки).
//
// Здесь:
//   - List: пагинированная выборка сделок с JOIN на routes.
//   - Create: добавление сделки + автосоздание маршрута, если его ещё нет.
//   - GetOrCreateRoute: вспомогательный метод для маршрутов.
package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"tariffradar/internal/models"
)

// DealRepo — репозиторий сделок.
type DealRepo struct {
	db *pgxpool.Pool
}

// NewDealRepo — конструктор.
func NewDealRepo(db *pgxpool.Pool) *DealRepo {
	return &DealRepo{db: db}
}

// ListFilter — параметры фильтрации списка сделок.
type ListFilter struct {
	FromCity string    // если "" — не фильтруем
	ToCity   string    // если "" — не фильтруем
	Type     string    // "FTL" | "LTL" | ""
	From     time.Time // дата сделки >=
	To       time.Time // дата сделки <=
	Page     int       // от 1
	PerPage  int       // 1..100
}

// ListResult — результат выборки с пагинацией.
type ListResult struct {
	Deals      []models.Deal
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// List — возвращает страницу сделок с указанными фильтрами.
// Если фильтр пустой (нулевые поля) — возвращаются все сделки за всё время.
func (r *DealRepo) List(ctx context.Context, f ListFilter) (*ListResult, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 || f.PerPage > 100 {
		f.PerPage = 20
	}

	// Динамически собираем WHERE-условия и аргументы.
	var conditions []string
	var args []any
	argN := 1

	if f.FromCity != "" {
		conditions = append(conditions, fmt.Sprintf("r.from_city = $%d", argN))
		args = append(args, f.FromCity)
		argN++
	}
	if f.ToCity != "" {
		conditions = append(conditions, fmt.Sprintf("r.to_city = $%d", argN))
		args = append(args, f.ToCity)
		argN++
	}
	if f.Type != "" {
		conditions = append(conditions, fmt.Sprintf("r.type = $%d", argN))
		args = append(args, f.Type)
		argN++
	}
	if !f.From.IsZero() {
		conditions = append(conditions, fmt.Sprintf("d.deal_date >= $%d", argN))
		args = append(args, f.From)
		argN++
	}
	if !f.To.IsZero() {
		conditions = append(conditions, fmt.Sprintf("d.deal_date <= $%d", argN))
		args = append(args, f.To)
		argN++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Считаем total для пагинации.
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM deals d
		JOIN routes r ON r.id = d.route_id
		%s`, whereClause)

	var total int64
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("deals.List count: %w", err)
	}

	// Выбираем страницу.
	offset := (f.Page - 1) * f.PerPage
	listQuery := fmt.Sprintf(`
		SELECT
			d.id, d.deal_date, d.cargo_type, d.truck_type,
			d.price, d.currency, d.comment,
			r.from_city || ' → ' || r.to_city AS route
		FROM deals d
		JOIN routes r ON r.id = d.route_id
		%s
		ORDER BY d.deal_date DESC, d.id DESC
		LIMIT $%d OFFSET $%d`, whereClause, argN, argN+1)
	args = append(args, f.PerPage, offset)

	rows, err := r.db.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("deals.List query: %w", err)
	}
	defer rows.Close()

	var deals []models.Deal
	for rows.Next() {
		var d models.Deal
		if err := rows.Scan(
			&d.ID, &d.DealDate, &d.CargoType, &d.TruckType,
			&d.Price, &d.Currency, &d.Comment, &d.Route,
		); err != nil {
			return nil, fmt.Errorf("deals.List scan: %w", err)
		}
		deals = append(deals, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("deals.List rows: %w", err)
	}

	totalPages := int((total + int64(f.PerPage) - 1) / int64(f.PerPage))
	if totalPages == 0 {
		totalPages = 1
	}

	return &ListResult{
		Deals: deals, Total: total, Page: f.Page,
		PerPage: f.PerPage, TotalPages: totalPages,
	}, nil
}

// Create — добавляет сделку. Маршрут (from, to, type) находится или создаётся
// автоматически. Возвращает созданную сделку с заполненным ID.
func (r *DealRepo) Create(ctx context.Context, userID uuid.UUID, fromCity, toCity, routeType string, d *models.Deal) error {
	// Используем транзакцию: если что-то пойдёт не так — откатим.
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("deals.Create begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck — Rollback после Commit безопасен

	// Шаг 1. Получаем или создаём route.
	routeID, err := getOrCreateRouteTx(ctx, tx, fromCity, toCity, routeType)
	if err != nil {
		return err
	}
	d.RouteID = routeID
	d.UserID = userID

	// Шаг 2. Вставляем сделку.
	const insertQuery = `
		INSERT INTO deals (route_id, user_id, deal_date, cargo_type, truck_type, price, currency, comment)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at`

	err = tx.QueryRow(ctx, insertQuery,
		d.RouteID, d.UserID, d.DealDate, d.CargoType, d.TruckType,
		d.Price, d.Currency, d.Comment,
	).Scan(&d.ID, &d.CreatedAt)
	if err != nil {
		return fmt.Errorf("deals.Create insert: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("deals.Create commit: %w", err)
	}
	return nil
}

// FindByID — возвращает сделку по ID (включает user_id для проверки владельца).
func (r *DealRepo) FindByID(ctx context.Context, id int64) (*models.Deal, error) {
	const query = `
		SELECT d.id, d.route_id, d.user_id, d.deal_date, d.cargo_type, d.truck_type,
		       d.price, d.currency, d.comment, d.created_at,
		       r.from_city || ' → ' || r.to_city AS route
		FROM deals d JOIN routes r ON r.id = d.route_id
		WHERE d.id = $1`

	var d models.Deal
	err := r.db.QueryRow(ctx, query, id).Scan(
		&d.ID, &d.RouteID, &d.UserID, &d.DealDate, &d.CargoType, &d.TruckType,
		&d.Price, &d.Currency, &d.Comment, &d.CreatedAt, &d.Route,
	)
	if err != nil {
		return nil, fmt.Errorf("deals.FindByID: %w", err)
	}
	return &d, nil
}

// Update — обновляет цену и/или комментарий сделки.
func (r *DealRepo) Update(ctx context.Context, id int64, price float64, comment string) error {
	const query = `UPDATE deals SET price=$1, comment=$2 WHERE id=$3`
	_, err := r.db.Exec(ctx, query, price, comment, id)
	if err != nil {
		return fmt.Errorf("deals.Update: %w", err)
	}
	return nil
}

// Delete — удаляет сделку по ID.
func (r *DealRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM deals WHERE id=$1`, id)
	if err != nil {
		return fmt.Errorf("deals.Delete: %w", err)
	}
	return nil
}

// getOrCreateRouteTx — внутри транзакции находит или создаёт маршрут.
// ON CONFLICT гарантирует атомарность при конкурентных запросах:
// если два потока одновременно пытаются создать одинаковый маршрут,
// второй INSERT не упадёт с ошибкой, а вернёт уже существующий id.
func getOrCreateRouteTx(ctx context.Context, tx pgx.Tx, from, to, routeType string) (int64, error) {
	const query = `
		INSERT INTO routes (from_city, to_city, type)
		VALUES ($1, $2, $3)
		ON CONFLICT (from_city, to_city, type) DO UPDATE SET from_city = EXCLUDED.from_city
		RETURNING id`

	var id int64
	if err := tx.QueryRow(ctx, query, from, to, routeType).Scan(&id); err != nil {
		return 0, fmt.Errorf("getOrCreateRoute: %w", err)
	}
	return id, nil
}
