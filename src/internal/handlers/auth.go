// internal/handlers/auth.go — HTTP-обработчики для /auth/*.
//
// Обработчик принимает HTTP-запрос, парсит тело, вызывает сервис, отдаёт ответ.
// Бизнес-логика — в service.AuthService, не здесь.
package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"tariffradar/internal/middleware"
	"tariffradar/internal/repository"
	"tariffradar/internal/service"
)

// AuthHandler — группа обработчиков аутентификации.
type AuthHandler struct {
	auth  *service.AuthService
	users *repository.UserRepo
	plans *repository.PlanRepo
}

// NewAuthHandler — конструктор.
func NewAuthHandler(auth *service.AuthService, users *repository.UserRepo, plans *repository.PlanRepo) *AuthHandler {
	return &AuthHandler{auth: auth, users: users, plans: plans}
}

// ── POST /auth/register ──────────────────────────────────────────────────────

type registerReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Company  string `json:"company"`
}

type userPublic struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name,omitempty"`
	Company       string `json:"company,omitempty"`
	Role          string `json:"role"`
	EmailVerified bool   `json:"email_verified"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if !readJSON(w, r, &req) {
		return
	}

	user, err := h.auth.Register(r.Context(), service.RegisterInput{
		Email:    req.Email,
		Password: req.Password,
		Name:     req.Name,
		Company:  req.Company,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidEmail):
			writeFieldError(w, http.StatusBadRequest, "invalid_email", "Некорректный email", "email")
		case errors.Is(err, service.ErrWeakPassword):
			writeFieldError(w, http.StatusBadRequest, "weak_password", "Пароль должен быть не короче 8 символов", "password")
		case errors.Is(err, repository.ErrUserExists):
			writeError(w, http.StatusConflict, "user_exists", "Пользователь с таким email уже существует")
		default:
			writeError(w, http.StatusInternalServerError, "internal_error", "Внутренняя ошибка сервера")
		}
		return
	}

	writeJSON(w, http.StatusCreated, userPublic{
		ID: user.ID.String(), Email: user.Email, Name: user.Name,
		Company: user.Company, Role: string(user.Role), EmailVerified: user.EmailVerified,
	})
}

// ── POST /auth/login ─────────────────────────────────────────────────────────

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResp struct {
	Token     string     `json:"token"`
	ExpiresAt time.Time  `json:"expires_at"`
	User      userPublic `json:"user"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if !readJSON(w, r, &req) {
		return
	}

	token, user, err := h.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "invalid_credentials", "Неверный email или пароль")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "Внутренняя ошибка сервера")
		return
	}

	writeJSON(w, http.StatusOK, loginResp{
		Token:     token,
		ExpiresAt: time.Now().Add(h.auth.TokenTTL()),
		User: userPublic{
			ID: user.ID.String(), Email: user.Email, Name: user.Name,
			Company: user.Company, Role: string(user.Role), EmailVerified: user.EmailVerified,
		},
	})
}

// ── GET /auth/me ─────────────────────────────────────────────────────────────

// Me — возвращает профиль текущего пользователя.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	user, err := h.users.FindByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Пользователь не найден")
		return
	}

	writeJSON(w, http.StatusOK, userPublic{
		ID: user.ID.String(), Email: user.Email, Name: user.Name,
		Company: user.Company, Role: string(user.Role), EmailVerified: user.EmailVerified,
	})
}

// ── PATCH /api/v1/me ─────────────────────────────────────────────────────────

type patchMeReq struct {
	Name    string `json:"name"`
	Company string `json:"company"`
	Phone   string `json:"phone"`
}

// PatchMe — обновляет профиль текущего пользователя.
func (h *AuthHandler) PatchMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	var req patchMeReq
	if !readJSON(w, r, &req) {
		return
	}

	if err := h.users.UpdateProfile(r.Context(), userID, req.Name, req.Company, req.Phone); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось обновить профиль")
		return
	}

	user, _ := h.users.FindByID(r.Context(), userID)
	writeJSON(w, http.StatusOK, userPublic{
		ID: user.ID.String(), Email: user.Email, Name: user.Name,
		Company: user.Company, Role: string(user.Role), EmailVerified: user.EmailVerified,
	})
}

// ── PATCH /api/v1/me/password ─────────────────────────────────────────────────

type patchPasswordReq struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// PatchPassword — меняет пароль текущего пользователя.
func (h *AuthHandler) PatchPassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	var req patchPasswordReq
	if !readJSON(w, r, &req) {
		return
	}

	if len(req.NewPassword) < 8 {
		writeFieldError(w, http.StatusBadRequest, "weak_password",
			"Пароль должен быть не короче 8 символов", "new_password")
		return
	}

	user, err := h.users.FindByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Пользователь не найден")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		writeFieldError(w, http.StatusBadRequest, "invalid_password",
			"Текущий пароль неверен", "current_password")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Ошибка хеширования пароля")
		return
	}

	if err := h.users.UpdatePassword(r.Context(), userID, string(newHash)); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось сменить пароль")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "password_changed"})
}

