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
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
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
	plans     *repository.PlanRepo
	tokens    *repository.TokenRepo
	mailer    Mailer
	baseURL   string
	jwtSecret []byte
	jwtTTL    time.Duration
}

// NewAuthService — конструктор.
// plans/tokens/mailer могут быть nil — функции, которые их требуют, будут отключены.
func NewAuthService(
	users *repository.UserRepo,
	plans *repository.PlanRepo,
	tokens *repository.TokenRepo,
	mailer Mailer,
	baseURL string,
	jwtSecret string,
	jwtTTL time.Duration,
) *AuthService {
	return &AuthService{
		users:     users,
		plans:     plans,
		tokens:    tokens,
		mailer:    mailer,
		baseURL:   baseURL,
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

	// Подписываем нового пользователя на бесплатный тариф.
	// Ошибка не блокирует регистрацию — миграция 0006 делает backfill для пропущенных.
	if s.plans != nil {
		_ = s.plans.EnsureSubscription(ctx, user.ID)
	}

	// Шлём welcome+verify-email (не критично — fire-and-forget).
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := s.SendVerificationEmail(bgCtx, user); err != nil {
			// Логгер тут не доступен; сетевые/SMTP-ошибки уйдут в stdoutMailer/log.
			_ = err
		}
	}()

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

// BlacklistToken — добавляет JWT в Redis-blacklist до его expires_at.
// Используется при logout.
func (s *AuthService) BlacklistToken(ctx context.Context, token string) error {
	if s.tokens == nil {
		return nil
	}
	claims, err := s.ValidateToken(token)
	if err != nil {
		return nil // уже невалиден — нечего блэклистить
	}
	exp := time.Until(claims.ExpiresAt.Time)
	if exp <= 0 {
		return nil
	}
	return s.tokens.Blacklist(ctx, token, exp)
}

// IsTokenBlacklisted — проверяет, был ли токен инвалидирован через logout.
func (s *AuthService) IsTokenBlacklisted(ctx context.Context, token string) bool {
	if s.tokens == nil {
		return false
	}
	return s.tokens.IsBlacklisted(ctx, token)
}

// ── Email verification ──────────────────────────────────────────────────────

const (
	nsVerify    = "verify"
	nsReset     = "reset"
	verifyTTL   = 24 * time.Hour
	resetTTL    = 30 * time.Minute
)

// SendVerificationEmail — генерирует токен и отправляет письмо с ссылкой.
// Используется после регистрации и для повторной отправки.
func (s *AuthService) SendVerificationEmail(ctx context.Context, user *models.User) error {
	if s.tokens == nil || s.mailer == nil {
		return nil // email-сервисы отключены — просто молча выходим
	}
	if user.EmailVerified {
		return nil
	}

	token, err := randomToken()
	if err != nil {
		return err
	}
	if err := s.tokens.Set(ctx, nsVerify, token, user.ID, verifyTTL); err != nil {
		return err
	}

	link := fmt.Sprintf("%s/verify-email?token=%s", s.baseURL, token)
	html := fmt.Sprintf(`<p>Здравствуйте%s!</p>
<p>Подтвердите вашу почту для активации аккаунта в TariffRadar:</p>
<p><a href="%s">Подтвердить email</a></p>
<p>Ссылка действует 24 часа. Если вы не регистрировались — просто проигнорируйте письмо.</p>`,
		nameOrEmpty(user.Name), link)

	return s.mailer.Send(user.Email, "Подтверждение email — TariffRadar", html)
}

// ConfirmEmail — обменивает токен на отметку email_verified=TRUE.
func (s *AuthService) ConfirmEmail(ctx context.Context, token string) error {
	if s.tokens == nil {
		return errors.New("email verification disabled")
	}
	userID, err := s.tokens.Consume(ctx, nsVerify, token)
	if err != nil {
		return err
	}
	return s.users.MarkEmailVerified(ctx, userID)
}

// ── Password reset ──────────────────────────────────────────────────────────

// RequestPasswordReset — генерирует токен и шлёт письмо. Если email не найден,
// возвращает nil (не раскрываем существование email-а — anti-enumeration).
func (s *AuthService) RequestPasswordReset(ctx context.Context, email string) error {
	if s.tokens == nil || s.mailer == nil {
		return nil
	}
	email = strings.ToLower(strings.TrimSpace(email))

	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil // не раскрываем
		}
		return err
	}

	token, err := randomToken()
	if err != nil {
		return err
	}
	if err := s.tokens.Set(ctx, nsReset, token, user.ID, resetTTL); err != nil {
		return err
	}

	link := fmt.Sprintf("%s/reset-password?token=%s", s.baseURL, token)
	html := fmt.Sprintf(`<p>Здравствуйте%s!</p>
<p>Вы запросили сброс пароля для TariffRadar.</p>
<p><a href="%s">Установить новый пароль</a></p>
<p>Ссылка действует 30 минут. Если вы не запрашивали сброс — игнорируйте это письмо.</p>`,
		nameOrEmpty(user.Name), link)

	return s.mailer.Send(user.Email, "Сброс пароля — TariffRadar", html)
}

// ConfirmPasswordReset — проверяет токен и устанавливает новый пароль.
func (s *AuthService) ConfirmPasswordReset(ctx context.Context, token, newPassword string) error {
	if s.tokens == nil {
		return errors.New("password reset disabled")
	}
	if len(newPassword) < 8 {
		return ErrWeakPassword
	}

	userID, err := s.tokens.Consume(ctx, nsReset, token)
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("bcrypt: %w", err)
	}
	return s.users.UpdatePassword(ctx, userID, string(hash))
}

// randomToken — 32-байтный hex-токен (64 символа).
func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// nameOrEmpty — возвращает ", <имя>" или "" для шаблона.
func nameOrEmpty(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	return ", " + name
}

// isValidEmail — валидация email по RFC 5322 через стандартный парсер.
func isValidEmail(s string) bool {
	_, err := mail.ParseAddress(s)
	return err == nil
}
