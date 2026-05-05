# 🔧 Команды Git для Git Bash

Открой **Git Bash** в папке `D:\диплом\` и выполняй команды **по очереди**.

---

## ✅ КОМАНДА 1: Инициализировать Git

```bash
git init
```

**Проверка:**
```bash
git status
```

---

## ✅ КОМАНДА 2: Настроить пользователя (первый раз)

```bash
git config --global user.name "Aliaksandr Black"
git config --global user.email "cacarer.ru@gmail.com"
```

**Проверка:**
```bash
git config --global --list
```

---

## ✅ КОМАНДА 3: Добавить remote репозиторий

```bash
git remote add origin git@github.com:cacarerru-prog/TariffRadar.git
```

**Проверка:**
```bash
git remote -v
```

Должно вывести:
```
origin  git@github.com:cacarerru-prog/TariffRadar.git (fetch)
origin  git@github.com:cacarerru-prog/TariffRadar.git (push)
```

---

## ✅ КОМАНДА 4: Добавить все файлы в Git (staging)

```bash
git add .
```

**Проверка:**
```bash
git status
```

Должны увидеть файлы (зелёные).

---

## ✅ КОМАНДА 5: Первый коммит

```bash
git commit -m "Initial commit: TariffRadar MVP (Go backend + React frontend + diploma)"
```

**Проверка:**
```bash
git log --oneline
```

---

## ✅ КОМАНДА 6: Переименовать ветку в main (если нужно)

```bash
git branch -M main
```

---

## ✅ КОМАНДА 7: Загрузить на GitHub (PUSH)

```bash
git push -u origin main
```

**Если будет ошибка про SSH:**

Проверь SSH ключ:
```bash
ssh -T git@github.com
```

Если ошибка "Permission denied" — см. [GIT_SETUP.md](GIT_SETUP.md) шаг 6.

---

## ✅ ФИНАЛЬНАЯ ПРОВЕРКА

```bash
git status
```

Должно вывести:
```
On branch main
nothing to commit, working tree clean
```

---

## 🎉 Готово!

Проверь в браузере: https://github.com/cacarerru-prog/TariffRadar

