// internal/service/auth_test.go — unit-тесты для AuthService.
//
// Тестируем чистую логику без БД: валидация email, парсинг периода и т.д.
// Полноценные интеграционные тесты с БД — отдельной фичей через testcontainers.
package service

import "testing"

func TestIsValidEmail(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"a@b.com", true},
		{"user.name@domain.co.uk", true},
		{"invalid", false},
		{"@nodomain.com", false},
		{"no-at-sign.com", false},
		{"a@b", false},  // нет точки после @
		{"a@b.c", true}, // короткий tld допустим в нашей упрощённой проверке
		{"", false},
	}
	for _, tt := range tests {
		if got := isValidEmail(tt.input); got != tt.want {
			t.Errorf("isValidEmail(%q) = %v, want %v", tt.input, got, tt.want)
		}
	}
}

func TestParsePeriod(t *testing.T) {
	tests := []struct {
		input string
		code  string
		days  int
		err   bool
	}{
		{"7Д", "7Д", 7, false},
		{"7D", "7Д", 7, false},
		{"30Д", "30Д", 30, false},
		{"", "30Д", 30, false}, // пустая строка → дефолт 30Д
		{"90D", "90Д", 90, false},
		{"1Г", "1Г", 365, false},
		{"1Y", "1Г", 365, false},
		{"abc", "", 0, true},
	}
	for _, tt := range tests {
		got, err := ParsePeriod(tt.input)
		if tt.err {
			if err == nil {
				t.Errorf("ParsePeriod(%q) ожидалась ошибка", tt.input)
			}
			continue
		}
		if err != nil {
			t.Errorf("ParsePeriod(%q) неожиданная ошибка: %v", tt.input, err)
			continue
		}
		if got.Code != tt.code || got.Days != tt.days {
			t.Errorf("ParsePeriod(%q) = {%s, %d}, want {%s, %d}",
				tt.input, got.Code, got.Days, tt.code, tt.days)
		}
	}
}

func TestRound2(t *testing.T) {
	tests := []struct {
		in   float64
		want float64
	}{
		{1450.456, 1450.45},
		{1450.0, 1450.0},
		{0, 0},
		{-12.345, -12.34}, // округление к нулю (через int)
	}
	for _, tt := range tests {
		if got := round2(tt.in); got != tt.want {
			t.Errorf("round2(%v) = %v, want %v", tt.in, got, tt.want)
		}
	}
}

func TestBuildVerdict(t *testing.T) {
	tests := []struct {
		userRate, avg float64
		diffPct       float64
		wantVerdict   string
	}{
		{1450, 1500, -3.3, "below_market"},
		{1500, 1500, 0, "at_market"},
		{1450, 1500, 1.0, "at_market"}, // в пределах ±3% — at_market
		{1600, 1500, 6.7, "above_market"},
	}
	for _, tt := range tests {
		got, _ := buildVerdict(tt.userRate, tt.avg, 0, 0, tt.diffPct)
		if got != tt.wantVerdict {
			t.Errorf("buildVerdict(diffPct=%v) = %q, want %q", tt.diffPct, got, tt.wantVerdict)
		}
	}
}
