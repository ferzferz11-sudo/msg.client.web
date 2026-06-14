# Lava Messenger Web Client — gRPC клиент и стриминг

**Версия:** v0.4.0
**Файл:** `src/shared/api/grpcClient.ts`
**Хуки:** `src/hooks/useGrpcStream.ts`, `src/hooks/useChatMessages.ts`
**Дата:** 2026-06-14

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
const getToken = () => useAuthStore.getState().tokens
grpcClient.connect('/messenger', getToken)

// App.tsx — при размонтировании
grpcClient.disconnect()
```

---

## 2. API клиента

### AuthService V2 (Unary)

| Метод | Параметры | Возвращает | Описание |
|-------|-----------|-----------|----------|
| `signInV2` | `username, password, deviceInfo` | `Promise<AuthResponseV2>` | Вход |
| `signUpV2` | `username, password, email, deviceInfo` | `Promise<AuthResponseV2>` | Регистрация |
| `refreshToken` | `refreshToken` | `Promise<RefreshTokenResponse>` | Обновление токена |
| `signOut` | `refreshToken, allDevices` | `Promise<void>` | Выход |
| `revokeDevice` | `deviceId` | `Promise<void>` | Отзыв устройства |

### ChatService (Unary)

| Метод | Параметры | Возвращает | Описание |
|-------|-----------|-----------|----------|
| `getChats` | `userId, username` | `Promise<Chat[]>` | Список чатов |
| `getHistory` | `chatId, limit` | `Promise<{ messages: Message[], hasMore: boolean }>` | История сообщений |
| `sendMessage` | `chatId, content` | `Promise<Message>` | Отправка сообщения |
| `createDirectChat` | `participantId` | `Promise<Chat>` | Создание личного чата |
| `createGroupChat` | `name, participants` | `Promise<Chat>` | Создание группового чата |
| `deleteChat` | `chatId` | `Promise<void>` | Удаление чата |
| `markRead` | `chatId` | `Promise<void>` | Отметить как прочитанное |

### Server-Side Streaming

| Метод | Параметры | Возвращает | Описание |
|-------|-----------|-----------|----------|
| `streamChatMessages` | `chatId, callback` | `() => void` (cleanup) | Сообщения чата в реальном времени |

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

## 4. Auth Interceptor

Автоматически добавляет `Authorization: Bearer *** к каждому gRPC запросу.
Проверяет expiry и делает refresh за 5 минут до истечения.

```typescript
function createAuthInterceptor(getTokens: () => TokenPair | null) {
  return (next: any) => async (req: any) => {
    const tokens = getTokens()
    if (tokens) {
      const now = Math.floor(Date.now() / 1000)
      if (now >= tokens.accessExpiresAt - 300) {
        // Refresh token
        const newTokens = await grpcClient.refreshToken(tokens.refreshToken)
        if (newTokens) {
          authStore.setTokens(newTokens)
          req.header.set('Authorization', `Bearer ${newTokens.accessToken}`)
        } else {
          authStore.logout()
        }
      } else {
        req.header.set('Authorization', `Bearer ${tokens.accessToken}`)
      }
    }
    return next(req)
  }
}
```

---

## 5. Error Handling

### Классификация ошибок

```typescript
type ErrorType = 'network' | 'auth' | 'rate_limit' | 'server' | 'unknown'

// gRPC error mapping:
// UNAUTHENTICATED → auth
// UNAVAILABLE → network
// RESOURCE_EXHAUSTED → rate_limit
// остальное → server
```

### Retry с exponential backoff

```typescript
withRetry(fn, { maxAttempts: 3, baseDelay: 500 })
// - Auth errors НЕ ретраятся
// - Network errors: 3 попытки
// - signIn/SignUp: 2 попытки, baseDelay 1000ms
// - sendMessage: 2 попытки, baseDelay 300ms
```

---

## 6. useGrpcStream — lifecycle hook

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
Mount / chatId change
        │
        ▼
grpcClient.streamChatMessages(chatId, callback)
        │
        ▼
Stream active ←──────────────────────────────┐
        │                                      │
        ▼                                      │
Events: message, typing, presence, error      │
        │                                      │
        ▼                                      │
onEvent(event) ───────────────────────────────┤
        │                                      │
        ▼                                      │
Unmount / chatId change / background          │
        │                                      │
        ▼                                      │
cleanup() → AbortController.abort() ──────────┘
```

### iOS Background Handling

```typescript
// 1. Page Visibility API
document.addEventListener('visibilitychange', () => {
  if (document.hidden) closeStream()
  else reopenStream()
})

// 2. iOS Safari specific
window.addEventListener('pagehide', closeStream)
window.addEventListener('pageshow', reopenStream)

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

## 7. useChatMessages — комплексный хук

### Назначение

Объединяет загрузку истории, стриминг и отправку сообщений.

```typescript
const { messages, isLoadingMessages, isSendingMessage, sendMessage } = useChatMessages(chatId)
```

### Жизненный цикл

```
1. Монтирование (chatId изменился)
   │
   ├─→ grpcClient.getHistory(chatId, 50) → store.setMessages()
   ├─→ store.updateChat(chatId, { unreadCount: 0 })
   └─→ useGrpcStream({ chatId, onEvent: handleStreamEvent })
       │
       └─→ При входящем сообщении: store.addMessage(event.message)

2. Отправка сообщения
   │
   ├─→ grpcClient.sendMessage(chatId, content)
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

## 8. Proto файлы

Серверные proto: `/root/msg/messenger.proto`
Сгенерированные Go: `/root/msg/gen/`

Для веб-клиента:
1. Скопировать `messenger.proto` в `proto/`
2. `npx buf generate`
3. Использовать сгенерированный код из `src/shared/api/gen/proto/`

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
