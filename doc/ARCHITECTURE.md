# Lavender Messenger Web Client — Полная документация

**Версия:** v0.2.0
**Дата:** 2026-06-11
**Статус:** 🟢 AuthService интегрирован, веб-клиент доступен через /web

---

## 1. Обзор архитектуры

### Стек технологий
| Компонент | Версия | Назначение |
|-----------|--------|-----------|
| React | 18.3 | UI фреймворк |
| TypeScript | 5.5 | Типизация |
| Vite | 5.4 | Сборка, dev server, HMR |
| Zustand | 4.5 | State management |
| @bufbuild/protobuf | 1.10 | Protobuf runtime |
| @connectrpc/connect | 1.6 | gRPC-web клиент |
| @connectrpc/connect-web | 1.6 | Транспорт для браузера |
| react-virtuoso | 4.12 | Виртуализация списков |

### Структура проекта
```
msg.client.web/
├── proto/messenger.proto              # API definition (копия с сервера)
├── public/
│   ├── manifest.json                  # PWA манифест
│   ├── sw.js                          # Service Worker (push notifications)
│   └── icons/                         # PWA иконки
├── src/
│   ├── main.tsx                       # Entry point
│   ├── App.tsx                        # Root: auth + routing
│   ├── styles/global.css              # iOS стили (SafeArea, bounce, scroll)
│   ├── shared/
│   │   ├── types/index.ts             # TypeScript типы (Chat, Message, User)
│   │   └── api/
│   │       ├── grpcClient.ts          # gRPC-web клиент + auth interceptor
│   │       └── gen/proto/             # Сгенерированный код из proto
│   │           ├── messenger_pb.ts    # Типы сообщений
│   │           └── messenger_connect.ts # Сервисы (AuthService, ChatService)
│   ├── store/
│   │   ├── authStore.ts               # Авторизация (Zustand + localStorage)
│   │   └── chatStore.ts               # Чаты (Zustand, нормализованный)
│   ├── hooks/
│   │   ├── useChats.ts                # Загрузка списка чатов
│   │   ├── useChatMessages.ts         # История + стриминг + пагинация
│   │   ├── useGrpcStream.ts           # Lifecycle стрима (iOS background!)
│   │   ├── useIOSKeyboard.ts          # Обработка клавиатуры iOS
│   │   └── usePushNotifications.ts    # Web Push подписка
│   └── components/
│       ├── auth/
│       │   ├── AuthScreen.tsx         # Code splitting entry
│       │   ├── AuthScreen.mobile.tsx  # iOS-style форма входа
│       │   └── AuthScreen.desktop.tsx # Заглушка
│       ├── chat/
│       │   ├── ChatScreen.tsx
│       │   ├── ChatScreen.mobile.tsx  # Экран чата (Virtuoso, input)
│       │   └── ChatScreen.desktop.tsx
│       ├── chatList/
│       │   ├── ChatList.tsx
│       │   ├── ChatList.mobile.tsx    # Список чатов (аватары, unread)
│       │   ├── ChatListScreen.tsx
│       │   ├── ChatListScreen.mobile.tsx
│       │   └── ChatListScreen.desktop.tsx
│       └── common/
│           ├── Screen.tsx             # Базовый layout (header+content+footer)
│           ├── Screen.mobile.tsx
│           └── Screen.desktop.tsx
├── doc/                                # Документация
│   ├── INDEX.md
│   ├── ARCHITECTURE.md
│   ├── CODEBASE.md
│   ├── IOS.md
│   ├── STATE.md
│   ├── GRPC.md
│   ├── SERVER_INTEGRATION.md
│   ├── ANDROID_PARITY.md
│   ├── PITFALLS.md
│   ├── TASKS.md
│   └── CHANGELOG.md
├── grpc-web-proxy.js                   # Node.js gRPC-web proxy
├── buf.gen.yaml                        # Buf generation config
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. Авторизация

### Поток авторизации
```
1. Пользователь открывает PWA
2. App.tsx проверяет authStore.isAuthenticated
3. Если false → показывается AuthScreen
4. Пользователь вводит username/password
5. AuthScreen вызывает grpcClient.connect(serverUrl)
6. Затем grpcClient.signIn(username, password)
7. Сервер возвращает AuthResponse { accessToken, refreshToken, user }
8. AuthScreen вызывает authStore.setAuth(user, accessToken, refreshToken)
9. Credentials сохраняются в localStorage
10. App.tsx переключает на ChatListScreen
```

### AuthStore (Zustand)
```typescript
// src/store/authStore.ts
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  
  setAuth: (user, accessToken, refreshToken) => void
  setAccessToken: (token) => void
  logout: () => void
}
```

**Persistence:** Все поля сохраняются в localStorage под ключами:
- `auth_user` — JSON объект User
- `auth_access_token` — JWT токен
- `auth_refresh_token` — Refresh токен

### Auth Interceptor
Автоматически добавляет `Authorization: Bearer <token>` к каждому gRPC запросу:
```typescript
function createAuthInterceptor(getToken: () => string | null) {
  return (next) => async (req) => {
    const token = getToken()
    if (token) {
      req.header.set('Authorization', `Bearer ${token}`)
    }
    return next(req)
  }
}
```

---

## 3. gRPC-web клиент

### Подключение
```typescript
// Инициализация
const getToken = () => useAuthStore.getState().accessToken
await grpcClient.connect('http://server:9090', getToken)

