# Lavender Messenger Web Client — gRPC клиент и стриминг

Документация по gRPC клиенту, стримингу и интеграции с сервером.

**Файл:** `src/shared/api/grpcClient.ts`
**Хуки:** `src/hooks/useGrpcStream.ts`, `src/hooks/useChatMessages.ts`
**Дата:** 2026-06-10

---

## 1. Архитектура gRPC клиента

### Singleton Pattern

```typescript
class GrpcClient {
  private static instance: GrpcClient

  static getInstance(): GrpcClient {
    if (!GrpcClient.instance) {
      GrpcClient.instance = new GrpcClient()
    }
    return GrpcClient.instance
  }
}

// Экспорт синглтона
export const grpcClient = GrpcClient.getInstance()
```

Один экземпляр на всё приложение. Все хуки и компоненты используют один клиент.

### Подключение

```typescript
// App.tsx — при монтировании
grpcClient.connect('ws://localhost:50051')

// App.tsx — при размонтировании
grpcClient.disconnect()
```

`disconnect()` закрывает все активные стримы через `AbortController`.

---

## 2. API клиента

### Unary Calls

| Метод | Параметры | Возвращает | Описание |
|-------|-----------|-----------|----------|
| `getChats(userId)` | `string` | `Promise<Chat[]>` | Список чатов пользователя |
| `getMessages(chatId, limit?)` | `string, number=50` | `Promise<Message[]>` | История сообщений |
| `sendMessage(chatId, content, senderId)` | `string, string, string` | `Promise<Message>` | Отправка сообщения |
| `createChat(participants, name?, type?)` | `string[], string?, Chat['type']` | `Promise<Chat>` | Создание чата |

### Server-Side Streaming

| Метод | Параметры | Возвращает | Описание |
|-------|-----------|-----------|----------|
| `streamChatMessages(chatId, callback)` | `string, StreamCallback` | `() => void` (cleanup) | Сообщения чата в реальном времени |
| `streamAllMessages(callback)` | `StreamCallback` | `() => void` (cleanup) | Presence updates |

---

## 3. StreamEvent — типы событий

```typescript
type StreamEvent =
  | { type: 'message'; message: Message }                    // Новое сообщение
  | { type: 'typing'; chatId: string; userId: string; isTyping: boolean }  // Набор текста
  | { type: 'presence'; userId: string; isOnline: boolean }  // Статус онлайн
  | { type: 'error'; error: string }                         // Ошибка
  | { type: 'done' }                                         // Завершение стрима
```

---

## 4. Мок-реализация

На данном этапе gRPC клиент использует mock-данные. В production будет заменён на сгенерированный grpc-web клиент из `messenger.proto`.

### Мок-чаты (4 штуки)

```typescript
const MOCK_CHATS: Record<string, Chat> = {
  'chat-1': { name: 'Алексей', type: 'regular', isOnline: true, ... },
  'chat-2': { name: 'Работа', type: 'regular', ... },
  'chat-3': { name: 'OWL AI', type: 'owl', ... },
  'chat-4': { name: 'Hermes', type: 'hermes', ... },
}
```

### Мок-сообщения

Каждый чат имеет 1-3 тестовых сообщения. Последнее сообщение в `chat-1` — входящее (для демонстрации unread).

### Мок-стриминг

`streamChatMessages()` симулирует входящие сообщения:
- Первое сообщение через 3 секунды
- Далее каждые 15-30 секунд (random)
- Текст из массива `INCOMING_MESSAGES` (10 вариантов)

---

## 5. useGrpcStream — lifecycle hook

### Назначение

Управление жизненным циклом gRPC стрима с учётом iOS-специфики.

### Интерфейс

```typescript
interface UseGrpcStreamOptions {
  chatId: string
  onEvent: StreamCallback
  enabled?: boolean  // default: true
}

useGrpcStream({ chatId, onEvent, enabled })
```

### Поведение

```
┌─────────────────────────────────────────────────────────────┐
│                    useGrpcStream                             │
│                                                             │
│  Mount / chatId change                                      │
│         │                                                   │
│         ▼                                                   │
│  grpcClient.streamChatMessages(chatId, callback)            │
│         │                                                   │
│         ▼                                                   │
│  Stream active ←──────────────────────────────┐             │
│         │                                      │             │
│         ▼                                      │             │
│  Events: message, typing, presence, error      │             │
│         │                                      │             │
│         ▼                                      │             │
│  onEvent(event) ───────────────────────────────┤             │
│         │                                      │             │
│         ▼                                      │             │
│  Unmount / chatId change / background          │             │
│         │                                      │             │
│         ▼                                      │             │
│  cleanup() → AbortController.abort() ──────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### iOS Background Handling

```typescript
// 1. Page Visibility API
document.addEventListener('visibilitychange', () => {
  if (document.hidden) → close stream    // экономия батареи
  else → reopen stream
})

