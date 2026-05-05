// internal/service/auth.go — бизнес-логика аутентификации.
//
// Что делает сервис:
//   - Register: валидирует email/пароль, хеширует пароль (bcrypt), создаёт пользователя.
//   - Login:    проверяет email + пароль, генерирует JWT-токен.
//   - ValidateToken: парсит JWT, возвращает user_id (используется в middleware).
//
// Сервис НЕ работает напрямую с HTTP — только с моделями. Это позволяет тестировать
// бизнес-логику отдельно от транспорта.
package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"tariffradar/internal/models"
	"tariffradar/internal/repository"
)

// Ошибки сервиса. Хендлеры конвертируют их в HTTP-статусы.
var (
	ErrInvalidCredentials = errors.New("неверный email или пароль")
	ErrInvalidEmail       = errors.New("некорректный email")
	ErrWeakPassword       = errors.New("пароль должен содержать минимум 8 символов")
	ErrInvalidToken       = errors.New("невалидный токен")
)

// AuthService — сервис аутентификации.
type AuthService struct {
	users     *repository.UserRepo
	jwtSecret []byte
	jwtTTL    time.Duration
}

// NewAuthService — конструктор.
func NewAuthService(users *repository.UserRepo, jwtSecret string, jwtTTL time.Duration) *AuthService {
	return &AuthService{
		users:     users,
		jwtSecret: []byte(jwtSecret),
		jwtTTL:    jwtTTL,
	}
}

// RegisterInput — данные для регистрации.
type RegisterInput struct {
	Email    string
	Password string
	Name     string
	Company  string
}

// Register — создаёт нового пользователя.
func (s *AuthService) Register(ctx context.Context, in RegisterInput) (*models.User, error) {
	// Валидация.
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if !isValidEmail(email) {
		return nil, ErrInvalidEmail
	}
	if len(in.Password) < 8 {
		return nil, ErrWeakPassword
	}

	// Хешируем пароль bcrypt'ом (cost=10 — баланс безопасности и скорости).
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("хеширование пароля: %w", err)
	}

	user := &models.User{
		Email:        email,
		PasswordHash: string(hash),
		Name:         in.Name,
		Company:      in.Company,
		Role:         models.RoleViewer, // дефолтная роль для новых пользователей
	}

	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

// Login — проверяет учётные данные и возвращает JWT-токен.
func (s *AuthService) Login(ctx context.Context, email, password string) (string, *models.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		// Не раскрываем, что именно не так (email или пароль) — это helps brute-force.
		if errors.Is(err, repository.ErrUserNotFound) {
			return "", nil, ErrInvalidCredentials
		}
		return "", nil, err
	}

	// Сравниваем хеш пароля.
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	// Генерируем JWT.
	token, err := s.generateToken(user)
	if err != nil {
		return "", nil, fmt.Errorf("генерация токена: %w", err)
	}
	return token, user, nil
}

// TokenClaims — payload JWT-токена.
// UserID хранится в стандартном поле Subject (RegisteredClaims.Subject),
// чтобы не создавать два поля "sub" при JSON-маршалинге.
type TokenClaims struct {
	Email string      `json:"email"`
	Role  models.Role `json:"role"`
	jwt.RegisteredClaims
}

// generateToken — создаёт подписанный JWT для пользователя.
func (s *AuthService) generateToken(user *models.User) (string, error) {
	now := time.Now()
	claims := TokenClaims{
		Email: user.Email,
		Role:  user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.jwtTTL)),
			Issuer:    "tariffradar",
			Subject:   user.ID.String(), // user_id хранится в стандартном поле "sub"
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ValidateToken — проверяет JWT и возвращает claims (user_id, role и т.д.).
// Используется в middleware при каждом запросе.
func (s *AuthService) ValidateToken(tokenString string) (*TokenClaims, error) {
	claims := &TokenClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		// Проверяем, что токен подписан именно HS256.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("неожиданный алгоритм подписи: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil || token == nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// TokenTTL — возвращает срок жизни токена (для ответа /auth/login).
func (s *AuthService) TokenTTL() time.Duration { return s.jwtTTL }

// isValidEmail — простая валидация email (содержит @ и точку после @).
// Для production лучше использовать net/mail.ParseAddress.
func isValidEmail(s string) bool {
	at := strings.Index(s, "@")
	if at < 1 || at == len(s)-1 {
		return false
	}
	return strings.Contains(s[at+1:], ".")
}
