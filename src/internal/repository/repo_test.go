// internal/repository/repo_test.go — TestMain для интеграционных тестов.
//
// Запускает Postgres-контейнер через testcontainers-go, применяет все миграции
// и предоставляет *pgxpool.Pool через пакетную переменную testDB.
// После окончания всех тестов контейнер уничтожается.
//
// Запуск:
//
//	go test ./internal/repository/... -v -tags integration
package repository

import (
	"context"
	"os"
	"sort"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

// testDB — пул подключений к тестовой БД, доступный всем тестам пакета.
var testDB *pgxpool.Pool

func TestMain(m *testing.M) {
	ctx := context.Background()

	pgCtr, err := tcpostgres.Run(ctx,
		"postgres:15-alpine",
		tcpostgres.WithDatabase("tariffradar_test"),
		tcpostgres.WithUsername("test"),
		tcpostgres.WithPassword("test"),
		tcpostgres.BasicWaitStrategies(),
	)
	if err != nil {
		panic("testcontainer postgres: " + err.Error())
	}
	defer pgCtr.Terminate(ctx) //nolint:errcheck

	dsn, err := pgCtr.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		panic("container DSN: " + err.Error())
	}

	testDB, err = pgxpool.New(ctx, dsn)
	if err != nil {
		panic("pgxpool.New: " + err.Error())
	}
	defer testDB.Close()

	if err := applyMigrations(ctx, testDB, "../../migrations"); err != nil {
		panic("migrations: " + err.Error())
	}

	os.Exit(m.Run())
}

// applyMigrations читает SQL-файлы из dir по порядку и выполняет Up-секцию каждого.
func applyMigrations(ctx context.Context, db *pgxpool.Pool, dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	// Гарантируем лексикографический порядок (0001_, 0002_, …).
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		raw, err := os.ReadFile(dir + "/" + e.Name())
		if err != nil {
			return err
		}
		sql := extractUpSQL(string(raw))
		if _, err := db.Exec(ctx, sql); err != nil {
			return err
		}
	}
	return nil
}

// extractUpSQL вырезает из goose-миграции только Up-секцию и убирает служебные строки.
func extractUpSQL(content string) string {
	// Берём фрагмент между "-- +goose Up" и "-- +goose Down".
	upStart := strings.Index(content, "-- +goose Up")
	downStart := strings.Index(content, "-- +goose Down")

	if upStart == -1 {
		return content
	}

	var upSection string
	if downStart == -1 || downStart < upStart {
		upSection = content[upStart:]
	} else {
		upSection = content[upStart:downStart]
	}

	// Убираем goose-директивы (они — SQL-комментарии, но лучше явно).
	var lines []string
	for _, line := range strings.Split(upSection, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "-- +goose") {
			continue
		}
		lines = append(lines, line)
	}
	return strings.Join(lines, "\n")
}
