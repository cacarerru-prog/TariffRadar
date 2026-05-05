# 📚 Полный гайд: TariffRadar → GitHub

**Дата:** 5 мая 2026  
**Репозиторий:** `git@github.com:cacarerru-prog/TariffRadar.git`

---

## 🎯 Что нужно сделать?

Загрузить весь проект (Go код + React фронтенд + дипломную работу) на GitHub.

---

## 📁 Структура папки перед загрузкой

```
D:\диплом\
├── src/                          ← Go-сервер (готов)
│   ├── cmd/
│   ├── internal/
│   ├── migrations/
│   ├── docker-compose.yml
│   └── HOW_TO_RUN.md
├── frontend/                     ← React фронтенд (готов)
│   ├── src/
│   └── package.json
├── diploma/                      ← Дипломная работа
│   ├── full.docx
│   └── [главы]
├── docs/                         ← Документация
├── .gitignore                    ← Исключает ненужные файлы ✨ НОВЫЙ
├── README.md                     ← Описание проекта ✨ НОВЫЙ
├── GIT_COMMANDS.md              ← Команды для выполнения ✨ НОВЫЙ
├── SSH_SETUP.md                 ← Если нужен SSH ключ ✨ НОВЫЙ
└── GITHUB_GUIDE.md              ← Этот файл ✨ НОВЫЙ
```

---

## 🚀 Пошаговый процесс (4 этапа)

### **ЭТАП 1️⃣: Подготовка (5 минут)**

- [ ] Убедись, что Git установлен: `git --version`
- [ ] Убедись, что у тебя есть GitHub аккаунт
- [ ] Открой Git Bash (или PowerShell) в папке `D:\диплом\`

**Команда проверки:**
```bash
pwd  # должно показать /d/диплом или C:\diплом
ls -la  # должны видеть папки src, frontend, diploma, docs
```

---

### **ЭТАП 2️⃣: Инициализация Git (2 минуты)**

Выполни команды **по очереди** (скопируй-вставь):

```bash
# 1. Инициализировать репозиторий
git init

# 2. Настроить пользователя (первый раз)
git config --global user.name "Aliaksandr Black"
git config --global user.email "cacarer.ru@gmail.com"

# 3. Добавить удалённый репозиторий
git remote add origin git@github.com:cacarerru-prog/TariffRadar.git

# 4. Проверить, что remote добавлен
git remote -v
```

**Должно вывести:**
```
origin  git@github.com:cacarerru-prog/TariffRadar.git (fetch)
origin  git@github.com:cacarerru-prog/TariffRadar.git (push)
```

✅ Если всё работает — переходи к ЭТАПУ 3️⃣

---

### **ЭТАП 3️⃣: Добавить файлы и коммит (3 минуты)**

```bash
# 1. Добавить все файлы в Git
git add .

# 2. Проверить статус
git status
# (должны увидеть файлы в зелёном списке "Changes to be committed")

# 3. Сделать первый коммит
git commit -m "Initial commit: TariffRadar MVP (Go backend + React frontend + diploma)"

# 4. Посмотреть историю
git log --oneline
# (должны видеть 1 коммит с твоим сообщением)

# 5. Переименовать ветку в main (если текущая ветка master)
git branch -M main
```

✅ Если всё работает — переходи к ЭТАПУ 4️⃣

---

### **ЭТАП 4️⃣: Загрузить на GitHub (PUSH) (2 минуты)**

```bash
# 1. Загрузить проект на GitHub
git push -u origin main

# 2. Проверить результат
git status
# (должно вывести: "On branch main, nothing to commit, working tree clean")
```

**Если будет ошибка про SSH:**

```bash
# Проверь SSH подключение
ssh -T git@github.com

# Если ошибка — см. файл SSH_SETUP.md и выполни там инструкции
```

✅ **Готово!** Проект загружен на GitHub!

---

## 🔍 Финальная проверка

Открой в браузере:
```
https://github.com/cacarerru-prog/TariffRadar
```

**Должны увидеть:**
- ✅ Папки: `src`, `frontend`, `diploma`, `docs`
- ✅ Файлы: `README.md`, `.gitignore`, `CLAUDE.md`
- ✅ История коммитов (1 коммит с твоим сообщением)

---

## 📝 Файлы с инструкциями

| Файл | Для чего | Когда нужен |
|------|----------|-----------|
| **GIT_COMMANDS.md** | Все команды по очереди | 👈 Начни отсюда |
| **SSH_SETUP.md** | Настройка SSH ключа | Если ошибка при push |
| **GIT_SETUP.md** | Подробная инструкция | Если нужны объяснения |
| **GIT_QUICKSTART.txt** | Быстрый чек-лист | Для справки |
| **README.md** | Описание проекта | На GitHub |

---

## 🆘 Частые ошибки и решения

### Ошибка: "fatal: not a git repository"

**Решение:** Убедись, что ты в папке `D:\диплом\` и выполнил `git init`

```bash
pwd  # проверь текущую папку
git status  # должна быть папка .git
```

---

### Ошибка: "Permission denied (publickey)"

**Решение:** Нужно настроить SSH ключ (см. **SSH_SETUP.md**)

```bash
ssh -T git@github.com
# Если ошибка — следуй инструкциям в SSH_SETUP.md
```

---

### Ошибка: "fatal: The current branch main has no upstream branch"

**Решение:** Используй флаг `-u`:

```bash
git push -u origin main
```

---

### Все файлы видны на GitHub, но нет истории коммитов

**Решение:** Может быть, ветка не совпадает. Проверь:

```bash
git branch
# Если видишь "master", выполни:
git branch -M main
git push -u origin main
```

---

## 📊 Проверь свой GitHub профиль

После успешного push наведи на:
```
https://github.com/cacarerru-prog/TariffRadar
```

Должны увидеть в шапке:
- **Code** — Твой код (Go + React + документация)
- **1 commit** — "Initial commit: TariffRadar MVP..."
- **main branch** — Основная ветка

---

## 🎉 Следующие шаги

После загрузки на GitHub ты можешь:

1. **Клонировать проект на новый компьютер:**
   ```bash
   git clone git@github.com:cacarerru-prog/TariffRadar.git
   cd TariffRadar
   ```

2. **Продолжать разработку:**
   ```bash
   git add .
   git commit -m "Описание изменений"
   git push
   ```

3. **Создавать ветки для новых функций:**
   ```bash
   git checkout -b feature/insights
   # ... делаешь изменения ...
   git push origin feature/insights
   ```

---

## 📚 Полезные ссылки

- **GitHub Docs:** https://docs.github.com
- **Git Tutorial:** https://www.atlassian.com/git/tutorials
- **Git Cheat Sheet:** https://github.github.com/training-kit/downloads/github-git-cheat-sheet.pdf

---

**Вопросы?** Смотри соответствующий файл:
- GIT_COMMANDS.md — копируй команды
- SSH_SETUP.md — проблемы с SSH
- GIT_SETUP.md — подробные объяснения

**Удачи! 🚀**

