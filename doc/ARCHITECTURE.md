# Lava Messenger Web Client — Полная архитектура

**Версия:** v0.4.0
**Дата:** 2026-06-14
**Статус:** 🟢 Auth V2 работает + Desktop UI + i18n

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
│   ├── App.tsx                        # Root: auth + routing (desktop/mobile)
│   ├── styles/global.css              # iOS стили (SafeArea, bounce, scroll)
│   ├── shared/
│   │   ├── types/index.ts             # TypeScript типы + i18n (t(), detectLang())
│   │   └── api/
│   │       ├── grpcClient.ts          # gRPC-web клиент + auth interceptor + retry
│   │       └── gen/proto/             # Сгенерированный код из proto
│   │           ├── messenger_pb.ts    # Типы сообщений
│   │           └── messenger_connect.ts # Сервисы (AuthService, ChatService)
│   ├── store/
│   │   ├── authStore.ts               # Auth state (Zustand + persist, V2 JWT)
│   │   ├── chatStore.ts               # Chat state (Zustand, нормализованный)
│   │   └── errorStore.ts              # Global errors + network status
│   ├── hooks/
│   │   ├── useChats.ts                # Загрузка списка чатов
│   │   ├── useChatMessages.ts         # История + стриминг + пагинация
│   │   ├── useGrpcStream.ts           # Lifecycle стрима (iOS background!)
│   │   ├── useIOSKeyboard.ts          # Обработка клавиатуры iOS
│   │   └── usePushNotifications.ts    # Web Push подписка
│   └── components/
│       ├── auth/
│       │   ├── AuthScreen.tsx         # Code splitting entry
│       │   ├── AuthScreen.mobile.tsx  # iOS-style форма входа (V2 + i18n)
│       │   └── AuthScreen.desktop.tsx # Desktop форма входа (V2 + i18n)
│       ├── chat/
│       │   ├── ChatScreen.tsx
│       │   ├── ChatScreen.mobile.tsx  # Экран чата (Virtuoso, input)
│       │   └── ChatScreen.desktop.tsx # Desktop чат (messages, input, header)
│       ├── chatList/
│       │   ├── ChatList.tsx
│       │   ├── ChatList.mobile.tsx    # Список чатов (аватары, unread)
│       │   ├── ChatList.desktop.tsx   # Sidebar список чатов (hover/active)
│       │   ├── ChatListScreen.tsx
│       │   ├── ChatListScreen.mobile.tsx # Экран списка чатов
│       │   └── ChatListScreen.desktop.tsx # Двухпанельный layout
│       └── common/
│           ├── Screen.tsx             # Базовый layout (header+content+footer)
│           ├── Screen.mobile.tsx
│           └── Screen.desktop.tsx     # Flex container для desktop
├── doc/                                # Документация
├── grpc-web-proxy.cjs                  # Node.js gRPC-web proxy (V2)
├── buf.gen.yaml                        # Buf generation config
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. Авторизация (Auth V2)

### Поток авторизации
```
1. Пользователь открывает PWA
2. App.tsx проверяет authStore.isAuthenticated
3. Если false → показывается AuthScreen
4. Пользователь вводит username/password
5. AuthScreen вызывает grpcClient.signInV2(username, password, deviceInfo)
6. Сервер возвращает AuthResponseV2 { success, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, user }
7. authStore.setTokens(response) → сохраняет в localStorage
8. App.tsx переключает на ChatListScreen
```

### AuthStore (Zustand)
```typescript
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

### Auth Interceptor
Автоматически добавляет `Authorization: Bearer <access_token>` к каждому gRPC запросу.
Проверяет expiry и делает refresh за 5 минут до истечения.

### Token Types
```typescript
interface TokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number   // unix timestamp
  refreshExpiresAt: number  // unix timestamp
}

interface AuthResponseV2 {
  success: boolean
  message: string
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
  user: {
    id: string
    username: string
    email: string
    avatarUrl: string
    bio: string
    status: string
  }
}

interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string    // новый refresh token (rotation)
  accessExpiresAt: number
  refreshExpiresAt: number
}

interface DeviceInfo {
  deviceId: string
  deviceName: string
  deviceType: "web"
}
```

---

## 3. gRPC-web клиент

### Подключение
```typescript
// Инициализация (App.tsx)
const getToken = () => useAuthStore.getState().tokens
grpcClient.connect('/messenger', getToken)
```

### Методы AuthService V2
| Метод | Тип | Описание |
|-------|-----|----------|
| signInV2 | Unary | Вход (username, password, deviceInfo) → AuthResponseV2 |
| signUpV2 | Unary | Регистрация (username, password, email, deviceInfo) → AuthResponseV2 |
| refreshToken | Unary | Обновление токена → RefreshTokenResponse |
| signOut | Unary | Выход (refreshToken, allDevices) → void |
| revokeDevice | Unary | Отзыв устройства (deviceId) → void |

### Методы ChatService
| Метод | Тип | Описание |
|-------|-----|----------|
| getChats | Unary | Список чатов пользователя |
| getHistory | Unary | История сообщений (с пагинацией) |
| sendMessage | Unary | Отправка сообщения |
| createDirectChat | Unary | Создание личного чата |
| createGroupChat | Unary | Создание группового чата |
| deleteChat | Unary | Удаление чата |
| markRead | Unary | Отметить как прочитанное |
| streamChatMessages | Server Streaming | Сообщения в реальном времени |

### Error Handling
```typescript
// Классификация ошибок
classifyError(error) → 'network' | 'auth' | 'rate_limit' | 'server' | 'unknown'