// 2. iOS Safari specific
window.addEventListener('pagehide', () => close stream)
window.addEventListener('pageshow', () => reopen stream)

// 3. React cleanup
useEffect(() => () => cleanup(), [chatId])
```

**Критично для iPhone:** стрим НЕ должен работать в бэкграунде. Иначе батарея разряжается за минуты.

### AbortController

Каждый стрим использует `AbortController`:

```typescript
const controller = new AbortController()
const signal = controller.signal

// Внутри setTimeout:
if (signal.aborted) return  // не выполнять если стрим закрыт

// При закрытии:
controller.abort()  // отмена всех pending setTimeout
```

---

## 6. useChatMessages — комплексный хук

### Назначение

Объединяет загрузку истории, стриминг и отправку сообщений.

```typescript
const { messages, isLoadingMessages, isSendingMessage, sendMessage } = useChatMessages(chatId)
```

### Жизненный цикл

```
1. Монтирование (chatId изменился)
   │
   ├─→ grpcClient.getMessages(chatId, 50) → store.setMessages()
   ├─→ store.updateChat(chatId, { unreadCount: 0 })
   └─→ useGrpcStream({ chatId, onEvent: handleStreamEvent })
       │
       └─→ При входящем сообщении: store.addMessage(event.message)

2. Отправка сообщения
   │
   ├─→ grpcClient.sendMessage(chatId, content, 'user-1')
   └─→ store.addMessage(response)

3. Размонтирование
   │
   └─→ useGrpcStream cleanup → AbortController.abort()
```

### Cancellable Pattern

```typescript
const chatIdRef = useRef(chatId)
chatIdRef.current = chatId

// В async операциях:
if (chatIdRef.current !== chatId) return  // устарело, игнорируем
```

Предотвращает гонку данных при быстром переключении чатов.

---

## 7. Интеграция с сервером (production)

### Замена mock на реальный gRPC

```typescript
// Сейчас (mock):
import { grpcClient } from '@/shared/api/grpcClient'

// Production (grpc-web):
import { ChatServiceClient } from '../proto/messenger_grpc_web_pb'
import { GetChatsRequest } from '../proto/messenger_pb'

const client = new ChatServiceClient('https://server:50051')

// Unary:
const request = new GetChatsRequest()
request.setUserId('user-1')
client.getChats(request, {}, (err, response) => { ... })

// Streaming:
const stream = client.streamChatMessages(request)
stream.on('data', (response) => { ... })
stream.on('end', () => { ... })
```

### Proto файлы

Серверные proto: `/root/msg/messenger.proto`
Сгенерированные Go: `/root/msg/gen/`

Для веб-клиента:
1. Скопировать `messenger.proto`
2. `protoc --grpc-web_out=import_style=typescript,mode=grpcwebtext:. messenger.proto`
3. Использовать сгенерированные классы

### Envoy Proxy

Для grpc-web нужен Envoy proxy:

```yaml
# envoy.yaml (упрощённо)
static_resources:
  listeners:
  - address:
      socket_address: { address: 0.0.0.0, port_value: 8080 }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          codec_type: AUTO
          route_config:
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match: { prefix: "/" }
                route: { cluster: grpc_backend }
          http_filters:
          - name: envoy.filters.http.grpc_web
          - name: envoy.filters.http.cors
          - name: envoy.filters.http.router
  clusters:
  - name: grpc_backend
    connect_timeout: 0.25s
    type: LOGICAL_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: grpc_backend
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: lavender-server, port_value: 50051 }
```

---

## 8. Обработка ошибок

### Текущая реализация (mock)

```typescript
try {
  const message = await grpcClient.sendMessage(chatId, content, senderId)
  addMessage(message)
} catch (err) {
  console.error('Failed to send message:', err)
}
```

### Production (план)

```typescript
// Типы ошибок:
// - NetworkError (нет связи)
// - AuthError (401, нужна переаутентификация)
// - RateLimitError (429, too many requests)
// - ServerError (500)

// Retry с exponential backoff для NetworkError
// Показать toast для RateLimitError
// Redirect на login для AuthError
```

---

## 9. Rate Limiting

Сервер возвращает в `GetAIChatSettings`:
- `remaining` — оставшиеся запросы
- `limit` — лимит (10/мин с ключом, 20/час без)
- `windowSeconds` — окно (60 или 3600)

Веб-клиент должен:
1. Показывать `remaining/limit` в хедере AI чатов
2. Блокировать отправку при `remaining === 0`
3. Показывать таймер до сброса окна
