// internal/handlers/benchmark.go — обработчик POST /api/v1/benchmark.
package handlers

import (
	"net/http"

	"tariffradar/internal/service"
)

// BenchmarkHandler — обработчик benchmark.
type BenchmarkHandler struct {
	bench *service.BenchmarkService
}

// NewBenchmarkHandler — конструктор.
func NewBenchmarkHandler(bench *service.BenchmarkService) *BenchmarkHandler {
	return &BenchmarkHandler{bench: bench}
}

// benchmarkReq — тело запроса.
type benchmarkReq struct {
	From     string  `json:"from"`
	To       string  `json:"to"`
	Type     string  `json:"type"`
	UserRate float64 `json:"user_rate"`
	Currency string  `json:"currency"`
	Period   string  `json:"period,omitempty"` // 7D | 30D | 90D
}

// Calculate — POST /api/v1/benchmark.
func (h *BenchmarkHandler) Calculate(w http.ResponseWriter, r *http.Request) {
	var req benchmarkReq
	if !readJSON(w, r, &req) {
		return
	}

	if req.From == "" || req.To == "" {
		writeError(w, http.StatusBadRequest, "missing_params", "Обязательны 'from' и 'to'")
		return
	}
	if req.Type == "" {
		req.Type = "FTL"
	}
	if req.UserRate <= 0 {
		writeFieldError(w, http.StatusBadRequest, "validation_failed",
			"user_rate должен быть положительным", "user_rate")
		return
	}

	periodDays := 30
	switch req.Period {
	case "7D", "7Д":
		periodDays = 7
	case "90D", "90Д":
		periodDays = 90
	}

	result, err := h.bench.Calculate(r.Context(), service.BenchmarkInput{
		From: req.From, To: req.To, Type: req.Type,
		UserRate: req.UserRate, Currency: req.Currency,
		PeriodDays: periodDays,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось рассчитать benchmark")
		return
	}
	writeJSON(w, http.StatusOK, result)
}
