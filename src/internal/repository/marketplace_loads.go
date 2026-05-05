// internal/repository/marketplace_loads.go — CRUD для таблицы marketplace_loads.
package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MarketplaceLoad — одно объявление на бирже грузов.
type MarketplaceLoad struct {
	ID           int64
	UserID       *uuid.UUID
	FromCity     string
	ToCity       string
	LoadType     string
	LoadDate     string
	CargoType    string
	Weight       string
	TruckType    string
	OfferedRate  float64
	Currency     string
	Status       string
	Company      string
	ContactPhone string
	BenchmarkPct *float64
	Comment      string
	CreatedAt    string
}

// MarketplaceFilter — параметры фильтрации списка объявлений.
type MarketplaceFilter struct {
	FromCity string
	ToCity   string
	LoadType string
	Status   string
	Page     int
	PerPage  int
}

// MarketplaceListResult — страница объявлений с пагинацией.
type MarketplaceListResult struct {
	Loads      []MarketplaceLoad
	Total      int64
	Page       int
	PerPage    int
	TotalPages int
}

// MarketplaceRepo — репозиторий маркетплейса грузов.
type MarketplaceRepo struct {
	db *pgxpool.Pool
}

// NewMarketplaceRepo — конструктор.
func NewMarketplaceRepo(db *pgxpool.Pool) *MarketplaceRepo {
	return &MarketplaceRepo{db: db}
}

// List — возвращает страницу объявлений с фильтрацией и пагинацией.
func (r *MarketplaceRepo) List(ctx context.Context, f MarketplaceFilter) (*MarketplaceListResult, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 || f.PerPage > 100 {
		f.PerPage = 50
	}

	var conditions []string
	var args []any
	argN := 1

	if f.FromCity != "" {
		conditions = append(conditions, fmt.Sprintf("from_city = $%d", argN))
		args = append(args, f.FromCity)
		argN++
	}
	if f.ToCity != "" {
		conditions = append(conditions, fmt.Sprintf("to_city = $%d", argN))
		args = append(args, f.ToCity)
		argN++
	}
	if f.LoadType != "" {
		conditions = append(conditions, fmt.Sprintf("load_type = $%d", argN))
		args = append(args, f.LoadType)
		argN++
	}
	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argN))
		args = append(args, f.Status)
		argN++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int64
	if err := r.db.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM marketplace_loads %s", where), args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("marketplace.List count: %w", err)
	}

	offset := (f.Page - 1) * f.PerPage
	listQ := fmt.Sprintf(`
		SELECT id, user_id, from_city, to_city, load_type,
		       load_date::text, cargo_type, weight, truck_type,
		       offered_rate, currency, status, company, contact_phone,
		       benchmark_pct, comment, created_at::text
		FROM marketplace_loads
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, argN, argN+1)
	args = append(args, f.PerPage, offset)

	rows, err := r.db.Query(ctx, listQ, args...)
	if err != nil {
		return nil, fmt.Errorf("marketplace.List query: %w", err)
	}
	defer rows.Close()

	var loads []MarketplaceLoad
	for rows.Next() {
		var l MarketplaceLoad
		var pgUID pgtype.UUID
		var benchPct pgtype.Numeric

		if err := rows.Scan(
			&l.ID, &pgUID, &l.FromCity, &l.ToCity, &l.LoadType,
			&l.LoadDate, &l.CargoType, &l.Weight, &l.TruckType,
			&l.OfferedRate, &l.Currency, &l.Status, &l.Company, &l.ContactPhone,
			&benchPct, &l.Comment, &l.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("marketplace.List scan: %w", err)
		}

		if pgUID.Valid {
			u := uuid.UUID(pgUID.Bytes)
			l.UserID = &u
		}
		if benchPct.Valid {
			f, _ := benchPct.Float64Value()
			if f.Valid {
				l.BenchmarkPct = &f.Float64
			}
		}
		loads = append(loads, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("marketplace.List rows: %w", err)
	}

	totalPages := int((total + int64(f.PerPage) - 1) / int64(f.PerPage))
	if totalPages == 0 {
		totalPages = 1
	}

	return &MarketplaceListResult{
		Loads: loads, Total: total, Page: f.Page,
		PerPage: f.PerPage, TotalPages: totalPages,
	}, nil
}

// Create — создаёт объявление. Заполняет l.ID и l.CreatedAt.
func (r *MarketplaceRepo) Create(ctx context.Context, userID uuid.UUID, l *MarketplaceLoad) error {
	const q = `
		INSERT INTO marketplace_loads
		    (user_id, from_city, to_city, load_type, load_date, cargo_type, weight,
		     truck_type, offered_rate, currency, status, company, contact_phone, benchmark_pct, comment)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		RETURNING id, created_at::text`
	return r.db.QueryRow(ctx, q,
		userID, l.FromCity, l.ToCity, l.LoadType, l.LoadDate, l.CargoType, l.Weight,
		l.TruckType, l.OfferedRate, l.Currency, l.Status, l.Company, l.ContactPhone,
		l.BenchmarkPct, l.Comment,
	).Scan(&l.ID, &l.CreatedAt)
}

// FindByID — возвращает объявление по ID вместе с user_id для проверки владельца.
func (r *MarketplaceRepo) FindByID(ctx context.Context, id int64) (*MarketplaceLoad, error) {
	const q = `
		SELECT id, user_id, from_city, to_city, load_type,
		       load_date::text, cargo_type, weight, truck_type,
		       offered_rate, currency, status, company, contact_phone,
		       benchmark_pct, comment, created_at::text
		FROM marketplace_loads WHERE id=$1`

	var l MarketplaceLoad
	var pgUID pgtype.UUID
	var benchPct pgtype.Numeric

	err := r.db.QueryRow(ctx, q, id).Scan(
		&l.ID, &pgUID, &l.FromCity, &l.ToCity, &l.LoadType,
		&l.LoadDate, &l.CargoType, &l.Weight, &l.TruckType,
		&l.OfferedRate, &l.Currency, &l.Status, &l.Company, &l.ContactPhone,
		&benchPct, &l.Comment, &l.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("marketplace.FindByID: %w", err)
	}

	if pgUID.Valid {
		u := uuid.UUID(pgUID.Bytes)
		l.UserID = &u
	}
	if benchPct.Valid {
		f, _ := benchPct.Float64Value()
		if f.Valid {
			l.BenchmarkPct = &f.Float64
		}
	}
	return &l, nil
}

// UpdateStatus — меняет статус объявления ('open' | 'taken' | 'cancelled').
func (r *MarketplaceRepo) UpdateStatus(ctx context.Context, id int64, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE marketplace_loads SET status=$1 WHERE id=$2`, status, id)
	return err
}

// Delete — удаляет объявление по ID.
func (r *MarketplaceRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM marketplace_loads WHERE id=$1`, id)
	return err
}