// Retry с exponential backoff
withRetry(fn, { maxAttempts: 3, baseDelay: 500 })
// - Auth errors НЕ ретраятся
// - Network errors: 3 попытки
// - signIn/SignUp: 2 попытки, baseDelay 1000ms
```

---

## 4. State Management (Zustand)

### authStore
- **Расположение:** `src/store/authStore.ts`
- **Persistence:** localStorage
- **Ключи:** `auth_tokens`, `auth_user`

### chatStore (нормализованный)
```typescript
// Структура данных
chats: { [chatId]: Chat }           // Метаданные чатов
messages: { [messageId]: Message }  // Плоское хранилище сообщений
chatMessages: { [chatId]: string[] } // Упорядоченные ID сообщений по чатам

// UI State
activeChatId: string | null
isLoadingChats: boolean
isLoadingMessages: boolean
isSendingMessage: boolean

// Selectors
getChatList()      // Массив чатов, отсортированных по lastMessageTime
getActiveChat()    // Текущий активный чат
getChatMessages(chatId) // Массив сообщений чата
```

**Почему нормализация:**
- O(1) доступ к любому сообщению по ID
- O(1) обновление сообщения
- Избежание дублирования данных

### errorStore
```typescript
interface ErrorState {
  errors: AppError[]           // max 5, auto-dismiss
  networkStatus: 'online' | 'offline'
  addError: (error: AppError) => void
  dismissError: (id: string) => void
  clearErrors: () => void
}
```

---

## 5. i18n (Локализация)

### Система
- Простой key-value store, без внешних библиотек
- Файлы: `src/shared/i18n/en.ts`, `src/shared/i18n/ru.ts`
- Функции: `t(key)`, `setLang(lang)`, `getLang()`, `detectLang()`

### Использование
```typescript
import { t, setLang } from '@/shared/types'

t('loginTitle')  // "Вход" (RU) / "Sign In" (EN)
setLang('en')    // Переключить язык
```

### Переведённые ключи
appName, loginTitle, signupTitle, usernamePlaceholder, passwordPlaceholder, emailPlaceholder, signIn, signUp, hasAccount, noAccount, connectionError, authError, loading, selectChat, writeMessage, signOut, online, offline, retry

### Переключатель
- Кнопка EN/RU в AuthScreen (правый верхний угол)
- Автоопределение по navigator.language (ru → РУ, остальное → EN)

---

## 6. Desktop vs Mobile

### Desktop (≥ 768px)
- **Layout:** Двухпанельный — Sidebar (320px) + main area
- **Навигация:** ChatListScreen рендерится напрямую (без screen-based навигации)
- **Sidebar:** ChatList с hover/active состояниями, бейджами, аватарами
- **Main area:** ChatScreen с сообщениями, инпутом, хедером с поиском

### Mobile (< 768px)
- **Layout:** Screen-based навигация (ChatListScreen → ChatScreen)
- **iOS оптимизации:** SafeArea, bounce prevention, keyboard handling
- **PWA:** standalone display, Web Push

### Code Splitting
Каждый компонент имеет 3 файла:
```
Component.tsx            ← React.lazy + matchMedia(768) → выбор загрузки
Component.mobile.tsx     ← Основная реализация (мобильная)
Component.desktop.tsx    ← Desktop реализация
```

---

## 7. iOS оптимизации

### Safe Area
```css
html {
  --sat: env(safe-area-inset-top, 0px);     /* ~44px на iPhone с вырезом */
  --sab: env(safe-area-inset-bottom, 0px);  /* ~34px на iPhone */
}
```

### Bounce Scroll Prevention
```css
html, body {
  overflow: hidden;
  position: fixed;
  overscroll-behavior: none;
}
```

### Keyboard Handling (useIOSKeyboard)
Использует `window.visualViewport` API. CSS переменная `--keyboard-height` обновляется автоматически.

### Stream Lifecycle (useGrpcStream)
- Закрытие стрима при уходе в бэкграунд (экономия батареи)
- `visibilitychange`, `pagehide`, `pageshow` event listeners
- AbortController для отмены

---

## 8. PWA

### Manifest
```json
{
  "name": "Lava Messenger",
  "short_name": "Lava",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e"
}
```

### Service Worker
- **Push событие:** Извлекает JSON (title, body, chatId) → `showNotification()`
- **Notification click:** Фокусирует окно или открывает новое, навигирует в чат

---

## 9. Команды

```bash
# Dev server (http://localhost:3000)
npm run dev

# Production build (+ chmod fix для manifest.json)
npm run build

# TypeScript check
npx tsc --noEmit

# Генерация кода из proto
npx buf generate

# Запуск gRPC-web proxy
node grpc-web-proxy.cjs

# Перезапуск proxy (systemd)
sudo systemctl restart grpc-web-proxy
```

---

## 10. Переменные окружения

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `VITE_API_URL` | `/messenger` | URL gRPC-web proxy |

---

## 11. Ссылки

- **Сервер:** `/root/msg/`
- **Документация сервера:** `/root/msg/doc/`
- **AuthService V2 docs:** `/root/msg/doc/AUTHSERVICE_V2.md`
- **Android клиент:** `/root/msg.client.android/`
- **Proto файл:** `/root/msg/messenger.proto`
- **Сгенерированный код:** `/root/msg.client.web/src/shared/api/gen/proto/`
