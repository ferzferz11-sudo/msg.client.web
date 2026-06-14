# Lava Messenger — Контекст проекта

**Версия:** v0.4.0
**Дата:** 2026-06-14

---

## Что такое Lava Messenger

Lava Messenger — self-hosted мессенджер с E2EE шифрованием и AI-ассистентами.
Аналоги: Telegram, Signal — но полностью свой сервер и свои клиенты.

**Название:** "Lava" (EN) / "Лава" (RU) с 🦞 логотипом

---

## Компоненты системы

### Сервер (Go)
- **Путь на dev сервере:** `/root/msg`
- **Путь на prod:** `/root/LavenderMessenger/run`
- **Версия:** v1.1.4.0 (dev) / v1.1.3.10 (prod)
- **Порты:** 50052 (dev gRPC), 50051 (prod gRPC), 8083/8081 (HTTP)
- **БД:** PostgreSQL (chat_db_dev / chat_db)
- **systemd:** lavender-server-dev / lavender-server

Ключевые файлы:
```
server.go              — gRPC хендлеры (~3550 строк)
main.go                — точка входа
hub.go                 — менеджер подключений
db.go                  — PostgreSQL, миграции
crypto.go              — AES-256-GCM + bcrypt
secret_chat.go         — E2EE хендлеры
ai_chat_manager.go     — единый менеджер AI чатов
hermes_orchestrator.go — AI оркестратор
messenger.proto        — protobuf определения
```

### Android клиент (Kotlin)
- **Путь:** `/root/msg.client.android`
- **Версия:** v1.1.3.10
- **Мин SDK:** 29, Target SDK: 35

### Web клиент (TypeScript) — этот проект
- **Путь:** `/root/msg.client.web`
- **Версия:** v0.4.0
- **Деплой:** `http://13.140.25.249/web/`

---

## AuthService V2

### JWT Токены
- **Access token:** TTL 15 минут
- **Refresh token:** TTL 30 дней, ротация при каждом refresh
- **Device info:** передаётся при signIn/signUp (deviceId, deviceName, deviceType)
- **При обнаружении reuse refresh token:** все устройства отзываются

### Методы
- `SignInV2(username, password, deviceInfo)` → AuthResponseV2
- `SignUpV2(username, password, email, deviceInfo)` → AuthResponseV2
- `RefreshToken(refreshToken)` → RefreshTokenResponse
- `SignOut(refreshToken, allDevices)` → void
- `RevokeDevice(deviceId)` → void

---

## AI-сервисы

### OWL AI
- Универсальный AI-ассистент через OpenRouter
- Стриминг ответов
- Per-chat настройки (API key, model)
- Rate limiting: 10/мин (с ключом), 20/час (без)

### Hermes Orchestrator
- Мульти-агентная система
- 8 пресетов агентов (Developer, DevOps, Architect, Support, QA, Analyst, Security, OWL)
- Маршрутизация запросов через LLM
- Режимы: single, parallel, pipeline

### Единый AI Chat
- `ai_chat_manager.go` — единый менеджер
- `ai_chat_sessions`, `ai_chat_messages`, `ai_chat_settings` — единые таблицы
- `ChatWithAI` RPC — единый стриминг для OWL и Hermes

---

## Архитектурные принципы

1. **creator_id (UUID)** — единственный надёжный owner identifier, НЕ username
2. **JSON через json.Marshal** — никогда не собирать JSON конкатенацией строк
3. **FK CASCADE** — удаление чата удаляет все связанные данные
4. **Полная изоляция** — каждый сервис в своём файле
5. **Версионирование** — сервер в server.go, Android в version.txt, Web в package.json

---

## Инфраструктура

### Dev сервер
- **Хост:** 13.140.25.249
- **gRPC:** 50052
- **HTTP:** 8083
- **DB:** chat_db_dev
- **systemd:** lavender-server-dev

### Prod сервер
- **Хост:** 159.195.38.145
- **gRPC:** 50051
- **HTTP:** 8081
- **DB:** chat_db
- **systemd:** lavender-server

### Web клиент (этот сервер)
- **IP:** 13.140.25.249
- **Nginx:** `/web` → SPA dist, `/messenger` → gRPC-web proxy
- **gRPC-web proxy:** порт 9090 → dev сервер 50052
- **systemd:** grpc-web-proxy

---

## Команды

```bash
# Web client build
cd /root/msg.client.web
npm run build

# Web client type check
npx tsc --noEmit

# Proto gen (web)
cd /root/msg.client.web && npx buf generate

# Перезапуск gRPC-web proxy
sudo systemctl restart grpc-web-proxy

# Сборка сервера (dev) — НЕ ЗАПУСКАТЬ на этом сервере, OOM risk
```

---

## Документация сервера

Полная документация: `/root/msg/doc/`
- INDEX.md — индекс
- AUTHSERVICE_V2.md — AuthService V2
- INTEGRATION_SESSION.md — интеграционная сессия
- TASKS.md — задачи
- AI_SERVICES.md — AI сервисы
- PITFALLS.md — подводные камни
- PROJECT_MEMORY.md — память проекта
