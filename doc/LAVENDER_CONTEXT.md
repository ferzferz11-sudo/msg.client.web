# Lavender Messenger — Контекст проекта

Обзор проекта Lavender Messenger для разработчиков веб-клиента.

**Дата:** 2026-06-10

---

## Что такое Lavender Messenger

Lavender Messenger — self-hosted мессенджер с E2EE шифрованием и AI-ассистентами.
Аналоги: Telegram, Signal — но полностью свой сервер и свои клиенты.

---

## Компоненты системы

### Сервер (Go)
- **Репозиторий:** ferzferz11-sudo/msg
- **Путь на dev сервере:** `/root/msg`
- **Путь на prod:** `/root/LavenderMessenger/run`
- **Версия:** v1.1.2.7
- **Порты:** 50051 (prod gRPC), 50052 (dev gRPC), 8081-8083 (HTTP)
- **БД:** PostgreSQL (user: lavender, db: chat_db / chat_db_dev)

Ключевые файлы:
```
server.go              — gRPC хендлеры (~3550 строк)
main.go                — точка входа
hub.go                 — менеджер подключений
db.go                  — PostgreSQL, миграции
crypto.go              — AES-256-GCM + bcrypt
secret_chat.go         — E2EE хендлеры
ai_chat_manager.go     — единый менеджер AI чатов (v1.1.2.3+)
hermes_orchestrator.go — AI оркестратор
owl.go                 — OWL AI (deprecated, функционал в ai_chat_manager)
messenger.proto        — protobuf определения
```

### Android клиент (Kotlin)
- **Репозиторий:** ferzferz11-sudo/msg.client.android
- **Путь:** `/root/msg.client.android`
- **Версия:** v1.1.2.7
- **Мин SDK:** 29, Target SDK: 35

Ключевые файлы:
```
RealGrpcClient.kt      — gRPC клиент (~3000 строк, protobuf-lite ручной парсинг)
GrpcClient.kt          — фасад
ChatListActivity.kt    — список чатов
ChatViewModel.kt       — ViewModel чата
OwlChatActivity.kt     — OWL AI чат
HermesChatActivity.kt  — Hermes чат
AiChatGrpc.kt          — единый AI gRPC клиент (v1.1.2.3+)
CredentialStore.kt     — хранение credentials
E2EEManager.kt         — ECDH + AES-256-GCM
theme/                 — система тем
```

### Web клиент (TypeScript) — этот проект
- **Репозиторий:** ferzferz11-sudo/msg.client.web
- **Путь:** `/root/msg.client.web`
- **Статус:** в разработке

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

### Единый AI Chat (v1.1.2.3+)
- `ai_chat_manager.go` — единый менеджер
- `ai_chat_sessions`, `ai_chat_messages`, `ai_chat_settings` — единые таблицы
- `ChatWithAI` RPC — единый стриминг для OWL и Hermes
- Старые таблицы (owl_messages, hermes_messages и т.д.) дропнуты

---

## Архитектурные принципы

1. **creator_id (UUID)** — единственный надёжный owner identifier, НЕ username
2. **JSON через json.Marshal** — никогда не собирать JSON конкатенацией строк
3. **FK CASCADE** — удаление чата удаляет все связанные данные
4. **Полная изоляция** — каждый сервис в своём файле
5. **Версионирование** — сервер в server.go:33, Android в version.txt

---

## Инфраструктура

### Dev сервер
- **Хост:** 13.140.25.249
- **gRPC:** 50052
- **DB:** chat_db_dev
- **systemd:** lavender-server-dev

### Prod сервер
- **Хост:** 159.195.38.145
- **gRPC:** 50051
- **DB:** chat_db
- **systemd:** lavender-server

### Log Monitor
- **Prod:** порт 8090, `/server-logs/*`
- **Dev:** порт 8091, `/server-logs-dev/*`
- **Бинарь:** `/root/LavenderMessenger/run/log-monitor`

---

## Команды

```bash
# Сборка и деплой сервера (dev)
cd /root/msg
export PATH=$PATH:/usr/local/go/bin:~/go/bin
go build -o /tmp/lavender-server-dev .
systemctl stop lavender-server-dev
cp /tmp/lavender-server-dev /root/LavenderMessenger/run/lavender-server-dev
systemctl start lavender-server-dev

# Сборка и деплой сервера (prod)
go build -o /tmp/lavender-server .
systemctl stop lavender-server
cp /tmp/lavender-server /root/LavenderMessenger/run/lavender-server
systemctl start lavender-server

# Proto gen
cd /root/msg && protoc --go_out=./gen --go_opt=paths=source_relative \
  --go-grpc_out=./gen --go-grpc_opt=paths=source_relative messenger.proto

# Android компиляция
cd /root/msg.client.android
./gradlew compileDebugKotlin
# assembleRelease НЕ запускать на сервере — OOM kill
```

---

## Документация сервера

Полная документация: `/root/msg/doc/`
- INDEX.md — индекс
- AI_SERVICES.md — AI сервисы
- PITFALLS.md — подводные камни
- INTEGRATION_SESSION.md — интеграционная сессия
- TASKS.md — задачи
- PROJECT_MEMORY.md — память проекта
- HERMES_ORCHESTRATOR_DOC.md — документация оркестратора
- LOG_MONITOR.md — монитор логов
- AI_CHAT_REFACTOR.md — рефакторинг AI чатов