// Авторизация
const result = await grpcClient.signIn(username, password)
// result: { accessToken, refreshToken, user }

// Работа с чатами
const chats = await grpcClient.getChats(userId)
const { messages, hasMore } = await grpcClient.getHistory(roomId, 50)
const sentMsg = await grpcClient.sendMessage(roomId, text, userId)

// Стриминг
const cleanup = grpcClient.streamChatMessages(roomId, (event) => {
  if (event.type === 'message') {
    // Новое сообщение
  }
})
// Остановка
cleanup()
```

### Методы AuthService
| Метод | Тип | Описание |
|-------|-----|----------|
| signIn | Unary | Вход (username, password) → AuthResponse |
| signUp | Unary | Регистрация (username, password, email) → AuthResponse |
| refreshToken | Unary | Обновление токена → AuthResponse |
| logout | Unary | Выход → void |

### Методы ChatService
| Метод | Тип | Описание |
|-------|-----|----------|
| chat | BiDi Streaming | Основной чат (отправка/получение) |
| typing | BiDi Streaming | Индикатор набора текста |
| getChats | Unary | Список чатов пользователя |
| getHistory | Unary | История сообщений (с пагинацией) |
| createDirectChat | Unary | Создание личного чата |
| createGroupChat | Unary | Создание группового чата |
| deleteChat | Unary | Удаление чата |
| markRead | Unary | Отметить как прочитанное |
| registerToken | Unary | Регистрация push токена |

### Proto → TypeScript конвертеры
```typescript
// gRPC сообщения конвертируются в плоские объекты для Zustand store
function protoToMessage(msg: any): Message {
  return {
    id: msg.id || '',
    roomId: msg.roomId || msg.chatId || '',
    user: msg.user || '',
    text: msg.text || '',
    createdAt: msg.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    isOutgoing: false,
    isRead: msg.isRead || false,
    repliedToMessageId: msg.repliedToMessageId || '',
    repliedToUser: msg.repliedToUser || '',
    repliedToText: msg.repliedToText || '',
    agentId: msg.agentId || '',
  }
}
```

---

## 4. State Management (Zustand)

### authStore
- **Расположение:** `src/store/authStore.ts`
- **Persistence:** localStorage
- **Ключи:** `auth_user`, `auth_access_token`, `auth_refresh_token`

### chatStore (нормализованный)
```typescript
// Структура данных
chats: { [chatId]: Chat }           // Метаданные чатов
messages: { [messageId]: Message }  // Плоское хранилище сообщений
chatMessages: { [chatId]: string[] } // Упорядоченные ID сообщений по чатам

// Селекторы
getChatList()      // Массив чатов, отсортированных по lastMessageTime
getActiveChat()    // Текущий активный чат
getChatMessages(chatId) // Массив сообщений чата
```

**Почему нормализация:**
- O(1) доступ к любому сообщению по ID
- O(1) обновление сообщения
- Избежание дублирования данных

---

## 5. iOS оптимизации

### Safe Area
```css
html {
  --sat: env(safe-area-inset-top, 0px);     /* ~44px на iPhone с вырезом */
  --sab: env(safe-area-inset-bottom, 0px);  /* ~34px на iPhone */
}

