@echo off
REM TariffRadar Git Commit Script
REM Run this from D:\диплом\ directory

cd /d D:\диплом

echo [*] Инициализация git репозитория...
git init

echo [*] Настройка user config...
git config user.email "cacarer.ru@gmail.com"
git config user.name "Aleksandr Kacheuski"

echo [*] Добавление файлов...
git add CLAUDE.md TARIFFRADAR_BACKEND_CONTEXT.md

echo [*] Статус репозитория:
git status

echo.
echo [*] Коммитим изменения...
git commit -m "init: TariffRadar backend context и обновленный CLAUDE.md"

echo.
echo [✓] Готово! Коммит создан.
git log --oneline -5

pause
