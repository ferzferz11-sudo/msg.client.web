# Lavender Messenger Web Client — Интеграция с сервером

Документация по интеграции веб-клиента с сервером Lavender Messenger.

**Дата:** 2026-06-10
**Статус:** mock-реализация, интеграция в планах

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
| `GetChats` | Unary | Список чатов (обычные + AI) |
| `SendMessage` | Unary | Отправка сообщения |
| `GetMessages` | Unary | История сообщений |
| `CreateChat` | Unary | Создание чата |
| `DeleteChat` | Unary | Удаление (с каскадом) |
| `SubscribeChat` | Server streaming | Real-time подписка |

### AI Chat (единый, v1.1.2.3+)

| RPC | Тип | Описание |
|-----|-----|----------|
| `ChatWithAI` | Server streaming | Стриминг AI ответа |
| `GetAIChatHistory` | Unary | История AI чата |
| `GetAIChatSettings` | Unary | Настройки (API key, model, rate limit) |
| `UpdateAIChatSettings` | Unary | Сохранение настроек |

### AI Chat (deprecated)

| RPC | Тип | Описание |
|-----|-----|----------|
| `ChatWithOWL` | Server streaming | OWL AI (deprecated) |
| `ChatWithOrchestrator` | Server streaming | Hermes (deprecated) |

---

## Протоколы — ключевые сообщения

### ChatInfo
```
id              string
name            string
type            'regular' | 'owl' | 'hermes'
creator_id      string        // UUID
participants    string        // JSON массив UUID
last_message_text   string
last_message_time   timestamp
```

### AIChatRequest / AIChatResponse
```
AIChatRequest {
  user_id     string
  session_id  string   // пусто = новый чат
  message     string
  agent_id    string   // опционально
}

AIChatResponse {
  token       string   // чанк ответа
  finished    bool
  error       string
}
```

---

## Аутентификация

Клиент использует существующую систему Lavender:
- При первом входе: адрес сервера + ключ
- CredentialStore → localStorage/IndexedDB
- Каждый gRPC запрос включает credentials

---

## Структура таблиц БД (справочно)

### chats
- `id` — уникальный (`owl-<uuid>`, `hermes-<uuid>`, `<uuid>`)
- `type` — `'regular'`, `'owl'`, `'hermes'`
- `creator_id` — UUID владельца
- `participants` — JSON массив UUID

### ai_chat_sessions (v1.1.2.3+)
- `id` → `chats.id` (FK, CASCADE)
- `user_id`, `agent_type`, `model`, `system_prompt`, `active_agent_id`, `agent_mode`

### ai_chat_messages
- `session_id` → `ai_chat_sessions.id` (FK, CASCADE)
- `role`, `content`, `agent_id`

### ai_chat_settings
- `session_id` → `ai_chat_sessions.id` (FK, CASCADE)
- `user_api_key`, `model_override`

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

---

## Production интеграция (план)

1. Скопировать `messenger.proto` в `src/proto/`
2. Генерация TS: `protoc --grpc-web_out=... messenger.proto`
3. Заменить mock `grpcClient` на реальный grpc-web клиент
4. Настроить Envoy proxy для grpc-web → gRPC
5. Настроить CORS на сервере
