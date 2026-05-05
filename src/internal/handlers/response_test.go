// internal/handlers/response_test.go — тесты helper-функций ответов.
package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWriteError(t *testing.T) {
	rec := httptest.NewRecorder()
	writeError(rec, http.StatusBadRequest, "validation_failed", "Поле обязательно")

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "application/json") {
		t.Errorf("Content-Type = %q, ожидался application/json", ct)
	}

	var body errorBody
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body не JSON: %v", err)
	}
	if body.Error.Code != "validation_failed" {
		t.Errorf("code = %q, want validation_failed", body.Error.Code)
	}
	if body.Error.Message != "Поле обязательно" {
		t.Errorf("message = %q", body.Error.Message)
	}
}

func TestReadJSON_RejectsUnknownFields(t *testing.T) {
	type expected struct {
		Name string `json:"name"`
	}

	body := strings.NewReader(`{"name":"ok","extra":"reject"}`)
	req := httptest.NewRequest(http.MethodPost, "/", body)
	rec := httptest.NewRecorder()

	var dst expected
	ok := readJSON(rec, req, &dst)
	if ok {
		t.Fatalf("readJSON должен был отклонить unknown fields")
	}
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", rec.Code)
	}
}

func TestPeriodToFromDate(t *testing.T) {
	tests := []struct {
		period string
		ok     bool
	}{
		{"7D", true},
		{"30D", true},
		{"90D", true},
		{"1Y", true},
		{"abc", false},
		{"", false},
	}
	for _, tt := range tests {
		_, ok := periodToFromDate(tt.period)
		if ok != tt.ok {
			t.Errorf("periodToFromDate(%q) ok = %v, want %v", tt.period, ok, tt.ok)
		}
	}
}

func TestAtoiDefault(t *testing.T) {
	if got := atoiDefault("", 5); got != 5 {
		t.Errorf("atoiDefault('', 5) = %d, want 5", got)
	}
	if got := atoiDefault("42", 5); got != 42 {
		t.Errorf("atoiDefault('42', 5) = %d, want 42", got)
	}
	if got := atoiDefault("abc", 7); got != 7 {
		t.Errorf("atoiDefault('abc', 7) = %d, want 7", got)
	}
}
