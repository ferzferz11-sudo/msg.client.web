# Lava Messenger Web Client — State Management (Zustand)

**Версия:** v0.4.0
**Дата:** 2026-06-14

---

## 1. Почему Zustand

| Критерий | Zustand | Redux | Context API |
|----------|---------|-------|-------------|
| Boilerplate | Минимум | Много | Средне |
| TypeScript | Отличный | Хороший | Средне |
| DevTools | Есть | Есть | Нет |
| Размер | ~1KB | ~4KB | 0 (встроен) |
| Селекторы | Встроенные | Нужен reselect | Нет |

Zustand выбран за минимализм и отличную поддержку TypeScript.

---

## 2. Stores

### authStore (`src/store/authStore.ts`)

```typescript
interface TokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number   // unix timestamp
  refreshExpiresAt: number  // unix timestamp
}

interface AuthState {
  user: User | null
  tokens: TokenPair | null
  isAuthenticated: boolean

  setTokens: (response: AuthResponseV2) => void
  updateAccessToken: (response: RefreshTokenResponse) => void
  logout: () => void
}
```

**Persistence:** localStorage
- `auth_tokens` — JSON с TokenPair
- `auth_user` — JSON с User

### chatStore (`src/store/chatStore.ts`)

Нормализованное хранилище чатов и сообщений.

```typescript
interface ChatState {
  // === Normalized Data ===
  chats: Record<string, Chat>
  messages: Record<string, Message>
  chatMessages: Record<string, string[]>

  // === UI State ===
  activeChatId: string | null
  isLoadingChats: boolean
  isLoadingMessages: boolean
  isSendingMessage: boolean

  // === Chat Actions ===
  setChats: (chats: Chat[]) => void
  addChat: (chat: Chat) => void
  updateChat: (chatId: string, updates: Partial<Chat>) => void
  removeChat: (chatId: string) => void
  setActiveChatId: (chatId: string | null) => void

  // === Message Actions ===
  setMessages: (chatId: string, messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  prependMessages: (chatId: string, messages: Message[]) => void

  // === Loading Actions ===
  setLoadingChats: (loading: boolean) => void
  setLoadingMessages: (loading: boolean) => void
  setSendingMessage: (sending: boolean) => void

  // === Selectors (computed) ===
  getChatList: () => Chat[]
  getActiveChat: () => Chat | null
  getChatMessages: (chatId: string) => Message[]
}
```

### errorStore (`src/store/errorStore.ts`)

```typescript
interface AppError {
  id: string
  type: 'network' | 'auth' | 'rate_limit' | 'server' | 'unknown'
  message: string
  timestamp: number
  dismissed: boolean
}

interface ErrorState {
  errors: AppError[]           // max 5, auto-dismiss
  networkStatus: 'online' | 'offline'

  addError: (error: Omit<AppError, 'id' | 'timestamp' | 'dismissed'>) => void
  dismissError: (id: string) => void
  clearErrors: () => void
  setNetworkStatus: (status: 'online' | 'offline') => void
}
```

---

## 3. Нормализованная структура (chatStore)

### Модель данных

```
chats:    { [chatId]: Chat }           — метаданные чатов
messages: { [messageId]: Message }     — плоское хранилище сообщений
chatMessages: { [chatId]: string[] }   — упорядоченные ID сообщений по чатам
```

### Зачем нормализация

**Без нормализации (вложенные данные):**
```javascript
// ❌ Дублирование, сложные обновления
chats: [
  {
    id: 'chat-1',
    messages: [ { id: 'm1', ... }, { id: 'm2', ... } ]  // вложенный массив
  }
]
// Обновить сообщение → найти чат → найти сообщение → обновить → перерендерить весь чат
```

**С нормализацией:**
```javascript
// ✅ O(1) доступ, O(1) обновление
chats:    { 'chat-1': { ... } }
messages: { 'm1': { ... }, 'm2': { ... } }
chatMessages: { 'chat-1': ['m1', 'm2'] }
// Обновить сообщение → messages['m1'] = newMsg → перерендерить только MessageBubble
```

---

