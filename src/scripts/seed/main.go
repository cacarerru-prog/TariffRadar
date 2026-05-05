// scripts/seed/main.go — наполнение БД реалистичными данными.
//
// Запуск: go run ./scripts/seed/main.go
// Генерирует ~1200 сделок за 365 дней с сезонностью и трендами.
package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"tariffradar/internal/config"
	"tariffradar/internal/models"
	"tariffradar/internal/repository"
)

type seedRoute struct {
	from, to, kind     string
	minPrice, maxPrice float64
	currency           string
	trend              float64 // годовой тренд: +0.10 = +10% за год
	weight             int     // частота появления
}

var routes = []seedRoute{
	{"Минск, Беларусь", "Москва, Россия", "FTL", 1300, 1650, "EUR", 0.08, 15},
	{"Минск, Беларусь", "Санкт-Петербург, Россия", "FTL", 1500, 1850, "EUR", 0.05, 10},
	{"Минск, Беларусь", "Казань, Россия", "FTL", 2000, 2350, "EUR", 0.12, 6},
	{"Минск, Беларусь", "Смоленск, Россия", "FTL", 800, 950, "EUR", -0.03, 8},
	{"Минск, Беларусь", "Новосибирск, Россия", "FTL", 3200, 3700, "EUR", 0.15, 3},
	{"Минск, Беларусь", "Екатеринбург, Россия", "FTL", 2400, 2800, "EUR", 0.10, 4},
	{"Брест, Беларусь", "Москва, Россия", "FTL", 1400, 1750, "EUR", 0.06, 8},
	{"Гродно, Беларусь", "Москва, Россия", "FTL", 1350, 1700, "EUR", 0.04, 5},
	{"Витебск, Беларусь", "Москва, Россия", "FTL", 1200, 1550, "EUR", 0.03, 4},
	{"Гомель, Беларусь", "Москва, Россия", "FTL", 1250, 1600, "EUR", 0.07, 5},
	{"Минск, Беларусь", "Тверь, Россия", "FTL", 900, 1100, "EUR", -0.05, 6},
	{"Минск, Беларусь", "Калуга, Россия", "FTL", 950, 1200, "EUR", -0.02, 4},
	{"Минск, Беларусь", "Тула, Россия", "FTL", 1000, 1250, "EUR", 0.02, 4},
	{"Минск, Беларусь", "Москва, Россия", "LTL", 450, 700, "EUR", 0.09, 10},
	{"Минск, Беларусь", "Санкт-Петербург, Россия", "LTL", 520, 780, "EUR", 0.06, 6},
	{"Брест, Беларусь", "Москва, Россия", "LTL", 480, 720, "EUR", 0.07, 5},
}

// Сезонный коэффициент по месяцам (март/ноябрь — пики, июль — спад).
var season = [13]float64{0, 0.92, 0.95, 1.12, 1.08, 1.05, 1.00, 0.90, 0.93, 1.02, 1.07, 1.15, 1.10}

var cargos = []string{"FMCG", "Металл", "Одежда", "Продукты", "Химия", "Стройматериалы", "Мебель"}
var trucks = []string{"Фура 20т", "Фура 10т", "Рефрижератор 20т", "Тентованный 20т"}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("конфиг: %v", err)
	}

	ctx := context.Background()
	pool, err := repository.NewPostgres(ctx, cfg.DSN())
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}
	defer pool.Close()

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	// Создаём seed-пользователя.
	userRepo := repository.NewUserRepo(pool)
	user, err := getOrCreateSeedUser(ctx, userRepo)
	if err != nil {
		log.Fatalf("seed user: %v", err)
	}
	log.Printf("seed user: %s (id=%s)", user.Email, user.ID)

	dealRepo := repository.NewDealRepo(pool)

	// Взвешенный список маршрутов для случайного выбора.
	weighted := buildWeighted()

	now := time.Now()
	start := now.AddDate(-1, 0, 0)
	totalDays := int(now.Sub(start).Hours() / 24)

	inserted := 0
	for day := 0; day < totalDays; day++ {
		date := start.AddDate(0, 0, day)
		month := int(date.Month())
		progress := float64(day) / float64(totalDays) // 0..1 — позиция в году

		// 2–5 сделок в день, больше в высокий сезон.
		cnt := int(math.Round(float64(2+rng.Intn(4)) * season[month]))
		if cnt < 1 {
			cnt = 1
		}

		for i := 0; i < cnt; i++ {
			r := routes[weighted[rng.Intn(len(weighted))]]

			// Цена = базовая × сезон × тренд × шум.
			base := r.minPrice + rng.Float64()*(r.maxPrice-r.minPrice)
			price := base * season[month] * (1 + r.trend*progress)
			price *= 1 + (rng.Float64()-0.5)*0.06 // ±3% шум
			price = math.Round(price*100) / 100

			deal := &models.Deal{
				DealDate:  date,
				CargoType: cargos[rng.Intn(len(cargos))],
				TruckType: trucks[rng.Intn(len(trucks))],
				Price:     price,
				Currency:  models.Currency(r.currency),
			}

			if err := dealRepo.Create(ctx, user.ID, r.from, r.to, r.kind, deal); err != nil {
				log.Printf("сделка: %v", err)
				continue
			}
			inserted++
		}
	}

	fmt.Printf("✓ seed выполнен: %d сделок за %d дней\n", inserted, totalDays)

	if err := seedMarketplace(ctx, pool, user.ID); err != nil {
		log.Printf("marketplace seed: %v", err)
	}
}

