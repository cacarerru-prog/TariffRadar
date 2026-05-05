// internal/handlers/deals.go — обработчики /api/v1/deals.
package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"tariffradar/internal/middleware"
	"tariffradar/internal/models"
	"tariffradar/internal/repository"
)

// DealsHandler — обработчики сделок.
type DealsHandler struct {
	deals *repository.DealRepo
}

// NewDealsHandler — конструктор.
func NewDealsHandler(deals *repository.DealRepo) *DealsHandler {
	return &DealsHandler{deals: deals}
}

// ── GET /api/v1/deals ────────────────────────────────────────────────────────

// dealsListResp — формат JSON-ответа со списком сделок.
type dealsListResp struct {
	Data       []dealItem `json:"data"`
	Pagination pagination `json:"pagination"`
}

type dealItem struct {
	ID       int64   `json:"id"`
	Date     string  `json:"date"` // формат "2006-01-02"
	Route    string  `json:"route"`
	Cargo    string  `json:"cargo"`
	Truck    string  `json:"truck"`
	Price    float64 `json:"price"`
	Currency string  `json:"currency"`
	Comment  string  `json:"comment,omitempty"`
}

type pagination struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// List — обработчик GET /api/v1/deals.
// Query-параметры:
//
//	?from=Минск&to=Москва&type=FTL&period=30D&page=1&per_page=20
func (h *DealsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	filter := repository.ListFilter{
		FromCity: q.Get("from"),
		ToCity:   q.Get("to"),
		Type:     q.Get("type"),
		Page:     atoiDefault(q.Get("page"), 1),
		PerPage:  atoiDefault(q.Get("per_page"), 20),
	}

	// Период: "7D", "30D", "90D", "1Y" — конвертируем в from..to.
	if period := q.Get("period"); period != "" {
		from, ok := periodToFromDate(period)
		if !ok {
			writeError(w, http.StatusBadRequest, "invalid_period",
				"Параметр period должен быть одним из: 7D, 30D, 90D, 1Y")
			return
		}
		filter.From = from
		filter.To = time.Now()
	}

	result, err := h.deals.List(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось получить список сделок")
		return
	}

	// Конвертируем доменные модели в DTO (формат для API).
	items := make([]dealItem, 0, len(result.Deals))
	for _, d := range result.Deals {
		items = append(items, dealItem{
			ID:       d.ID,
			Date:     d.DealDate.Format("2006-01-02"),
			Route:    d.Route,
			Cargo:    d.CargoType,
			Truck:    d.TruckType,
			Price:    d.Price,
			Currency: string(d.Currency),
			Comment:  d.Comment,
		})
	}

	writeJSON(w, http.StatusOK, dealsListResp{
		Data: items,
		Pagination: pagination{
			Page: result.Page, PerPage: result.PerPage,
			Total: result.Total, TotalPages: result.TotalPages,
		},
	})
}

// ── POST /api/v1/deals ───────────────────────────────────────────────────────

// createReq — тело запроса при добавлении сделки.
type createReq struct {
	From     string  `json:"from"`
	To       string  `json:"to"`
	Type     string  `json:"type"`
	Date     string  `json:"date"` // "2006-01-02"
	Cargo    string  `json:"cargo"`
	Truck    string  `json:"truck"`
	Price    float64 `json:"price"`
	Currency string  `json:"currency"`
	Comment  string  `json:"comment,omitempty"`
}

// allowedCargos — справочник допустимых типов груза (соответствует фронту).
var allowedCargos = map[string]bool{
	"FMCG": true, "Металл": true, "Одежда": true, "Продукты": true,
	"Химия": true, "Стройматериалы": true, "Мебель": true,
}

var allowedTrucks = map[string]bool{
	"Фура 20т": true, "Фура 10т": true, "Рефрижератор 20т": true, "Тентованный 20т": true,
}

var allowedCurrencies = map[string]bool{
	"EUR": true, "USD": true, "BYN": true, "RUB": true,
}

