// cmd/server/main.go — точка входа HTTP-сервера TariffRadar.
//
// Что здесь происходит:
//  1. Загружаем конфигурацию.
//  2. Подключаемся к PostgreSQL и Redis.
//  3. Создаём репозитории, сервисы и обработчики.
//  4. Регистрируем роуты (публичные и защищённые JWT).
//  5. Запускаем HTTP-сервер с graceful shutdown.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"tariffradar/internal/config"
	"tariffradar/internal/handlers"
	"tariffradar/internal/middleware"
	"tariffradar/internal/repository"
	"tariffradar/internal/service"
)

func main() {
	// Шаг 1. Конфигурация.
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[fatal] конфиг: %v", err)
	}
	log.Printf("[info] окружение: %s, порт: %s", cfg.AppEnv, cfg.AppPort)

	ctx := context.Background()

	// Шаг 2. Подключения.
	pgPool, err := repository.NewPostgres(ctx, cfg.DSN())
	if err != nil {
		log.Fatalf("[fatal] postgres: %v", err)
	}
	defer pgPool.Close()
	log.Println("[info] postgres: подключено")

	redisClient, err := repository.NewRedis(ctx, cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Fatalf("[fatal] redis: %v", err)
	}
	defer redisClient.Close()
	log.Println("[info] redis: подключено")

	// Шаг 3. Слой данных, сервисы и обработчики.
	cache := repository.NewCache(redisClient)

	userRepo := repository.NewUserRepo(pgPool)
	dealRepo := repository.NewDealRepo(pgPool)
	marketRepo := repository.NewMarketRepo(pgPool)
	insightsRepo := repository.NewInsightsRepo(pgPool)
	benchmarkRepo := repository.NewBenchmarkRepo(pgPool)
	myRoutesRepo := repository.NewUserRouteRepo(pgPool)
	webhookRepo := repository.NewWebhookRepo(pgPool)
	marketplaceRepo := repository.NewMarketplaceRepo(pgPool)

	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTTTL)
	marketSvc := service.NewMarketService(marketRepo, cache)
	insightsSvc := service.NewInsightsService(insightsRepo, cache)
	benchmarkSvc := service.NewBenchmarkService(marketRepo, benchmarkRepo)
	exportSvc := service.NewExportService(dealRepo)
	dispatcher := service.NewDispatcher(webhookRepo)

	authHandler := handlers.NewAuthHandler(authSvc, userRepo)
	dealsHandler := handlers.NewDealsHandler(dealRepo, dispatcher)
	marketHandler := handlers.NewMarketHandler(marketSvc)
	insightsHandler := handlers.NewInsightsHandler(insightsSvc)
	benchmarkHandler := handlers.NewBenchmarkHandler(benchmarkSvc)
	myRoutesHandler := handlers.NewMyRoutesHandler(myRoutesRepo)
	exportHandler := handlers.NewExportHandler(exportSvc)
	webhooksHandler := handlers.NewWebhooksHandler(webhookRepo)
	marketplaceHandler := handlers.NewMarketplaceHandler(marketplaceRepo)

	authMW := middleware.Auth(authSvc)

	// Шаг 4. Роутер.
	r := chi.NewRouter()

	// Глобальные middleware.
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(15 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   splitCSV(cfg.CORSAllowedOrigins),
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Swagger / OpenAPI.
	r.Get("/openapi.yaml", func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
		http.ServeFile(w, req, "docs/openapi.yaml")
	})
	r.Get("/docs", func(w http.ResponseWriter, req *http.Request) {
		http.ServeFile(w, req, "docs/swagger-ui.html")
	})

	// Health.
	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		dbStatus := "ok"
		if err := pgPool.Ping(req.Context()); err != nil {
			dbStatus = "down"
		}
		cacheStatus := "ok"
		if err := redisClient.Ping(req.Context()).Err(); err != nil {
			cacheStatus = "down"
		}
		status := http.StatusOK
		if dbStatus != "ok" || cacheStatus != "ok" {
			status = http.StatusServiceUnavailable
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status": "ok", "version": "0.1.0",
			"db": dbStatus, "cache": cacheStatus,
		})
	})

	// API v1.
	r.Route("/api/v1", func(api chi.Router) {
		// ── Публичные эндпоинты ──
		api.Route("/auth", func(a chi.Router) {
			a.Post("/register", authHandler.Register)
			a.Post("/login", authHandler.Login)
		})

		// Чтение рыночных данных.
		api.Get("/market/stats", marketHandler.Stats)
		api.Get("/deals", dealsHandler.List)
		api.Post("/benchmark", benchmarkHandler.Calculate)

		// Аналитика.
		api.Route("/insights", func(in chi.Router) {
			in.Get("/trends", insightsHandler.Trends)
			in.Get("/seasonality", insightsHandler.Seasonality)
			in.Get("/by-cargo", insightsHandler.ByCargo)
		})

		// Экспорт (публично, но в дальнейшем можно защитить).
		api.Get("/export/deals", exportHandler.Deals)

		// Маркетплейс грузов — чтение публично.
		api.Get("/marketplace/loads", marketplaceHandler.List)

		// ── Защищённые эндпоинты (требуют JWT) ──
		api.Group(func(p chi.Router) {
			p.Use(authMW)

			p.Get("/me", authHandler.Me)
			p.Patch("/me", authHandler.PatchMe)
			p.Patch("/me/password", authHandler.PatchPassword)

			p.Post("/deals", dealsHandler.Create)
			p.Patch("/deals/{id}", dealsHandler.Update)
			p.Delete("/deals/{id}", dealsHandler.Delete)

			// Мои маршруты.
			p.Route("/my/routes", func(mr chi.Router) {
				mr.Get("/", myRoutesHandler.List)
				mr.Post("/", myRoutesHandler.Add)
				mr.Delete("/{id}", myRoutesHandler.Remove)
			})

			// Webhooks.
			p.Route("/webhooks", func(wh chi.Router) {
				wh.Get("/", webhooksHandler.List)
				wh.Post("/", webhooksHandler.Create)
				wh.Delete("/{id}", webhooksHandler.Delete)
			})

			// Маркетплейс — создание, изменение статуса, удаление (требуют JWT).
			p.Post("/marketplace/loads", marketplaceHandler.Create)
			p.Patch("/marketplace/loads/{id}", marketplaceHandler.Update)
			p.Delete("/marketplace/loads/{id}", marketplaceHandler.Delete)
		})
	})

	// Шаг 5. HTTP-сервер.
	srv := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second, // увеличено — для экспорта больших файлов
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("[info] HTTP-сервер слушает на :%s", cfg.AppPort)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[fatal] сервер упал: %v", err)
		}
	}()

	// Graceful shutdown.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Println("[info] получен сигнал остановки, завершаем работу...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[warn] graceful shutdown не успел: %v", err)
	}
	log.Println("[info] сервер остановлен корректно")
}

// splitCSV — разбивает "a,b,c" в []string{"a","b","c"} с trim'ом пробелов.
func splitCSV(s string) []string {
	if s == "" || s == "*" {
		return []string{"*"}
	}
	raw := strings.Split(s, ",")
	out := make([]string, 0, len(raw))
	for _, p := range raw {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