func bp(v float64) *float64 { return &v }

func seedMarketplace(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) error {
	var count int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM marketplace_loads").Scan(&count); err != nil {
		return fmt.Errorf("marketplace count: %w", err)
	}
	if count > 0 {
		log.Printf("marketplace: уже %d объявлений, пропускаем", count)
		return nil
	}

	type mLoad struct {
		from, to, ltype, cargo, weight, truck, currency, status, company, contact, comment string
		rate         float64
		benchmarkPct *float64
		daysFromNow  int
	}

	now := time.Now()
	loads := []mLoad{
		{"Минск, Беларусь", "Москва, Россия", "FTL", "FMCG", "20т", "Фура 20т", "EUR", "open", "ТрансЛогист", "+375 29 111-22-33", "", 1450, bp(-3.2), 3},
		{"Брест, Беларусь", "Санкт-Петербург, Россия", "FTL", "Металл", "18т", "Тентованный 20т", "EUR", "open", "БелКарго", "+375 44 222-33-44", "Требуется боковая загрузка", 1890, bp(8.1), 4},
		{"Минск, Беларусь", "Казань, Россия", "LTL", "Одежда", "5т", "Фура 10т", "EUR", "taken", "ФастФрахт", "+375 17 333-44-55", "", 620, bp(-1.0), 2},
		{"Гродно, Беларусь", "Смоленск, Россия", "FTL", "Продукты", "20т", "Рефрижератор 20т", "EUR", "open", "АгроТранс", "+375 29 444-55-66", "Температурный режим +4°C", 870, bp(-5.8), 5},
		{"Минск, Беларусь", "Москва, Россия", "LTL", "Химия", "8т", "Тентованный 20т", "EUR", "open", "ХимЭкспресс", "+375 44 555-66-77", "Опасный груз класс 3", 540, bp(2.3), 1},
		{"Витебск, Беларусь", "Екатеринбург, Россия", "FTL", "Мебель", "15т", "Фура 20т", "EUR", "open", "МебельТранс", "+375 29 666-77-88", "", 2350, bp(-9.1), 6},
		{"Минск, Беларусь", "Новосибирск, Россия", "FTL", "Стройматериалы", "20т", "Тентованный 20т", "EUR", "open", "СтройЛогист", "+375 17 777-88-99", "", 2900, bp(4.5), 7},
		{"Гомель, Беларусь", "Тверь, Россия", "LTL", "FMCG", "6т", "Фура 10т", "EUR", "open", "ПромГрупп", "+375 44 888-99-00", "", 480, bp(-2.1), 3},
	}

	const q = `
		INSERT INTO marketplace_loads
		    (user_id, from_city, to_city, load_type, load_date, cargo_type, weight,
		     truck_type, offered_rate, currency, status, company, contact_phone, benchmark_pct, comment)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`

	for _, l := range loads {
		loadDate := now.AddDate(0, 0, l.daysFromNow).Format("2006-01-02")
		if _, err := pool.Exec(ctx, q,
			userID, l.from, l.to, l.ltype, loadDate, l.cargo, l.weight,
			l.truck, l.rate, l.currency, l.status, l.company, l.contact, l.benchmarkPct, l.comment,
		); err != nil {
			return fmt.Errorf("marketplace insert: %w", err)
		}
	}

	fmt.Printf("✓ marketplace: добавлено %d объявлений\n", len(loads))
	return nil
}

func buildWeighted() []int {
	var list []int
	for i, r := range routes {
		for j := 0; j < r.weight; j++ {
			list = append(list, i)
		}
	}
	return list
}

func getOrCreateSeedUser(ctx context.Context, repo *repository.UserRepo) (*models.User, error) {
	const email = "admin@tariffradar.test"

	if u, err := repo.FindByEmail(ctx, email); err == nil {
		return u, nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("Admin123!"), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	u := &models.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(hash),
		Name:         "Администратор",
		Company:      "TariffRadar",
		Role:         models.RoleAdmin,
	}
	return u, repo.Create(ctx, u)
}
