// internal/config/config_test.go — тесты конфигурации.
package config

import "testing"

func TestLoad_RequiresJWTSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "") // t.Setenv восстанавливает значение после теста
	if _, err := Load(); err == nil {
		t.Error("Load без JWT_SECRET должен вернуть ошибку")
	}
}

func TestLoad_ShortJWTSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "short")
	if _, err := Load(); err == nil {
		t.Error("Load с коротким JWT_SECRET должен вернуть ошибку")
	}
}

func TestLoad_ValidConfig(t *testing.T) {
	t.Setenv("JWT_SECRET", "very-long-secret-string-at-least-32-chars")
	t.Setenv("APP_PORT", "9090")
	t.Setenv("APP_ENV", "test")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("неожиданная ошибка: %v", err)
	}
	if cfg.AppPort != "9090" {
		t.Errorf("AppPort = %q, want 9090", cfg.AppPort)
	}
	if cfg.AppEnv != "test" {
		t.Errorf("AppEnv = %q, want test", cfg.AppEnv)
	}
}

func TestDSN(t *testing.T) {
	cfg := &Config{
		DBHost:     "localhost",
		DBPort:     "5432",
		DBUser:     "tariffradar",
		DBPassword: "secret",
		DBName:     "tariffradar",
		DBSSLMode:  "disable",
	}
	want := "postgres://tariffradar:secret@localhost:5432/tariffradar?sslmode=disable"
	if got := cfg.DSN(); got != want {
		t.Errorf("DSN = %q, want %q", got, want)
	}
}
