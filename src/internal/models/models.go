// internal/models/models.go — структуры данных приложения.
//
// Здесь живут «доменные» типы — то, чем оперирует бизнес-логика:
// User, Route, Deal и т.п. Эти структуры используются и в репозитории
// (для SQL-сканирования), и в сервисном слое, и в JSON-ответах.
//
// Тэги:
//
//	db   — имя колонки в PostgreSQL (для pgx-сканирования)
//	json — имя поля в JSON-ответе API (используется handler-ами)
package models

import (
	"time"

	"github.com/google/uuid"
)

// Role — роль пользователя в системе.
type Role string

const (
	RoleViewer  Role = "viewer"  // только просмотр
	RoleAnalyst Role = "analyst" // может добавлять сделки и вебхуки
	RoleAdmin   Role = "admin"   // полный доступ
)

// RouteType — тип перевозки.
type RouteType string

const (
	RouteFTL RouteType = "FTL" // полная фура
	RouteLTL RouteType = "LTL" // сборный груз
)

// Currency — валюта сделки.
type Currency string

const (
	CurrencyEUR Currency = "EUR"
	CurrencyUSD Currency = "USD"
	CurrencyBYN Currency = "BYN"
	CurrencyRUB Currency = "RUB"
)

// User — пользователь системы.
type User struct {
	ID            uuid.UUID `db:"id"             json:"id"`
	Email         string    `db:"email"          json:"email"`
	PasswordHash  string    `db:"password_hash"  json:"-"` // никогда не уходит в JSON
	Name          string    `db:"name"           json:"name,omitempty"`
	Company       string    `db:"company"        json:"company,omitempty"`
	Phone         string    `db:"phone"          json:"phone,omitempty"`
	Role          Role      `db:"role"           json:"role"`
	EmailVerified bool      `db:"email_verified" json:"email_verified"`
	CreatedAt     time.Time `db:"created_at"     json:"created_at"`
	UpdatedAt     time.Time `db:"updated_at"     json:"updated_at"`
}

// Route — маршрут (откуда, куда, тип).
type Route struct {
	ID        int64     `db:"id"         json:"id"`
	FromCity  string    `db:"from_city"  json:"from"`
	ToCity    string    `db:"to_city"    json:"to"`
	Type      RouteType `db:"type"       json:"type"`
	CreatedAt time.Time `db:"created_at" json:"-"`
}

// Deal — сделка на перевозку.
// Поле UserID намеренно с json:"-" — в API оно никогда не уходит,
// данные обезличены.
type Deal struct {
	ID        int64     `db:"id"         json:"id"`
	RouteID   int64     `db:"route_id"   json:"-"`
	UserID    uuid.UUID `db:"user_id"    json:"-"`
	DealDate  time.Time `db:"deal_date"  json:"date"`
	CargoType string    `db:"cargo_type" json:"cargo"`
	TruckType string    `db:"truck_type" json:"truck"`
	Price     float64   `db:"price"      json:"price"`
	Currency  Currency  `db:"currency"   json:"currency"`
	Comment   string    `db:"comment"    json:"comment,omitempty"`
	CreatedAt time.Time `db:"created_at" json:"-"`

	// Поля для JSON-выдачи (заполняются из JOIN с routes).
	Route string `db:"route" json:"route,omitempty"`
}

// RouteStats — агрегированная статистика по маршруту.
// Используется для KPI-карточек на Dashboard и Search.
type RouteStats struct {
	Avg        float64  `json:"avg"`
	Min        float64  `json:"min"`
	Max        float64  `json:"max"`
	Currency   Currency `json:"currency"`
	ChangePct  float64  `json:"change_pct"`
	ChangeAbs  float64  `json:"change_abs"`
	DealsCount int64    `json:"deals_count"`
}

// TimeSeries — данные для line-chart на Dashboard.
type TimeSeries struct {
	Period string    `json:"period"` // "7Д" | "30Д" | "90Д" | "1Г"
	Labels []string  `json:"labels"`
	Values []float64 `json:"values"`
}

// BenchmarkResult — результат сравнения ставки с рынком.
type BenchmarkResult struct {
	Market         RouteStats `json:"market"`
	UserRate       float64    `json:"user_rate"`
	DiffAbs        float64    `json:"diff_abs"`
	DiffPct        float64    `json:"diff_pct"`
	Verdict        string     `json:"verdict"` // "below_market" | "at_market" | "above_market"
	Percentile     int        `json:"percentile"`
	Recommendation string     `json:"recommendation"`
}
