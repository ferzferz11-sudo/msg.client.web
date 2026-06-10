# Lavender Messenger Web Client — State Management (Zustand)

Документация по управлению состоянием через Zustand.

**Файл:** `src/store/chatStore.ts`
**Дата:** 2026-06-10

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

## 2. Нормализованная структура

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

## 3. Store Interface

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

---

## 4. Actions — подробно

### setChats(chats: Chat[])

Массовая инициализация чатов. Создаёт записи в `chats` и пустые массивы в `chatMessages`.

```typescript
// Вызов:
store.setChats([chat1, chat2, chat3])

// Результат:
// chats: { 'chat-1': chat1, 'chat-2': chat2, 'chat-3': chat3 }
// chatMessages: { 'chat-1': [], 'chat-2': [], 'chat-3': [] }
```

### addMessage(message: Message)

Добавляет сообщение и **автоматически обновляет чат**:
- Добавляет в `messages[id]`
- Добавляет ID в `chatMessages[chatId]` (если нет дубля)
- Обновляет `chat.lastMessageText`, `chat.lastMessageTime`
- Инкрементит `chat.unreadCount` (если входящее)

```typescript
// Вызов:
store.addMessage({
  id: 'm-new',
  chatId: 'chat-1',
  content: 'Привет!',
  isOutgoing: false,
  ...
})

// Автоматически:
// messages['m-new'] = message
// chatMessages['chat-1'].push('m-new')
// chats['chat-1'].lastMessageText = 'Привет!'
// chats['chat-1'].unreadCount += 1
```

### prependMessages(chatId, messages[])

Добавляет сообщения в начало списка (для пагинации истории). Дедуплицирует по ID.

```typescript
// Загрузка старых сообщений при scroll-up:
const oldMessages = await grpcClient.getMessages(chatId, 50, offset)
store.prependMessages(chatId, oldMessages)
```

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

## 8. Мок-данные

Store заполняется данными из `grpcClient.ts`:

| Chat ID | Имя | Тип | Сообщения |
|---------|-----|-----|----------|
| chat-1 | Алексей | regular | 3 |
| chat-2 | Работа | regular | 1 |
| chat-3 | OWL AI | owl | 2 |
| chat-4 | Hermes | hermes | 2 |

При старте приложения:
1. `useChats()` → `grpcClient.getChats()` → `store.setChats()`
2. При открытии чата: `useChatMessages()` → `grpcClient.getMessages()` → `store.setMessages()`
3. Стрим: `grpcClient.streamChatMessages()` → `store.addMessage()` для каждого события
