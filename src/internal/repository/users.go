// internal/repository/users.go — работа с таблицей users.
//
// Repository-слой инкапсулирует SQL и возвращает доменные структуры.
// Бизнес-логика (хеширование пароля, генерация JWT) живёт в service-слое.
package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"tariffradar/internal/models"
)

// ErrUserNotFound — возвращается, когда пользователь не найден.
// Удобнее, чем pgx.ErrNoRows — service-слой может проверить именно «не найден»,
// а не ловить SQL-специфичную ошибку.
var ErrUserNotFound = errors.New("пользователь не найден")

// ErrUserExists — возвращается при попытке зарегистрировать существующий email.
var ErrUserExists = errors.New("пользователь с таким email уже существует")

// UserRepo — репозиторий пользователей.
type UserRepo struct {
	db *pgxpool.Pool
}

// NewUserRepo — конструктор.
func NewUserRepo(db *pgxpool.Pool) *UserRepo {
	return &UserRepo{db: db}
}

// Create — создаёт нового пользователя.
// Если email уже занят — возвращает ErrUserExists.
func (r *UserRepo) Create(ctx context.Context, u *models.User) error {
	const query = `
		INSERT INTO users (email, password_hash, name, company, phone, role)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRow(ctx, query,
		u.Email, u.PasswordHash, u.Name, u.Company, u.Phone, u.Role,
	).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)

	if err != nil {
		// Проверка на нарушение UNIQUE constraint на email.
		// Postgres-код 23505 = "unique_violation".
		if isUniqueViolation(err) {
			return ErrUserExists
		}
		return fmt.Errorf("users.Create: %w", err)
	}
	return nil
}

// FindByEmail — поиск по email (для логина).
func (r *UserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	const query = `
		SELECT id, email, password_hash, name, company, phone, role, email_verified, created_at, updated_at
		FROM users
		WHERE email = $1`

	var u models.User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Company, &u.Phone,
		&u.Role, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("users.FindByEmail: %w", err)
	}
	return &u, nil
}

// FindByID — поиск по UUID (для middleware, чтобы проверить, что user существует).
func (r *UserRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	const query = `
		SELECT id, email, password_hash, name, company, phone, role, email_verified, created_at, updated_at
		FROM users
		WHERE id = $1`

	var u models.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Company, &u.Phone,
		&u.Role, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("users.FindByID: %w", err)
	}
	return &u, nil
}

// UpdateProfile — обновляет имя, компанию, телефон пользователя.
func (r *UserRepo) UpdateProfile(ctx context.Context, id uuid.UUID, name, company, phone string) error {
	const query = `
		UPDATE users SET name=$1, company=$2, phone=$3
		WHERE id=$4`
	_, err := r.db.Exec(ctx, query, name, company, phone, id)
	if err != nil {
		return fmt.Errorf("users.UpdateProfile: %w", err)
	}
	return nil
}

// UpdatePassword — сохраняет новый bcrypt-хеш пароля.
func (r *UserRepo) UpdatePassword(ctx context.Context, id uuid.UUID, newHash string) error {
	const query = `UPDATE users SET password_hash=$1 WHERE id=$2`
	_, err := r.db.Exec(ctx, query, newHash, id)
	if err != nil {
		return fmt.Errorf("users.UpdatePassword: %w", err)
	}
	return nil
}

// MarkEmailVerified — выставляет email_verified=TRUE.
func (r *UserRepo) MarkEmailVerified(ctx context.Context, id uuid.UUID) error {
	const query = `UPDATE users SET email_verified=TRUE WHERE id=$1`
	if _, err := r.db.Exec(ctx, query, id); err != nil {
		return fmt.Errorf("users.MarkEmailVerified: %w", err)
	}
	return nil
}

// isUniqueViolation — определяет, что ошибка — это нарушение UNIQUE constraint.
// Использует pgconn.PgError.Code == "23505", что надёжно на любой Postgres-локали.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
