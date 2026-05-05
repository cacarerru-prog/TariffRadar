// internal/handlers/marketplace.go — обработчики /api/v1/marketplace/loads.
package handlers

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"tariffradar/internal/middleware"
	"tariffradar/internal/repository"
)

// MarketplaceHandler — обработчики биржи грузов.
type MarketplaceHandler struct {
	repo *repository.MarketplaceRepo
}

// NewMarketplaceHandler — конструктор.
func NewMarketplaceHandler(repo *repository.MarketplaceRepo) *MarketplaceHandler {
	return &MarketplaceHandler{repo: repo}
}

// loadItem — формат JSON-ответа для одного объявления.
type loadItem struct {
	ID           int64    `json:"id"`
	UserID       *string  `json:"user_id,omitempty"`
	From         string   `json:"from"`
	To           string   `json:"to"`
	Type         string   `json:"type"`
	Date         string   `json:"date"`
	Cargo        string   `json:"cargo"`
	Weight       string   `json:"weight"`
	Truck        string   `json:"truck"`
	Price        float64  `json:"price"`
	Currency     string   `json:"currency"`
	Status       string   `json:"status"`
	Company      string   `json:"company"`
	Contact      string   `json:"contact"`
	Benchmark    *float64 `json:"benchmark,omitempty"`
	Comment      string   `json:"comment,omitempty"`
	CreatedAt    string   `json:"created_at"`
}

func toLoadItem(l repository.MarketplaceLoad) loadItem {
	item := loadItem{
		ID:        l.ID,
		From:      l.FromCity,
		To:        l.ToCity,
		Type:      l.LoadType,
		Date:      l.LoadDate,
		Cargo:     l.CargoType,
		Weight:    l.Weight,
		Truck:     l.TruckType,
		Price:     l.OfferedRate,
		Currency:  l.Currency,
		Status:    l.Status,
		Company:   l.Company,
		Contact:   l.ContactPhone,
		Benchmark: l.BenchmarkPct,
		Comment:   l.Comment,
		CreatedAt: l.CreatedAt,
	}
	if l.UserID != nil {
		s := l.UserID.String()
		item.UserID = &s
	}
	return item
}

// ── GET /api/v1/marketplace/loads ────────────────────────────────────────────

type loadsListResp struct {
	Data       []loadItem `json:"data"`
	Pagination pagination `json:"pagination"`
}

// List — обработчик GET /api/v1/marketplace/loads (публичный).
func (h *MarketplaceHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := repository.MarketplaceFilter{
		FromCity: q.Get("from"),
		ToCity:   q.Get("to"),
		LoadType: q.Get("type"),
		Status:   q.Get("status"),
		Page:     atoiDefault(q.Get("page"), 1),
		PerPage:  atoiDefault(q.Get("per_page"), 50),
	}

	result, err := h.repo.List(r.Context(), f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось получить список объявлений")
		return
	}

	items := make([]loadItem, 0, len(result.Loads))
	for _, l := range result.Loads {
		items = append(items, toLoadItem(l))
	}

	writeJSON(w, http.StatusOK, loadsListResp{
		Data: items,
		Pagination: pagination{
			Page: result.Page, PerPage: result.PerPage,
			Total: result.Total, TotalPages: result.TotalPages,
		},
	})
}

// ── POST /api/v1/marketplace/loads ───────────────────────────────────────────

type createLoadReq struct {
	From     string  `json:"from"`
	To       string  `json:"to"`
	Type     string  `json:"type"`
	Date     string  `json:"date"`
	Cargo    string  `json:"cargo"`
	Weight   string  `json:"weight"`
	Truck    string  `json:"truck"`
	Price    float64 `json:"price"`
	Currency string  `json:"currency"`
	Company  string  `json:"company"`
	Contact  string  `json:"contact"`
	Comment  string  `json:"comment"`
}

var allowedLoadCurrencies = map[string]bool{"EUR": true, "USD": true, "BYN": true, "RUB": true}
var allowedLoadTypes      = map[string]bool{"FTL": true, "LTL": true}

// Create — POST /api/v1/marketplace/loads. Требует JWT.
func (h *MarketplaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	var req createLoadReq
	if !readJSON(w, r, &req) {
		return
	}

	if req.From == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Поле 'from' обязательно", "from")
		return
	}
	if req.To == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Поле 'to' обязательно", "to")
		return
	}
	if !allowedLoadTypes[req.Type] {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Тип перевозки: FTL или LTL", "type")
		return
	}
	if req.Date == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Укажите дату загрузки", "date")
		return
	}
	if req.Price <= 0 {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Ставка должна быть больше 0", "price")
		return
	}
	if !allowedLoadCurrencies[req.Currency] {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Валюта: EUR, USD, BYN или RUB", "currency")
		return
	}
	if req.Company == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Укажите название компании", "company")
		return
	}
	if req.Contact == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Укажите контактный телефон", "contact")
		return
	}
	if req.Weight == "" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Укажите вес груза", "weight")
		return
	}

	load := &repository.MarketplaceLoad{
		FromCity:     req.From,
		ToCity:       req.To,
		LoadType:     req.Type,
		LoadDate:     req.Date,
		CargoType:    req.Cargo,
		Weight:       req.Weight,
		TruckType:    req.Truck,
		OfferedRate:  req.Price,
		Currency:     req.Currency,
		Status:       "open",
		Company:      req.Company,
		ContactPhone: req.Contact,
		Comment:      req.Comment,
	}

	if err := h.repo.Create(r.Context(), userID, load); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось сохранить объявление")
		return
	}

	writeJSON(w, http.StatusCreated, toLoadItem(*load))
}

// ── PATCH /api/v1/marketplace/loads/{id} ─────────────────────────────────────

type updateLoadReq struct {
	Status string `json:"status"`
}

// Update — PATCH /api/v1/marketplace/loads/{id}. Требует JWT; только владелец или admin.
func (h *MarketplaceHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Некорректный ID")
		return
	}

	var req updateLoadReq
	if !readJSON(w, r, &req) {
		return
	}
	if req.Status != "open" && req.Status != "taken" && req.Status != "cancelled" {
		writeFieldError(w, http.StatusBadRequest, "validation_failed", "Статус: open, taken или cancelled", "status")
		return
	}

	load, err := h.repo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Объявление не найдено")
		return
	}

	role, _ := middleware.RoleFromContext(r.Context())
	if load.UserID == nil || *load.UserID != userID {
		if string(role) != "admin" {
			writeError(w, http.StatusForbidden, "forbidden", "Нет доступа к этому объявлению")
			return
		}
	}

	if err := h.repo.UpdateStatus(r.Context(), id, req.Status); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось обновить статус")
		return
	}

	load.Status = req.Status
	writeJSON(w, http.StatusOK, toLoadItem(*load))
}

// ── DELETE /api/v1/marketplace/loads/{id} ────────────────────────────────────

// Delete — DELETE /api/v1/marketplace/loads/{id}. Требует JWT; только владелец или admin.
func (h *MarketplaceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Некорректный ID")
		return
	}

	load, err := h.repo.FindByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Объявление не найдено")
		return
	}

	role, _ := middleware.RoleFromContext(r.Context())
	if load.UserID == nil || *load.UserID != userID {
		if string(role) != "admin" {
			writeError(w, http.StatusForbidden, "forbidden", "Нет доступа к этому объявлению")
			return
		}
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось удалить объявление")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
