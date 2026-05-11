// internal/config/config.go — загрузка и валидация конфигурации приложения.
//
// Конфиг собирается из двух источников (по приоритету):
//  1. Переменные окружения (от Docker, systemd, .env).
//  2. Дефолтные значения, прописанные в коде.
//
// Если какой-то параметр обязательный (например, JWT_SECRET) и не задан —
// функция Load() вернёт ошибку, и сервер не стартует. Это намеренно:
// лучше упасть при старте, чем работать с дефолтным секретом в проде.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config — структура с настройками приложения.
type Config struct {
	// HTTP-сервер
	AppEnv  string // development | production
	AppPort string // порт, на котором слушаем (например, "8080")

	// PostgreSQL
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Redis
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// JWT
	JWTSecret string
	JWTTTL    time.Duration

	// CORS
	CORSAllowedOrigins string

	// Mail
	MailDriver   string // "stdout" | "smtp"
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	MailFrom     string
	AppBaseURL   string // используется для ссылок в письмах
}

// Load — загружает .env (если есть) и собирает конфигурацию.
// Возвращает ошибку, если обязательные поля не заданы.
func Load() (*Config, error) {
	// Пробуем подгрузить .env. Если файла нет — это нормально (например, в Docker
	// переменные приходят напрямую). Поэтому ошибку отсутствия файла игнорируем.
	_ = godotenv.Load()

	cfg := &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "tariffradar"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "tariffradar"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		JWTSecret: getEnv("JWT_SECRET", ""),

		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),

		MailDriver:   getEnv("MAIL_DRIVER", "stdout"),
		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		MailFrom:     getEnv("MAIL_FROM", "TariffRadar <noreply@tariffradar.local>"),
		AppBaseURL:   getEnv("APP_BASE_URL", "http://localhost:5173"),
	}

	// Парсим Redis DB-номер (целое число).
	redisDB, err := strconv.Atoi(getEnv("REDIS_DB", "0"))
	if err != nil {
		return nil, fmt.Errorf("REDIS_DB должен быть числом: %w", err)
	}
	cfg.RedisDB = redisDB

	// Парсим срок жизни JWT (например, "24h", "7d").
	ttlStr := getEnv("JWT_TTL", "24h")
	ttl, err := time.ParseDuration(ttlStr)
	if err != nil {
		return nil, fmt.Errorf("JWT_TTL не парсится (нужен формат '24h' или '60m'): %w", err)
	}
	cfg.JWTTTL = ttl

	// Валидация обязательных полей.
	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// validate — проверяет, что все критичные поля заданы.
func (c *Config) validate() error {
	if c.JWTSecret == "" {
		return errors.New("JWT_SECRET обязателен — задай его в .env или переменных окружения")
	}
	if len(c.JWTSecret) < 32 {
		return errors.New("JWT_SECRET слишком короткий (нужно минимум 32 символа)")
	}
	if c.AppEnv == "production" && c.DBPassword == "" {
		return errors.New("DB_PASSWORD обязателен в production")
	}
	return nil
}

// DSN — собирает строку подключения к PostgreSQL.
// Используется в repository-слое и в миграциях.
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode,
	)
}

// getEnv — читает переменную окружения, если её нет — возвращает дефолт.
func getEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
