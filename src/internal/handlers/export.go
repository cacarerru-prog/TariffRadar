// internal/handlers/export.go — выгрузка сделок в CSV/Excel.
//
// Эндпоинт:
//
//	GET /api/v1/export/deals?format=csv|xlsx&from=&to=&period=
package handlers

import (
	"io"
	"net/http"
	"strings"
	"time"

	"tariffradar/internal/repository"
	"tariffradar/internal/service"
)

// ExportHandler — обработчик экспорта.
type ExportHandler struct {
	export *service.ExportService
}

// NewExportHandler — конструктор.
func NewExportHandler(export *service.ExportService) *ExportHandler {
	return &ExportHandler{export: export}
}

// Deals — GET /api/v1/export/deals.
func (h *ExportHandler) Deals(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	format := strings.ToLower(q.Get("format"))
	if format == "" {
		format = "csv"
	}
	if format != "csv" && format != "xlsx" {
		writeError(w, http.StatusBadRequest, "invalid_format",
			"Параметр 'format' должен быть 'csv' или 'xlsx'")
		return
	}

	filter := repository.ListFilter{
		FromCity: q.Get("from"),
		ToCity:   q.Get("to"),
		Type:     q.Get("type"),
	}
	if period := q.Get("period"); period != "" {
		from, ok := periodToFromDate(period)
		if !ok {
			writeError(w, http.StatusBadRequest, "invalid_period",
				"period должен быть одним из: 7D, 30D, 90D, 1Y")
			return
		}
		filter.From = from
		filter.To = time.Now()
	}

	var (
		reader      io.Reader
		err         error
		contentType string
		ext         string
	)

	if format == "csv" {
		reader, err = h.export.ExportCSV(r.Context(), filter)
		contentType = "text/csv; charset=utf-8"
		ext = "csv"
	} else {
		reader, err = h.export.ExportXLSX(r.Context(), filter)
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		ext = "xlsx"
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error",
			"Не удалось сформировать файл экспорта")
		return
	}

	filename := "tariffradar_deals_" + time.Now().Format("2006-01-02") + "." + ext
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	_, _ = io.Copy(w, reader)
}
