// internal/repository/users_test.go — интеграционные тесты UserRepo.
package repository

import (
	"context"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"tariffradar/internal/models"
)

func TestUserRepo_CreateAndFind(t *testing.T) {
	ctx := context.Background()
	repo := NewUserRepo(testDB)

	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.MinCost)
	u := &models.User{
		Email:        "integration@example.com",
		PasswordHash: string(hash),
		Name:         "Тест Тестович",
		Company:      "ООО Тест",
		Role:         models.RoleViewer,
	}

	// Создаём пользователя.
	if err := repo.Create(ctx, u); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if u.ID.String() == "00000000-0000-0000-0000-000000000000" {
		t.Fatal("ID не заполнен после Create")
	}
	if u.CreatedAt.IsZero() {
		t.Fatal("CreatedAt не заполнен")
	}

	// Находим по email.
	found, err := repo.FindByEmail(ctx, "integration@example.com")
	if err != nil {
		t.Fatalf("FindByEmail: %v", err)
	}
	if found.Name != "Тест Тестович" {
		t.Errorf("Name: got %q, want %q", found.Name, "Тест Тестович")
	}
	if found.Role != models.RoleViewer {
		t.Errorf("Role: got %q, want %q", found.Role, models.RoleViewer)
	}

	// Находим по ID.
	byID, err := repo.FindByID(ctx, u.ID)
	if err != nil {
		t.Fatalf("FindByID: %v", err)
	}
	if byID.Email != u.Email {
		t.Errorf("FindByID Email mismatch: %q", byID.Email)
	}
}

func TestUserRepo_DuplicateEmail(t *testing.T) {
	ctx := context.Background()
	repo := NewUserRepo(testDB)

	hash, _ := bcrypt.GenerateFromPassword([]byte("pass1234"), bcrypt.MinCost)
	u := &models.User{
		Email:        "dup@example.com",
		PasswordHash: string(hash),
		Role:         models.RoleViewer,
	}

	if err := repo.Create(ctx, u); err != nil {
		t.Fatalf("первый Create: %v", err)
	}

	u2 := &models.User{
		Email:        "dup@example.com",
		PasswordHash: string(hash),
		Role:         models.RoleViewer,
	}
	if err := repo.Create(ctx, u2); err != ErrUserExists {
		t.Errorf("ожидали ErrUserExists, получили: %v", err)
	}
}

func TestUserRepo_NotFound(t *testing.T) {
	ctx := context.Background()
	repo := NewUserRepo(testDB)

	_, err := repo.FindByEmail(ctx, "nobody@nowhere.com")
	if err != ErrUserNotFound {
		t.Errorf("ожидали ErrUserNotFound, получили: %v", err)
	}
}

func TestUserRepo_UpdateProfile(t *testing.T) {
	ctx := context.Background()
	repo := NewUserRepo(testDB)

	hash, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.MinCost)
	u := &models.User{
		Email:        "profile_update@example.com",
		PasswordHash: string(hash),
		Role:         models.RoleViewer,
	}
	if err := repo.Create(ctx, u); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := repo.UpdateProfile(ctx, u.ID, "Новое Имя", "ООО Новое", "+375291234567"); err != nil {
		t.Fatalf("UpdateProfile: %v", err)
	}

	found, _ := repo.FindByID(ctx, u.ID)
	if found.Name != "Новое Имя" {
		t.Errorf("Name после обновления: %q", found.Name)
	}
	if found.Company != "ООО Новое" {
		t.Errorf("Company после обновления: %q", found.Company)
	}
}
