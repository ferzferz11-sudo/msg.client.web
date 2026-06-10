# Lavender Messenger Web Client — Кодовая база

Подробное описание каждого модуля и файла.

**Дата:** 2026-06-10

---

## 1. Типы (src/shared/types/index.ts)

Все TypeScript интерфейсы проекта:

```typescript
interface Chat {
  id: string
  name: string
  type: 'regular' | 'owl' | 'hermes'
  creatorId: string
  participants: string[]
  lastMessageText: string
  lastMessageTime: string
  unreadCount: number
  avatarUrl?: string
  isOnline?: boolean
  activeAgentId?: string           // для hermes-чатов
  agentMode?: 'single' | 'parallel' | 'pipeline'
}

interface Message {
  id: string
  chatId: string
  senderId: string
  senderName: string
  content: string
  createdAt: string
  isOutgoing: boolean
  isRead: boolean
  replyToId?: string
  agentId?: string                 // для AI-сообщений
}

interface User {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  isOnline: boolean
  lastSeen?: string
}

interface AIChatSettings {
  sessionId: string
  userApiKey: string
  model: string
  isUsingCustomKey: boolean
  remaining: number
  limit: number
  windowSeconds: number
}

interface Agent {
  id: string
  name: string
  description: string
  isPreset: boolean
  systemPrompt: string
  model: string
  emoji: string
}

type StreamEvent =
  | { type: 'message'; message: Message }
  | { type: 'typing'; chatId: string; userId: string; isTyping: boolean }
  | { type: 'presence'; userId: string; isOnline: boolean }
  | { type: 'error'; error: string }
  | { type: 'done' }

type StreamCallback = (event: StreamEvent) => void
```

---

## 2. gRPC клиент (src/shared/api/grpcClient.ts)

Синглтон-класс `GrpcClient` с mock-реализацией.

### Публичный интерфейс

| Метод | Тип | Описание |
|-------|-----|----------|
| `getInstance()` | static | Получить синглтон |
| `connect(address)` | Promise<void> | Подключение к серверу |
| `disconnect()` | void | Отключение + закрытие всех стримов |
| `isConnected()` | boolean | Проверка подключения |
| `getChats(userId)` | Promise<Chat[]> | Unary: список чатов |
| `getMessages(chatId, limit?)` | Promise<Message[]> | Unary: история сообщений |
| `sendMessage(chatId, content, senderId)` | Promise<Message> | Unary: отправка |
| `createChat(participants, name?, type?)` | Promise<Chat> | Unary: создание чата |
| `streamChatMessages(chatId, callback)` | () => void | Server streaming: сообщения чата. Возвращает cleanup-функцию |
| `streamAllMessages(callback)` | () => void | Server streaming: presence updates |

### Мок-поведение

- `getChats()` — возвращает 4 тестовых чата из `MOCK_CHATS`
- `getMessages()` — возвращает сообщения из `MOCK_MESSAGES[chatId]`
- `sendMessage()` — создаёт Message с `isOutgoing: true`
- `streamChatMessages()` — каждые 15-30 сек генерирует входящее сообщение из массива `INCOMING_MESSAGES`
- `streamAllMessages()` — каждые 20 сек отправляет presence update

### Управление стримами

Каждый стрим использует `AbortController`. При `disconnect()` все стримы закрываются через `controller.abort()`.

---

## 3. Zustand Store (src/store/chatStore.ts)

Нормализованное хранилище состояния.

### Структура данных

```
chats:    { [chatId]: Chat }           — метаданные чатов
messages: { [messageId]: Message }     — плоское хранилище сообщений
chatMessages: { [chatId]: string[] }   — упорядоченные ID сообщений по чатам
```

Нормализация позволяет:
- O(1) доступ к любому сообщению по ID
- O(1) обновление сообщения
- Избежать дублирования данных

### UI State

| Поле | Тип | Назначение |
|------|-----|-----------|
| `activeChatId` | string \| null | Текущий открытый чат |
| `isLoadingChats` | boolean | Загрузка списка чатов |
| `isLoadingMessages` | boolean | Загрузка истории сообщений |
| `isSendingMessage` | boolean | Отправка сообщения |

### Actions

**Chats:**
- `setChats(chats[])` — массовая загрузка чатов (инициализация)
- `addChat(chat)` — добавить новый чат
- `updateChat(chatId, updates)` — частичное обновление чата
- `removeChat(chatId)` — удаление чата + очистка chatMessages
- `setActiveChatId(chatId)` — установить активный чат

**Messages:**
- `setMessages(chatId, messages[])` — массовая загрузка истории
- `addMessage(message)` — добавить сообщение + обновить lastMessageText чата + increment unreadCount
- `updateMessage(messageId, updates)` — обновить сообщение
- `prependMessages(chatId, messages[])` — добавить старые сообщения в начало (пагинация)

**Loading:**
- `setLoadingChats(boolean)`
- `setLoadingMessages(boolean)`
- `setSendingMessage(boolean)`

### Selectors (computed)

- `getChatList()` — массив чатов, отсортированных по `lastMessageTime` (новые первые)
- `getActiveChat()` — текущий активный чат
- `getChatMessages(chatId)` — массив сообщений чата (по порядку из `chatMessages`)

---

## 4. Хуки (src/hooks/)

### useChats()

Загрузка списка чатов при монтировании.

```typescript
const { chats, isLoadingChats, openChat, createNewChat } = useChats()
```