## 4. Actions — подробно

### setChats(chats: Chat[])

Массовая инициализация чатов. Создаёт записи в `chats` и пустые массивы в `chatMessages`.

### addMessage(message: Message)

Добавляет сообщение и **автоматически обновляет чат**:
- Добавляет в `messages[id]`
- Добавляет ID в `chatMessages[chatId]` (если нет дубля)
- Обновляет `chat.lastMessageText`, `chat.lastMessageTime`
- Инкрементит `chat.unreadCount` (если входящее)

### prependMessages(chatId, messages[])

Добавляет сообщения в начало списка (для пагинации истории). Дедуплицирует по ID.

### updateChat(chatId, updates)

Частичное обновление чата. Используется для:
- `unreadCount: 0` — при открытии чата
- `lastMessageText` — при новом сообщении
- `isOnline` — при presence update

---

## 5. Selectors (computed)

Селекторы — функции, которые вычисляют производные данные. Вызываются внутри компонентов.

### getChatList()

```typescript
// Возвращает массив чатов, отсортированных по lastMessageTime (новые первые)
const chatList = useChatStore((s) => s.getChatList())
```

**Важно:** каждый вызов создаёт новый массив. Для мемоизации использовать `useMemo` или `shallow`:

```typescript
import { useShallow } from 'zustand/react/shallow'

const [chats, isLoading] = useChatStore(
  useShallow((s) => [s.getChatList(), s.isLoadingChats])
)
```

### getActiveChat()

```typescript
// Возвращает текущий активный чат или null
const activeChat = useChatStore((s) => s.getActiveChat())
```

### getChatMessages(chatId)

```typescript
// Возвращает массив сообщений чата в правильном порядке
const messages = useChatStore((s) => s.getChatMessages(chatId))
```

**Как работает:**
1. Берёт `chatMessages[chatId]` — массив ID
2. Мапит каждый ID через `messages[id]`
3. Фильтрует `undefined` (на случай гонки данных)

---

## 6. Использование в компонентах

### Подписка на данные

```typescript
// Компонент перерендерится только при изменении chatList
const chatList = useChatStore((s) => s.getChatList())

// Компонент перерендерится только при изменении activeChat
const activeChat = useChatStore((s) => s.getActiveChat())
```

### Вызов actions

```typescript
// Получить action (не подписывается на изменения)
const addMessage = useChatStore((s) => s.addMessage)

// Вызов:
addMessage(newMessage)
```

### Несколько селекторов

```typescript
// Плохо: два вызова store
const chats = useChatStore((s) => s.getChatList())
const isLoading = useChatStore((s) => s.isLoadingChats)

// Лучше: один вызов с useShallow
import { useShallow } from 'zustand/react/shallow'
const [chats, isLoading] = useChatStore(
  useShallow((s) => [s.getChatList(), s.isLoadingChats])
)
```

---

## 7. Схема потока данных

```
User Action / gRPC Event
         │
         ▼
    Hook (useChatMessages / useChats)
         │
         ▼
    Store Action (addMessage / setMessages / etc.)
         │
         ▼
    Zustand set() → immutable update
         │
         ▼
    React re-render (только подписанные компоненты)
         │
         ▼
    UI Update (ChatList / MessageBubble)
```

---

## 8. Поток авторизации (authStore)

```
1. signInV2(username, password, deviceInfo)
         │
         ▼
2. Сервер → AuthResponseV2 { accessToken, refreshToken, user, ... }
         │
         ▼
3. authStore.setTokens(response)
   - Сохраняет TokenPair в localStorage (ключ: auth_tokens)
   - Сохраняет User в localStorage (ключ: auth_user)
   - Устанавливает isAuthenticated = true
         │
         ▼
4. App.tsx переключает на ChatListScreen
         │
         ▼
5. Каждый gRPC запрос → interceptor проверяет accessExpiresAt
         │
         ├── OK → добавляет Bearer token
         │
         └── Истекает < 5 мин → refreshToken()
                              │
                              ├── OK → updateAccessToken() → новые токены
                              │
                              └── FAIL → logout() → redirect to login
```
