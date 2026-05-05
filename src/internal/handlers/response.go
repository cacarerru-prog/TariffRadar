// internal/handlers/response.go — общие хелперы для HTTP-ответов.
//
// Все обработчики используют эти функции, чтобы формат JSON-ответов
// и ошибок был единообразным во всём API.
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
)

// errorBody — единый формат ошибки в API.
// Соответствует контракту из docs/api-spec.md.
type errorBody struct {
	Error errorPayload `json:"error"`
}

type errorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Field   string `json:"field,omitempty"`
}

// writeJSON — отправляет JSON-ответ со статусом.
func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if payload != nil {
		if err := json.NewEncoder(w).Encode(payload); err != nil {
			log.Printf("[error] writeJSON encode: %v", err)
		}
	}
}

// writeError — отправляет ошибку в стандартном формате.
func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorBody{Error: errorPayload{Code: code, Message: message}})
}

// writeFieldError — ошибка с указанием конкретного поля.
func writeFieldError(w http.ResponseWriter, status int, code, message, field string) {
	writeJSON(w, status, errorBody{Error: errorPayload{Code: code, Message: message, Field: field}})
}

// readJSON — читает тело запроса как JSON в указанную структуру.
// Возвращает true при успехе и false (с уже отправленной ошибкой), если что-то не так.
func readJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	// Ограничиваем размер тела 1 МБ — защита от чрезмерных запросов.
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	dec := json.NewDecoder(r.Body)

	if err := dec.Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Некорректный JSON в теле запроса")
		return false
	}
	return true
}
