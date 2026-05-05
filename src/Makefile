# Makefile для TariffRadar
# Запуск команд: make <цель>

.PHONY: help run build test deps docker-up docker-down migrate-up migrate-down migrate-create seed lint fmt

# Дефолтная цель — показать список команд
help:
	@echo "TariffRadar — команды разработки:"
	@echo "  make run            — запустить сервер локально"
	@echo "  make build          — собрать бинарник в bin/server"
	@echo "  make test           — прогнать все тесты"
	@echo "  make deps           — установить зависимости (go mod tidy)"
	@echo "  make docker-up      — поднять Postgres + Redis в Docker"
	@echo "  make docker-down    — остановить контейнеры"
	@echo "  make migrate-up     — применить миграции"
	@echo "  make migrate-down   — откатить последнюю миграцию"
	@echo "  make migrate-create name=foo — создать новую миграцию"
	@echo "  make seed           — наполнить БД тестовыми данными"
	@echo "  make fmt            — форматировать код (go fmt)"
	@echo "  make lint           — проверить код линтером"

run:
	go run cmd/server/main.go

build:
	go build -o bin/server cmd/server/main.go

test:
	go test ./... -v -cover

deps:
	go mod tidy

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

# Goose: переменная окружения для подключения к БД
DB_DSN=postgres://tariffradar:secret@localhost:5432/tariffradar?sslmode=disable

migrate-up:
	goose -dir migrations postgres "$(DB_DSN)" up

migrate-down:
	goose -dir migrations postgres "$(DB_DSN)" down

migrate-create:
	goose -dir migrations create $(name) sql

seed:
	go run scripts/seed/main.go

fmt:
	go fmt ./...

lint:
	golangci-lint run ./...