// Create — обработчик POST /api/v1/deals.
// Требует JWT (из middleware.Auth) и роль analyst или admin.
func (h *DealsHandler) Create(w http.ResponseWriter, r *http.Request) {
	// Извлекаем user_id и role из контекста (поставлены middleware.Auth).
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}
	role, _ := middleware.RoleFromContext(r.Context())
	if role != models.RoleAnalyst && role != models.RoleAdmin {
		writeError(w, http.StatusForbidden, "forbidden",
			"Добавление сделок доступно только аналитикам и администраторам")
		return
	}

	var req createReq
	if !readJSON(w, r, &req) {
		return
	}

	// Валидация.
	if req.From == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Поле 'from' обязательно", "from")
		return
	}
	if req.To == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Поле 'to' обязательно", "to")
		return
	}
	if req.Type != "FTL" && req.Type != "LTL" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Поле 'type' должно быть 'FTL' или 'LTL'", "type")
		return
	}
	if req.Price <= 0 {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Поле 'price' должно быть положительным", "price")
		return
	}
	if !allowedCurrencies[req.Currency] {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Валюта должна быть одной из: EUR, USD, BYN, RUB", "currency")
		return
	}
	// cargo и truck — обязательные поля. Фронт всегда даёт пользователю выбор
	// в селекте, поэтому пустое значение — это либо баг клиента, либо обход API
	// в обход формы. В обоих случаях правильнее вернуть 400, чем писать ""
	// в БД и потом ловить рассогласование с GET-выдачей.
	if req.Cargo == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Поле 'cargo' обязательно", "cargo")
		return
	}
	if !allowedCargos[req.Cargo] {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Недопустимый тип груза. Допустимо: FMCG, Металл, Одежда, Продукты, Химия, Стройматериалы, Мебель", "cargo")
		return
	}
	if req.Truck == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Поле 'truck' обязательно", "truck")
		return
	}
	if !allowedTrucks[req.Truck] {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Недопустимый тип ТС. Допустимо: Фура 20т, Фура 10т, Рефрижератор 20т, Тентованный 20т", "truck")
		return
	}

	// Парсинг даты (формат YYYY-MM-DD).
	var dealDate time.Time
	if req.Date == "" {
		dealDate = time.Now()
	} else {
		var err error
		dealDate, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			writeFieldError(w, http.StatusBadRequest, "validation_failed",
				"Дата должна быть в формате YYYY-MM-DD", "date")
			return
		}
	}
	// Дата не в будущем и не старше года.
	if dealDate.After(time.Now().Add(24 * time.Hour)) {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Дата не может быть в будущем", "date")
		return
	}
	if dealDate.Before(time.Now().AddDate(-1, 0, 0)) {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"Дата не может быть старше 1 года", "date")
		return
	}

	// Создаём сделку.
	deal := &models.Deal{
		DealDate:  dealDate,
		CargoType: req.Cargo,
		TruckType: req.Truck,
		Price:     req.Price,
		Currency:  models.Currency(req.Currency),
		Comment:   req.Comment,
	}

	if err := h.deals.Create(r.Context(), userID, req.From, req.To, req.Type, deal); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось сохранить сделку")
		return
	}

	// Возвращаем созданную сделку (без user_id).
	writeJSON(w, http.StatusCreated, dealItem{
		ID:       deal.ID,
		Date:     deal.DealDate.Format("2006-01-02"),
		Route:    req.From + " → " + req.To,
		Cargo:    deal.CargoType,
		Truck:    deal.TruckType,
		Price:    deal.Price,
		Currency: string(deal.Currency),
		Comment:  deal.Comment,
	})
}

// ── PATCH /api/v1/deals/{id} ─────────────────────────────────────────────────

type updateDealReq struct {
	Price   float64 `json:"price"`
	Comment string  `json:"comment"`
}

// Update — PATCH /api/v1/deals/{id}. Только владелец или admin.
func (h *DealsHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Некорректный ID сделки")
		return
	}

	var req updateDealReq
	if !readJSON(w, r, &req) {
		return
	}
	if req.Price <= 0 {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "price должен быть > 0", "price")
		return
	}

	deal, err := h.deals.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Сделка не найдена")
		return
	}

	role, _ := middleware.RoleFromContext(r.Context())
	if deal.UserID != userID && string(role) != "admin" {
		writeError(w, http.StatusForbidden, "forbidden", "Нет доступа к этой сделке")
		return
	}

	if err := h.deals.Update(r.Context(), id, req.Price, req.Comment); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось обновить сделку")
		return
	}

	writeJSON(w, http.StatusOK, dealItem{
		ID:       id,
		Date:     deal.DealDate.Format("2006-01-02"),
		Route:    deal.Route,
		Cargo:    deal.CargoType,
		Truck:    deal.TruckType,
		Price:    req.Price,
		Currency: string(deal.Currency),
		Comment:  req.Comment,
	})
}

// ── DELETE /api/v1/deals/{id} ────────────────────────────────────────────────

// Delete — DELETE /api/v1/deals/{id}. Только владелец или admin.
func (h *DealsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Некорректный ID сделки")
		return
	}

	deal, err := h.deals.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Сделка не найдена")
		return
	}

	role, _ := middleware.RoleFromContext(r.Context())
	if deal.UserID != userID && string(role) != "admin" {
		writeError(w, http.StatusForbidden, "forbidden", "Нет доступа к этой сделке")
		return
	}

	if err := h.deals.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось удалить сделку")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// ── helpers ──────────────────────────────────────────────────────────────────

// atoiDefault — парсит строку в int, при ошибке возвращает default.
func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}

// periodToFromDate — конвертирует "30D" / "1Y" в начальную дату периода.
func periodToFromDate(period string) (time.Time, bool) {
	now := time.Now()
	switch period {
	case "7D":
		return now.AddDate(0, 0, -7), true
	case "30D":
		return now.AddDate(0, 0, -30), true
	case "90D":
		return now.AddDate(0, 0, -90), true
	case "1Y":
		return now.AddDate(-1, 0, 0), true
	default:
		return time.Time{}, false
	}
}
