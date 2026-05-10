// internal/repository/deals_test.go — интеграционные тесты DealRepo.
package repository

import (
	"context"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"tariffradar/internal/models"
)

// createTestUser — вспомогательная функция: создаёт тестового пользователя
// с уникальным email, чтобы тесты не зависели друг от друга.
func createTestUser(t *testing.T, email string) *models.User {
	t.Helper()
	repo := NewUserRepo(testDB)
	hash, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.MinCost)
	u := &models.User{Email: email, PasswordHash: string(hash), Role: models.RoleAnalyst}
	if err := repo.Create(context.Background(), u); err != nil {
		t.Fatalf("createTestUser %q: %v", email, err)
	}
	return u
}

func TestDealRepo_CreateAndList(t *testing.T) {
	ctx := context.Background()
	repo := NewDealRepo(testDB)

	user := createTestUser(t, "deal_create@example.com")

	deal := &models.Deal{
		DealDate:  time.Now().Add(-24 * time.Hour),
		CargoType: "FMCG",
		TruckType: "Фура 20т",
		Price:     1450.50,
		Currency:  models.CurrencyEUR,
		Comment:   "тест",
	}
	if err := repo.Create(ctx, user.ID, "Минск", "Москва", "FTL", deal); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if deal.ID == 0 {
		t.Fatal("ID не заполнен после Create")
	}

	// Ищем в общем списке.
	result, err := repo.List(ctx, ListFilter{FromCity: "Минск", ToCity: "Москва"})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if result.Total == 0 {
		t.Fatal("ожидали хотя бы одну сделку")
	}

	found := false
	for _, d := range result.Deals {
		if d.ID == deal.ID {
			found = true
			if d.Price != 1450.50 {
				t.Errorf("Price: got %.2f, want 1450.50", d.Price)
			}
			if d.Route != "Минск → Москва" {
				t.Errorf("Route: got %q", d.Route)
			}
			break
		}
	}
	if !found {
		t.Error("созданная сделка не найдена в списке")
	}
}

func TestDealRepo_FindByID(t *testing.T) {
	ctx := context.Background()
	repo := NewDealRepo(testDB)
	user := createTestUser(t, "deal_find@example.com")

	deal := &models.Deal{
		DealDate: time.Now().Add(-48 * time.Hour),
		CargoType: "Металл", TruckType: "Фура 10т",
		Price: 2000, Currency: models.CurrencyUSD,
	}
	if err := repo.Create(ctx, user.ID, "Брест", "Варшава", "FTL", deal); err != nil {
		t.Fatalf("Create: %v", err)
	}

	found, err := repo.FindByID(ctx, deal.ID)
	if err != nil {
		t.Fatalf("FindByID: %v", err)
	}
	if found.Price != 2000 {
		t.Errorf("Price mismatch: %.2f", found.Price)
	}
	if found.UserID != user.ID {
		t.Error("UserID mismatch")
	}
}

func TestDealRepo_Update(t *testing.T) {
	ctx := context.Background()
	repo := NewDealRepo(testDB)
	user := createTestUser(t, "deal_update@example.com")

	deal := &models.Deal{
		DealDate: time.Now().Add(-24 * time.Hour),
		CargoType: "Химия", TruckType: "Тентованный 20т",
		Price: 1100, Currency: models.CurrencyEUR,
	}
	if err := repo.Create(ctx, user.ID, "Минск", "Вильнюс", "LTL", deal); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := repo.Update(ctx, deal.ID, 1250, "обновлён"); err != nil {
		t.Fatalf("Update: %v", err)
	}

	updated, _ := repo.FindByID(ctx, deal.ID)
	if updated.Price != 1250 {
		t.Errorf("Price после Update: %.2f, want 1250", updated.Price)
	}
	if updated.Comment != "обновлён" {
		t.Errorf("Comment после Update: %q", updated.Comment)
	}
}

func TestDealRepo_Delete(t *testing.T) {
	ctx := context.Background()
	repo := NewDealRepo(testDB)
	user := createTestUser(t, "deal_delete@example.com")

	deal := &models.Deal{
		DealDate: time.Now().Add(-24 * time.Hour),
		CargoType: "Мебель", TruckType: "Фура 20т",
		Price: 900, Currency: models.CurrencyBYN,
	}
	if err := repo.Create(ctx, user.ID, "Гродно", "Берлин", "FTL", deal); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := repo.Delete(ctx, deal.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	_, err := repo.FindByID(ctx, deal.ID)
	if err == nil {
		t.Error("ожидали ошибку после удаления, но получили nil")
	}
}

func TestDealRepo_ListPagination(t *testing.T) {
	ctx := context.Background()
	repo := NewDealRepo(testDB)
	user := createTestUser(t, "deal_page@example.com")

	// Создаём 5 сделок.
	for i := range 5 {
		d := &models.Deal{
			DealDate: time.Now().AddDate(0, 0, -(i + 1)),
			CargoType: "FMCG", TruckType: "Фура 20т",
			Price: float64(1000 + i*100), Currency: models.CurrencyEUR,
		}
		if err := repo.Create(ctx, user.ID, "Минск", "Рига", "FTL", d); err != nil {
			t.Fatalf("Create #%d: %v", i, err)
		}
	}

	result, err := repo.List(ctx, ListFilter{FromCity: "Минск", ToCity: "Рига", Page: 1, PerPage: 2})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(result.Deals) != 2 {
		t.Errorf("ожидали 2 сделки на странице, получили %d", len(result.Deals))
	}
	if result.TotalPages < 3 {
		t.Errorf("TotalPages: got %d, want >= 3", result.TotalPages)
	}
}