.safe-top { padding-top: var(--sat); }
.safe-bottom { padding-bottom: var(--sab); }
```

### Bounce Scroll Prevention
```css
html, body {
  overflow: hidden;
  position: fixed;
  overscroll-behavior: none;
}

.scrollable {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
```

### Keyboard Handling (useIOSKeyboard)
```typescript
// Использует VisualViewport API (iOS Safari 13+)
const viewport = window.visualViewport
const keyboardHeight = window.innerHeight - viewport.height

// Устанавливает CSS переменные
document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`)
document.documentElement.style.setProperty('--viewport-available-height', `${viewport.height}px`)
```

### Stream Lifecycle (useGrpcStream)
```typescript
// Закрытие стрима при уходе в бэкграунд (экономия батареи)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) closeStream()
  else {
    fetchMissedMessages() // Получить пропущенные
    openStream()          // Открыть заново
  }
})

// iOS Safari specific
window.addEventListener('pagehide', closeStream)
window.addEventListener('pageshow', () => {
  fetchMissedMessages()
  openStream()
})
```

---

## 6. PWA

### Manifest
```json
{
  "name": "MSG — Lavender Messenger",
  "short_name": "MSG",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e"
}
```

### Service Worker
- **Push событие:** Извлекает JSON (title, body, chatId) → `showNotification()`
- **Notification click:** Фокусирует окно или открывает новое, навигирует в чат
- **CORS headers:** Для gRPC-web запросов

### Web Push
```typescript
// Подписка
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
})

// Регистрация токена на сервере
await grpcClient.registerPushToken(userId, endpoint, true)
```

---

## 7. Code Splitting

Каждый компонент имеет 3 файла:
```
Component.tsx            ← React.lazy + matchMedia(768) → выбор загрузки
Component.mobile.tsx     ← Основная реализация (мобильная)
Component.desktop.tsx    ← Минимальная заглушка
```

**Результат сборки:**
- `AuthScreen.mobile.js` — 4.7 kB
- `ChatScreen.mobile.js` — 8.4 kB
- `ChatList.mobile.js` — 6.3 kB
- `Screen.mobile.js` — 0.5 kB
- Desktop stubs — по 0.2-0.3 kB

---

## 8. Команды

```bash
# Dev server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Генерация кода из proto
npx buf generate

# Запуск gRPC-web proxy
node grpc-web-proxy.js
```

---

## 9. Переменные окружения

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `VITE_API_URL` | `http://13.140.25.249:9090` | URL gRPC-web proxy |
| `VITE_VAPID_PUBLIC_KEY` | — | VAPID ключ для Web Push |

---

## 10. Известные проблемы

### Блокирующая задача
**AuthService на сервере** — сервер пока не реализовал `AuthService`. После реализации:
1. Обновить web-клиент для работы с реальным AuthService
2. Настроить gRPC-web proxy (Envoy или grpcwebproxy)
3. Протестировать end-to-end

### gRPC-web proxy
Текущий Node.js прокси (`grpc-web-proxy.js`) — упрощённая реализация. Для production нужен:
- **Envoy** с grpc-web filter
- **grpcwebproxy** от Improbable
- **Nginx** с `ngx_http_grpc_module`

### Совместимость версий
- `@bufbuild/protobuf@1.10.1` — совместим с `@connectrpc/connect@1.6.1`
- `@bufbuild/protobuf@2.x` — НЕ совместим (нет `protoBase64` в экспорте)

---

## 11. Задачи после AuthService

### Высокий приоритет
1. Подключить web-клиент к реальному AuthService
2. Настроить production gRPC-web proxy
3. Протестировать signIn/signUp flow

### Средний приоритет
4. Реализовать refresh token flow
5. Добавить logout в UI
6. Обработка ошибок (network, auth, rate limit)

### Низкий приоритет
7. AI чаты (OWL, Hermes)
8. Контакты и профиль
9. Настройки и темы
10. E2EE (секретные чаты)

---

## 12. Ссылки

- **Сервер:** `/root/msg/`
- **Android клиент:** `/root/msg.client.android/`
- **Документация сервера:** `/root/msg/doc/`
- **Proto файл:** `/root/msg/messenger.proto`
- **Сгенерированный код:** `/root/msg.client.web/src/shared/api/gen/proto/`
