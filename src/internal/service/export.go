// internal/service/export.go — экспорт сделок в CSV и Excel.
package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"time"

	"github.com/xuri/excelize/v2"

	"tariffradar/internal/models"
	"tariffradar/internal/repository"
)

// ExportService — сервис экспорта.
type ExportService struct {
	deals *repository.DealRepo
}

// NewExportService — конструктор.
func NewExportService(deals *repository.DealRepo) *ExportService {
	return &ExportService{deals: deals}
}

// Header — заголовки колонок (одинаковые для CSV и XLSX).
var exportHeader = []string{"Дата", "Маршрут", "Тип груза", "ТС", "Цена", "Валюта", "Комментарий"}

// ExportCSV — выгружает все сделки по фильтру в CSV (UTF-8 BOM + ; разделитель,
// чтобы Excel русский корректно открывал файл).
func (s *ExportService) ExportCSV(ctx context.Context, filter repository.ListFilter) (io.Reader, error) {
	deals, err := s.fetchAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	// BOM для корректного отображения кириллицы в Excel.
	buf.Write([]byte{0xEF, 0xBB, 0xBF})

	w := csv.NewWriter(&buf)
	w.Comma = ';'
	if err := w.Write(exportHeader); err != nil {
		return nil, fmt.Errorf("export.CSV header: %w", err)
	}
	for _, d := range deals {
		row := []string{
			d.DealDate.Format("2006-01-02"),
			d.Route,
			d.CargoType,
			d.TruckType,
			fmt.Sprintf("%.2f", d.Price),
			string(d.Currency),
			d.Comment,
		}
		if err := w.Write(row); err != nil {
			return nil, fmt.Errorf("export.CSV row: %w", err)
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("export.CSV flush: %w", err)
	}
	return &buf, nil
}

// ExportXLSX — выгружает все сделки в файл Excel.
func (s *ExportService) ExportXLSX(ctx context.Context, filter repository.ListFilter) (io.Reader, error) {
	deals, err := s.fetchAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	defer f.Close()

	const sheet = "Сделки"
	idx, err := f.NewSheet(sheet)
	if err != nil {
		return nil, fmt.Errorf("export.XLSX sheet: %w", err)
	}
	f.SetActiveSheet(idx)
	_ = f.DeleteSheet("Sheet1")

	// Заголовки.
	for i, h := range exportHeader {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}

	// Стиль для шапки — жирный, серый фон.
	headerStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#E2E8F0"}, Pattern: 1},
	})
	if err == nil {
		_ = f.SetCellStyle(sheet, "A1", "G1", headerStyle)
	}

	// Данные.
	for rIdx, d := range deals {
		row := rIdx + 2
		_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), d.DealDate.Format("2006-01-02"))
		_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), d.Route)
		_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", row), d.CargoType)
		_ = f.SetCellValue(sheet, fmt.Sprintf("D%d", row), d.TruckType)
		_ = f.SetCellValue(sheet, fmt.Sprintf("E%d", row), d.Price)
		_ = f.SetCellValue(sheet, fmt.Sprintf("F%d", row), string(d.Currency))
		_ = f.SetCellValue(sheet, fmt.Sprintf("G%d", row), d.Comment)
	}

	// Автоширина для основных колонок (приблизительно).
	_ = f.SetColWidth(sheet, "A", "A", 12)
	_ = f.SetColWidth(sheet, "B", "B", 35)
	_ = f.SetColWidth(sheet, "C", "D", 18)
	_ = f.SetColWidth(sheet, "E", "E", 12)
	_ = f.SetColWidth(sheet, "F", "F", 8)
	_ = f.SetColWidth(sheet, "G", "G", 30)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("export.XLSX write: %w", err)
	}
	return &buf, nil
}

// fetchAll — забирает все сделки, удовлетворяющие фильтру (без пагинации).
// При больших объёмах данных надо будет переписать на стриминг — пока ок.
func (s *ExportService) fetchAll(ctx context.Context, filter repository.ListFilter) ([]exportItem, error) {
	const pageSize = 1000
	page := 1
	var out []exportItem

	for {
		filter.Page = page
		filter.PerPage = pageSize
		res, err := s.deals.List(ctx, filter)
		if err != nil {
			return nil, err
		}
		for _, d := range res.Deals {
			out = append(out, exportItem{
				DealDate:  d.DealDate,
				Route:     d.Route,
				CargoType: d.CargoType,
				TruckType: d.TruckType,
				Price:     d.Price,
				Currency:  d.Currency,
				Comment:   d.Comment,
			})
		}
		if page >= res.TotalPages {
			break
		}
		page++
	}
	return out, nil
}

// exportItem — упрощённый вид сделки для экспорта.
type exportItem struct {
	DealDate  time.Time
	Route     string
	CargoType string
	TruckType string
	Price     float64
	Currency  models.Currency
	Comment   string
}
