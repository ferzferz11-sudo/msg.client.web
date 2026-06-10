# Lavender Messenger Web Client — Интеграция с сервером

Документация по интеграции веб-клиента с сервером Lavender Messenger.

**Дата:** 2026-06-10

---

## Сервер — обзор

| Параметр | Dev | Prod |
|----------|-----|------|
| Хост | 13.140.25.249 | 159.195.38.145 |
| gRPC порт | 50052 | 50051 |
| HTTP порт | 8083 | 8081 (APK), 8082 (uploads) |
| DB | chat_db_dev | chat_db |
| Версия | v1.1.2.7 | v1.1.2.7 |

---

## gRPC API — ключевые сервисы

### ChatService (основной)

| RPC | Тип | Описание |
|-----|-----|----------|
| `GetChats` | Unary | Список чатов пользователя (обычные + AI) |
| `SendMessage` | Unary | Отправка сообщения |
| `GetMessages` | Unary | История сообщений чата |
| `CreateChat` | Unary | Создание чата |
| `DeleteChat` | Unary | Удаление чата (с каскадом) |
| `SubscribeChat` | Server streaming | Real-time подписка на сообщения |

### AI Chat (единый, v1.1.2.3+)

| RPC | Тип | Описание |
|-----|-----|----------|
| `ChatWithAI` | Server streaming | Стриминг AI ответа (OWL или Hermes) |
| `GetAIChatHistory` | Unary | История AI чата |
| `GetAIChatSettings` | Unary | Настройки (API key, model) |
| `UpdateAIChatSettings` | Unary | Сохранение настроек |

### AI Chat (deprecated, работает)

| RPC | Тип | Описание |
|-----|-----|----------|
| `ChatWithOWL` | Server streaming | OWL AI стриминг |
| `ChatWithOrchestrator` | Server streaming | Hermes оркестратор |
| `GetOwlHistory` | Unary | История OWL |
| `GetOrchestratorHistory` | Unary | История Hermes |

### Hermes Orchestrator

| RPC | Тип | Описание |
|-----|-----|----------|
| `ListAgents` | Unary | Список агентов |
| `ListAgentPresets` | Unary | Пресеты агентов |
| `CreateAgent` | Unary | Создание агента |
| `UpdateAgent` | Unary | Обновление агента |
| `DeleteAgent` | Unary | Удаление агента |

---

## Протоколы — ключевые сообщения

### ChatInfo
```
id              string  // уникальный ID
name            string  // имя чата
type            string  // 'regular' | 'owl' | 'hermes'
creator_id      string  // UUID создателя
participants    string  // JSON массив UUID
last_message_text   string
last_message_time   timestamp
```

### AIChatRequest
```
user_id     string  // UUID пользователя
session_id  string  // пусто = новый чат
message     string  // текст сообщения
agent_id    string  // опционально: конкретный агент
```

### AIChatResponse
```
token       string  // чанк ответа
finished    bool    // конец стрима
error       string  // ошибка (если есть)
```

---

## Аутентификация

Клиент использует существующую систему Lavender:
- При первом входе: ввод адреса сервера + ключа
- CredentialStore → в браузере: localStorage или IndexedDB
- Каждый gRPC запрос включает credentials

---

## WebSocket / Real-time

Для real-time сообщений сервер поддерживает:
- `SubscribeChat` — server-side streaming через gRPC
- Альтернатива: WebSocket endpoint на HTTP порте

Для веб-клиента через grpc-web:
- Unary calls работают напрямую
- Server streaming через grpc-web streaming (поддерживается)

---

## Структура таблиц БД (справочно)

### chats
Единая таблица для всех чатов:
- `id` — уникальный (`owl-<uuid>`, `hermes-<uuid>`, `<uuid>`)
- `type` — `'regular'`, `'owl'`, `'hermes'`
- `creator_id` — UUID владельца
- `participants` — JSON массив UUID

### ai_chat_sessions
Единая таблица AI сессий (v1.1.2.3+):
- `id` → `chats.id` (FK, CASCADE)
- `user_id` — UUID владельца
- `agent_type` — `'owl'` | `'hermes'`
- `model`, `system_prompt`, `active_agent_id`, `agent_mode`

### ai_chat_messages
Единая таблица AI сообщений:
- `session_id` → `ai_chat_sessions.id` (FK, CASCADE)
- `role` — `'user'`, `'assistant'`, `'system'`, `'agent'`
- `content`, `agent_id`

### ai_chat_settings
Per-chat настройки:
- `session_id` → `ai_chat_sessions.id` (FK, CASCADE)
- `user_api_key`, `model_override`

---

## Proto файлы

Серверные proto: `/root/msg/messenger.proto`
Сгенерированные Go: `/root/msg/gen/`

Для веб-клиента нужно:
1. Скопировать `messenger.proto`
2. Сгенерировать TypeScript типы через `protoc-gen-grpc-web`

---

## Rate Limiting

- С ключом: 10 запросов/минуту
- Без ключа: 20 запросов/час
- `GetAIChatSettings` возвращает `remaining`, `limit`, `window_seconds`

---

## Известные проблемы сервера

1. **Hermes история** — после v1.1.2.3 использует `ai_chat_messages`, старые таблицы дропнуты
2. **Rate limiter** — cancel() при ошибках добавлен в v1.1.2.4
3. **DeleteChat** — каскадное удаление AI данных работает с v1.1.2.2