// ── POST /auth/logout ─────────────────────────────────────────────────────────

// Logout — добавляет текущий JWT в blacklist на оставшийся срок жизни.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	header := r.Header.Get("Authorization")
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 {
		writeError(w, http.StatusBadRequest, "no_token", "Токен отсутствует")
		return
	}
	if err := h.auth.BlacklistToken(r.Context(), parts[1]); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось завершить сессию")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
}

// ── POST /auth/verify-email ──────────────────────────────────────────────────

type verifyEmailReq struct {
	Token string `json:"token"`
}

func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req verifyEmailReq
	if !readJSON(w, r, &req) {
		return
	}
	if req.Token == "" {
		writeError(w, http.StatusBadRequest, "validation_failed", "Токен обязателен")
		return
	}
	if err := h.auth.ConfirmEmail(r.Context(), req.Token); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_token", "Ссылка истекла или недействительна")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "email_verified"})
}

// ── POST /auth/resend-verification ────────────────────────────────────────────

func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}
	user, err := h.users.FindByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", "Пользователь не найден")
		return
	}
	if user.EmailVerified {
		writeJSON(w, http.StatusOK, map[string]string{"status": "already_verified"})
		return
	}
	if err := h.auth.SendVerificationEmail(r.Context(), user); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось отправить письмо")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

// ── POST /auth/password-reset/request ─────────────────────────────────────────

type passwordResetReq struct {
	Email string `json:"email"`
}

func (h *AuthHandler) PasswordResetRequest(w http.ResponseWriter, r *http.Request) {
	var req passwordResetReq
	if !readJSON(w, r, &req) {
		return
	}
	// Молча возвращаем 200 даже для несуществующего email — anti-enumeration.
	_ = h.auth.RequestPasswordReset(r.Context(), req.Email)
	writeJSON(w, http.StatusOK, map[string]string{"status": "sent_if_exists"})
}

// ── POST /auth/password-reset/confirm ─────────────────────────────────────────

type passwordResetConfirmReq struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func (h *AuthHandler) PasswordResetConfirm(w http.ResponseWriter, r *http.Request) {
	var req passwordResetConfirmReq
	if !readJSON(w, r, &req) {
		return
	}
	if req.Token == "" {
		writeError(w, http.StatusBadRequest, "validation_failed", "Токен обязателен")
		return
	}
	if err := h.auth.ConfirmPasswordReset(r.Context(), req.Token, req.NewPassword); err != nil {
		if errors.Is(err, service.ErrWeakPassword) {
			writeFieldError(w, http.StatusBadRequest, "weak_password",
				"Пароль должен быть не короче 8 символов", "new_password")
			return
		}
		writeError(w, http.StatusBadRequest, "invalid_token", "Ссылка истекла или недействительна")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "password_changed"})
}

// ── GET /api/v1/me/plan ──────────────────────────────────────────────────────

// planResponse — план + использование лимитов, для UI экрана подписки.
type planResponse struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	PriceBYN float64 `json:"price_byn"`
	Status   string `json:"status"`
	Limits   struct {
		RoutesMax       int `json:"routes_max"`
		WebhooksMax     int `json:"webhooks_max"`
		ExportsPerMonth int `json:"exports_per_month"`
		HistoryDays     int `json:"history_days"`
		RateLimit       int `json:"rate_limit"`
	} `json:"limits"`
	Usage struct {
		RoutesUsed   int `json:"routes_used"`
		WebhooksUsed int `json:"webhooks_used"`
	} `json:"usage"`
}

// Plan — текущий тариф пользователя + сколько уже использовано.
func (h *AuthHandler) Plan(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Требуется авторизация")
		return
	}

	up, err := h.plans.GetUserPlan(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Не удалось получить план")
		return
	}

	resp := planResponse{
		Code: up.Plan.Code, Name: up.Plan.Name, PriceBYN: up.Plan.PriceBYN, Status: up.Status,
	}
	resp.Limits.RoutesMax = up.Plan.RoutesMax
	resp.Limits.WebhooksMax = up.Plan.WebhooksMax
	resp.Limits.ExportsPerMonth = up.Plan.ExportsPerMonth
	resp.Limits.HistoryDays = up.Plan.HistoryDays
	resp.Limits.RateLimit = up.Plan.RateLimit
	resp.Usage.RoutesUsed = up.RoutesUsed
	resp.Usage.WebhooksUsed = up.WebhooksUsed

	writeJSON(w, http.StatusOK, resp)
}
