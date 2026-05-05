# TariffRadar — Быстрый запуск (Бэк + Фронт + БД)

**Время:** 15–20 минут с нуля  
**ОС:** Windows PowerShell (проверено 5.1+)

---

## 📋 Предварительные требования (Шаг 0)

```powershell
# Проверь наличие:
go version         # должно быть 1.21+
docker --version   # должна быть последняя версия
node -v           # желательно 18+, но не обязательно
```

Если что-то не установлено — смотри **Шаг 1** в `src/HOW_TO_RUN.md`.

---

## 🚀 Быстрый запуск (4 окна PowerShell)

### **Окно 1: Docker (PostgreSQL + Redis)**
```powershell
cd D:\диплом\src
docker compose up
```
Дождись `tariffradar-postgres` и `tariffradar-redis` со статусом `healthy`.

---

### **Окно 2: Go Backend**
```powershell
cd D:\диплом\src

# Один раз — подготовка
Copy-Item .env.example .env    # если ещё не скопировали
# Отредактируй JWT_SECRET в .env (32+ символа)
go mod tidy
goose -dir migrations postgres "postgres://tariffradar:secret@localhost:5432/tariffradar?sslmode=disable" up
go run scripts/seed/main.go

# Запуск сервера (основная команда)
go run cmd/server/main.go
```

Должно показать:
```
[info] окружение: development, порт: 8080
[info] postgres: подключено
[info] redis: подключено
[info] HTTP-сервер слушает на :8080
```

✅ **Бэк готов на http://localhost:8080**

---

### **Окно 3: Frontend (React + Vite)**

Если у тебя есть React-проект в `D:\диплом\frontend/`:

```powershell
cd D:\диплом\frontend

# Один раз — зависимости
npm install

# Запуск dev-сервера
npm run dev
```

Должно показать что-то вроде:
```
  VITE v5.0.0
  ➜  Local:   http://localhost:5173/
```

✅ **Фронт готов на http://localhost:5173**

---

### **Окно 4: Тестирование API (опционально)**

```powershell
# Проверка здоровья
Invoke-RestMethod http://localhost:8080/health

# Авторизация (получить JWT)
$loginBody = @{
    email    = "seed@tariffradar.test"
    password = "seed-password-12345"
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri http://localhost:8080/api/v1/auth/login `
    -Method Post `
    -Body $loginBody `
    -ContentType "application/json"

$token = $resp.token
$headers = @{ Authorization = "Bearer $token" }

# Профиль
Invoke-RestMethod http://localhost:8080/api/v1/me -Headers $headers

# Swagger UI
# Открой браузер: http://localhost:8080/docs
```

---

## 🎯 Проверка что всё работает

| Сервис | URL | Проверка |
|--------|-----|----------|
| **Фронт (React)** | http://localhost:5173 | Видны интерфейсы платформы |
| **Бэк (Go API)** | http://localhost:8080/health | Ответ `{"status":"ok",...}` |
| **Swagger UI** | http://localhost:8080/docs | Открывается список эндпоинтов |
| **PostgreSQL** | localhost:5432 | `docker ps` показывает `healthy` |
| **Redis** | localhost:6379 | `docker ps` показывает `healthy` |

---

## 🛑 Остановка всего

```powershell
# В каждом окне PowerShell нажми Ctrl+C

# Или полная остановка контейнеров:
docker compose down
```

---

## 🔧 Если фронт и бэк на разных портах — CORS

**Бэк** поддерживает CORS для:
- `http://localhost:3000` (Node.js dev server)
- `http://localhost:5173` (Vite)
- `http://localhost` (статичный фронт)

Если нужен другой порт — отредактируй `src/.env`:
```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8888
```
Потом перезапусти Окно 2 (бэк).

---

## 📱 Статичный фронт (HTML+CSS+JS)

Если у тебя есть готовый `TariffRadar4.html` статичный файл:

```powershell
cd D:\диплом
# Вариант 1: Python
python -m http.server 3000

# Вариант 2: npx serve
npx serve .

# Вариант 3: Live Server через VS Code
# Открой файл в VS Code → Right Click → "Open with Live Server"
```

Потом открой браузер на **http://localhost:3000** (Python) или **http://localhost:5000** (serve).

---

## 🐛 Частые проблемы

### Бэк не запускается: `postgres: ping не прошёл`
```powershell
# Проверь контейнеры
docker ps

# Перезапусти
docker compose restart postgres
```

### Фронт не видит API (CORS error)
1. Проверь что бэк запущен на `:8080`
2. В браузер-консоль смотри точный URL запроса
3. Добавь этот хост в `src/.env` → `CORS_ALLOWED_ORIGINS`

### `Command not found: goose`
```powershell
go install github.com/pressly/goose/v3/cmd/goose@latest
# Потом перезапусти PowerShell
```

### React зависимости не устанавливаются
```powershell
rm -r node_modules package-lock.json
npm install
```

---

## 📚 Дополнительная информация

**Полные инструкции:** см. `src/HOW_TO_RUN.md`  
**API документация:** http://localhost:8080/docs (Swagger UI)  
**Go код:** `src/internal/`  
**React код:** `frontend/src/`  
**БД схема:** `src/migrations/`

---

## ✅ Контрольный список

- [ ] Docker запущен (`docker ps` показывает 2 контейнера)
- [ ] Go сервер слушает на `:8080`
- [ ] React dev server на `:5173` (или статичный фронт на `:3000`)
- [ ] Браузер открыт на `http://localhost:5173` (фронт видит бэк без CORS ошибок)
- [ ] `/health` возвращает `{"status":"ok"}`
- [ ] Можешь залогиниться под `seed@tariffradar.test / seed-password-12345`

🎉 **Готово!**
