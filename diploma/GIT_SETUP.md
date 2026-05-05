# 🚀 Инструкция: Загрузка проекта TariffRadar на GitHub

**Дата:** 5 мая 2026  
**Репозиторий:** `git@github.com:cacarerru-prog/TariffRadar.git`

---

## 📋 Полный пошаговый гайд

### Шаг 0️⃣: Проверка Git

Убедись, что Git установлен:

```bash
git --version
```

Если не установлен — установи с [git-scm.com](https://git-scm.com/)

---

### Шаг 1️⃣: Настроить Git (первый раз)

Если ты в первый раз используешь Git на этом компьютере:

```bash
git config --global user.name "Aliaksandr Black"
git config --global user.email "cacarer.ru@gmail.com"
```

Проверь, что сохранилось:

```bash
git config --global --list
```

---

### Шаг 2️⃣: Инициализировать Git в папке проекта

Открой **PowerShell** или **Command Prompt** в папке `D:\диплом\`:

```bash
cd D:\диплом
git init
```

Должно вывести: `Initialized empty Git repository in D:\диплом\.git/`

---

### Шаг 3️⃣: Добавить удалённый репозиторий (remote)

```bash
git remote add origin git@github.com:cacarerru-prog/TariffRadar.git
```

**Проверь, что remote добавлен:**

```bash
git remote -v
```

Должно вывести:
```
origin  git@github.com:cacarerru-prog/TariffRadar.git (fetch)
origin  git@github.com:cacarerru-prog/TariffRadar.git (push)
```

---

### Шаг 4️⃣: Добавить файлы в Git (staging)

Добавь все файлы в индекс Git:

```bash
git add .
```

**Проверь, какие файлы добавлены:**

```bash
git status
```

Должны увидеть файлы в разделе "Changes to be committed" (зелёный цвет)

---

### Шаг 5️⃣: Первый коммит

Сделай первый коммит с описанием:

```bash
git commit -m "Initial commit: TariffRadar MVP (Go backend + React frontend + diploma)"
```

**Проверь результат:**

```bash
git log
```

---

### Шаг 6️⃣: Подготовка SSH ключа (если ещё не настроил)

Если при push будет ошибка про SSH, нужно настроить SSH ключ:

**a) Проверь, есть ли уже SSH ключи:**

```bash
ls ~/.ssh
```

Если видишь файлы `id_rsa` и `id_rsa.pub` — переходи к шагу 6б.

**б) Если ключей нет, создай их:**

```bash
ssh-keygen -t rsa -b 4096 -C "cacarer.ru@gmail.com"
```

Нажимай Enter на все вопросы (без пароля).

**в) Добавь ключ в SSH agent:**

```bash
ssh-add ~/.ssh/id_rsa
```

**г) Скопируй публичный ключ в буфер обмена:**

На **Windows PowerShell**:
```bash
Get-Content ~/.ssh/id_rsa.pub | Set-Clipboard
```

На **Linux/Mac**:
```bash
cat ~/.ssh/id_rsa.pub | pbcopy
```

**д) Добавь ключ на GitHub:**

1. Открой GitHub → Settings → SSH and GPG keys → New SSH key
2. Вставь скопированный ключ (Ctrl+V)
3. Назови его "TariffRadar (Windows)" или подобное
4. Нажми "Add SSH key"

**е) Проверь подключение SSH:**

```bash
ssh -T git@github.com
```

Должно вывести:
```
Hi cacarerru-prog! You've successfully authenticated, but GitHub does not provide shell access.
```

---

### Шаг 7️⃣: Загрузить проект на GitHub (Push)

Теперь загрузи проект на GitHub:

```bash
git push -u origin master
```

Или если главная ветка `main`:

```bash
git branch -M main
git push -u origin main
```

**Проверь результат:**

```bash
git status
```

Должно вывести:
```
On branch main
nothing to commit, working tree clean
```

---

## ✅ Всё готово!

Проект успешно загружен на GitHub. Теперь:

- ✅ Можешь открыть https://github.com/cacarerru-prog/TariffRadar в браузере
- ✅ Все файлы синхронизированы
- ✅ Можешь использовать Git для версионирования

---

## 📝 Дальнейшая работа с Git

### Добавить изменения:

```bash
git add .
git commit -m "Описание изменений"
git push
```

### Создать ветку для новой функции:

```bash
git checkout -b feature/insights
# ... делаешь изменения ...
git add .
git commit -m "Add insights module"
git push origin feature/insights
```

### Посмотреть историю коммитов:

```bash
git log --oneline
```

### Вернуться к старому коммиту:

```bash
git checkout <commit-hash>
```

---

## 🆘 Если что-то не сработало

**Проблема:** "fatal: not a git repository"  
**Решение:** Убедись, что ты в папке `D:\диплом\` и там есть папка `.git`

**Проблема:** "Permission denied (publickey)"  
**Решение:** Пересоздай SSH ключ (шаг 6) и добавь его на GitHub

**Проблема:** "fatal: refusing to merge unrelated histories"  
**Решение:** Добавь флаг `--allow-unrelated-histories`:
```bash
git pull origin main --allow-unrelated-histories
```

---

## 📚 Полезные ссылки

- [GitHub Docs](https://docs.github.com)
- [Git Tutorial (Atlassian)](https://www.atlassian.com/git/tutorials)
- [Oh Shit, Git!?!](https://ohshitgit.com/) — помощь при ошибках Git

