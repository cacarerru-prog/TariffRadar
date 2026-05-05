# 🔑 Настройка SSH для GitHub (если нужна)

Если при `git push` вылезет ошибка — следуй этой инструкции.

---

## ШАГ 1️⃣: Проверить, есть ли уже SSH ключи

В **Git Bash** выполни:

```bash
ls -la ~/.ssh
```

**Если видишь файлы `id_rsa` и `id_rsa.pub`:**
- Переходи на ШАГ 3️⃣

**Если папка пуста:**
- Переходи на ШАГ 2️⃣

---

## ШАГ 2️⃣: Создать новый SSH ключ

```bash
ssh-keygen -t rsa -b 4096 -C "cacarer.ru@gmail.com"
```

**На все вопросы нажимай Enter** (без пароля):
```
Enter file in which to save the key (/home/user/.ssh/id_rsa): [Enter]
Enter passphrase (empty for no passphrase): [Enter]
Enter same passphrase again: [Enter]
```

**Проверь:**
```bash
ls -la ~/.ssh
```

Должны быть файлы `id_rsa` и `id_rsa.pub`.

---

## ШАГ 3️⃣: Скопировать публичный ключ

```bash
cat ~/.ssh/id_rsa.pub
```

**Скопируй весь текст вывода (от `ssh-rsa` до `cacarer.ru@gmail.com`).**

---

## ШАГ 4️⃣: Добавить ключ на GitHub

1. Открой https://github.com/settings/ssh/new
2. **Логин:** введи свой логин GitHub (cacarerru-prog)
3. **Password:** введи пароль GitHub
4. В окне "SSH keys" нажми **"New SSH key"**
5. **Title:** введи `TariffRadar (Windows)` или подобное
6. **Key type:** выбери `Authentication Key`
7. **Key:** вставь скопированный ключ (Ctrl+V)
8. Нажми **"Add SSH key"**

---

## ШАГ 5️⃣: Проверить подключение

В **Git Bash**:

```bash
ssh -T git@github.com
```

**Если успешно:**
```
Hi cacarerru-prog! You've successfully authenticated, but GitHub does not provide shell access.
```

**Если ошибка "Permission denied":**
- Проверь, что ключ правильно добавлен на GitHub
- Попробуй обновить SSH agent:
  ```bash
  eval $(ssh-agent -s)
  ssh-add ~/.ssh/id_rsa
  ```
- Повтори проверку: `ssh -T git@github.com`

---

## 🎉 Готово!

Теперь можешь выполнить:
```bash
git push -u origin main
```