**Поведение:**
- При mount: вызывает `grpcClient.getChats('user-1')` → `store.setChats()`
- `openChat(chatId)` → `store.setActiveChatId(chatId)`
- `createNewChat(participants, name?)` → `grpcClient.createChat()` → `store.addChat()` → `store.setActiveChatId()`

**Cancellable:** если компонент размонтируется до завершения запроса, результат игнорируется.

### useChatMessages(chatId)

Загрузка истории + real-time стриминг + отправка сообщений.

```typescript
const { messages, isLoadingMessages, isSendingMessage, sendMessage } = useChatMessages(chatId)
```

**Поведение:**
1. При открытии чата: `grpcClient.getMessages(chatId, 50)` → `store.setMessages()`
2. Помечает чат как прочитанный: `store.updateChat(chatId, { unreadCount: 0 })`
3. Подписывается на стрим через `useGrpcStream()`
4. Входящие сообщения: `store.addMessage(event.message)`
5. `sendMessage(content)` → `grpcClient.sendMessage()` → `store.addMessage()`

**Cancellable:** использует `chatIdRef` для проверки актуальности при асинхронных операциях.

### useGrpcStream({ chatId, onEvent, enabled })

Управление жизненным циклом gRPC стрима с учётом iOS-специфики.

**Поведение:**
1. При mount/chatId change: `grpcClient.streamChatMessages(chatId, callback)`
2. При unmount/chatId change: `cleanup()` — abort controller
3. `document.visibilitychange`:
   - `document.hidden` → закрыть стрим (экономия батареи)
   - `visible` → открыть стрим заново
4. `window.pagehide` → закрыть стрим (iOS Safari specific)
5. `window.pageshow` → открыть стрим заново (iOS Safari specific)

**Важно:** стрим НЕ должен работать когда приложение в бэкграунде. Это критично для батареи iPhone.

### useIOSKeyboard()

Отслеживание высоты виртуальной клавиатуры на iOS.

```typescript
const { keyboardHeight, isKeyboardOpen } = useIOSKeyboard()
```

**Поведение:**
- Использует `window.visualViewport` API (iOS Safari 13+)
- При изменении viewport: вычисляет `window.innerHeight - viewport.height`
- Если разница > 100px → клавиатура открыта
- Устанавливает CSS переменную `--keyboard-height` на `document.documentElement`

---

## 5. Компоненты

### App.tsx

Корневой компонент. Содержит:
- State-based роутинг (`chatList` | `chat`)
- gRPC connect/disconnect в `useEffect`
- CSS анимация переходов (`screen-enter`)

### Screen (components/common/)

Базовый layout: `header` (flex-shrink: 0) + `content` (flex: 1, overflow: hidden) + `footer` (flex-shrink: 0).

Использует `100dvh` для корректной работы с iOS клавиатурой.

### ChatListScreen (components/chatList/)

Экран списка чатов. Состоит из:
- **Header:** "Чаты" | "Lavender" | spacer (backdrop-blur, safe-top)
- **ChatList:** скроллируемый список чатов

### ChatList (components/chatList/)

Список чатов с элементами:
- Аватар (круг, 48px, первая буква имени или иконка типа)
- Индикатор онлайна (зелёный кружок)
- Имя чата + время последнего сообщения
- Превью последнего сообщения
- Счётчик непрочитанных (фиолетовый бейдж)

Форматирование времени: сегодня → `HH:MM`, вчера → `Вчера`, < 7 дней → `пн/вт/ср`, иначе `DD.MM`.

### ChatScreen (components/chat/)

Экран чата. Состоит из:
- **Header:** кнопка "Назад" (SVG-стрелка) | имя чата + статус онлайн
- **Messages:** скроллируемый список сообщений с auto-scroll
- **Input:** поле ввода + кнопка отправки

**Message Bubble:**
- Исходящие: фиолетовый градиент, скругление `18px 18px 4px 18px`, выравнивание вправо
- Входящие: полупрозрачный белый, скругление `18px 18px 18px 4px`, выравнивание влево
- Имя отправителя для входящих (в групповых чатах)
- Время + статус прочитанности (✓/✓✓)

**Message Input:**
- Поле ввода в круглом контейнере (border-radius: 20px)
- Кнопка отправки (круг, 40px), фиолетовая когда есть текст
- Enter отправляет сообщение
- `font-size: 16px` для предотвращения iOS зума

---

## 6. Глобальные стили (src/styles/global.css)

### iOS Reset
- `overflow: hidden; position: fixed` на `html` и `body` — предотвращает bounce scroll
- `overscroll-behavior: none` — запрет pull-to-refresh
- `-webkit-tap-highlight-color: transparent` — убирает синий блик при тапе
- `-webkit-user-select: none` — запрет выделения текста (native app feel)
- `-webkit-touch-callout: none` — запрет контекстного меню на long press

### Safe Area
```css
html {
  --sat: env(safe-area-inset-top, 0px);
  --sar: env(safe-area-inset-right, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
}
```
Классы-хелперы: `.safe-top`, `.safe-bottom`, `.safe-left`, `.safe-right`

### Scroll
```css
.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;  /* momentum scroll */
  overscroll-behavior-y: contain;      /* не пробрасывает scroll на родителя */
  scrollbar-width: none;               /* скрыть скроллбар */
}
```

### Input
```css
input, textarea, select {
  font-size: 16px !important;  /* предотвращает iOS зум при фокусе */
}
```

### Анимации
- `.screen-enter` — slideInFromRight 0.25s (переход между экранами)
- `.message-appear` — messageAppear 0.2s (появление сообщения)
- `.typing-dot-1/2/3` — анимация точек индикатора набора текста
