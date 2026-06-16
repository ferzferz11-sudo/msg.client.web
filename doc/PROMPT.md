# Lava Messenger Web Client — Промпт для новой сессии

**Версия:** v0.5.0
**Дата:** 2026-06-16
**Статус:** 🟢 Auth V2 + Chat V2 + Profile V2 + i18n + Dev proxy

---

## Что это за проект

Lava Messenger Web Client — SPA мессенджер на React 18 + TypeScript + Vite.
gRPC-web через Connect-RPC, Zustand state management, PWA.
Аналог Telegram Web, но для собственного сервера (Go + PostgreSQL).

**Путь:** `/root/msg.client.web/`
**Деплой:** `http://13.140.25.249/web/` (Nginx → dist/)

---

## Текущее состояние (v0.4.0)

### ✅ Работает
- **Auth V2** — SignInV2/SignUpV2 с JWT (access + refresh), авто-refresh за 5 мин до истечения
- **Chat V2** — getChats, getHistory, sendMessage через BiDi stream, real-time сообщения
- **Profile V2** — getProfile, updateProfile, updateAvatar, getUserSettings, updateUserSettings
- **i18n** — EN/RU локализация, автоопределение по navigator.language
- **Desktop UI** — двухпанельный layout (sidebar 320px + main area)
- **Mobile UI** — screen-based навигация, iOS-оптимизации
- **gRPC-web proxy** — Node.js прокси на порту 9090 → dev сервер 50052
- **Error handling** — классификация ошибок, retry с exponential backoff, errorStore

### 📋 Следующая задача
**Фаза 9: Контакты и профиль**
- Экран профиля (отображение/редактирование username, bio, status, avatar)
- Настройки пользователя (locale, theme, push)
- Список контактов
- Управление устройствами

---

## Архитектура

```
Браузер (gRPC-web) → Nginx :80 (/messenger) → Node.js proxy :9090 → gRPC dev сервер :50052
Браузер (SPA) → Nginx :80 (/web) → /root/msg.client.web/dist/
```

### Стек
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

### Структура файлов
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
│       ├── auth/                      # AuthScreen (entry, mobile, desktop)
│       ├── chat/                      # ChatScreen (entry, mobile, desktop)
│       ├── chatList/                  # ChatList + ChatListScreen (entry, mobile, desktop)
│       └── common/                    # Screen (entry, mobile, desktop)
├── doc/                               # Документация
│   ├── INDEX.md                       # Индекс документации
│   ├── ARCHITECTURE.md                # Полная архитектура
│   ├── CODEBASE.md                    # Детальное описание каждого модуля
│   ├── IOS.md                         # iOS Safari специфика
│   ├── STATE.md                       # Zustand store документация
│   ├── GRPC.md                        # gRPC клиент и стриминг
│   ├── SERVER_INTEGRATION.md          # Интеграция с сервером
│   ├── GRPC_WEB_PROXY.md              # gRPC-web proxy
│   ├── ANDROID_PARITY.md              # Соответствие Android-клиенту
│   ├── PITFALLS.md                    # Подводные камни
│   ├── LAVENDER_CONTEXT.md            # Контекст проекта (сервер, AI)
│   ├── TASKS.md                       # Таск-трекер
│   ├── CHANGELOG.md                   # История изменений
│   └── PROMPT.md                      # Этот файл
├── grpc-web-proxy.cjs                 # Node.js gRPC-web proxy (V2)
├── buf.gen.yaml                       # Buf generation config
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Auth V2 Flow

```
1. Пользователь вводит username/password
2. AuthScreen вызывает grpcClient.signInV2(username, password, deviceInfo)
3. Сервер возвращает AuthResponseV2 { success, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, user }
4. authStore.setTokens(response) → сохраняет в localStorage (ключ: auth_tokens)
5. Каждый gRPC запрос → interceptor проверяет accessExpiresAt
6. Если access истекает через < 5 мин → refreshToken() → новые токены
7. Если refresh истёк → logout → redirect to login
```

### TokenPair
```typescript
interface TokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number   // unix timestamp
  refreshExpiresAt: number  // unix timestamp
}
```

### DeviceInfo
```typescript
interface DeviceInfo {
  deviceId: string    // crypto.randomUUID() или Math.random() fallback
  deviceName: string  // navigator.userAgent или "Web Browser"
  deviceType: "web"
}
```

---

## State Management (Zustand)

### authStore
- `user: User | null`
- `tokens: TokenPair | null`
- `isAuthenticated: boolean`
- `setTokens(response: AuthResponseV2)` — сохраняет токены + пользователя
- `updateAccessToken(response: RefreshTokenResponse)` — обновляет после refresh
- `logout()` — очищает всё
- **Persistence:** localStorage (`auth_tokens`, `auth_user`)

### chatStore (нормализованный)
```
chats:    { [chatId]: Chat }           — метаданные чатов
messages: { [messageId]: Message }     — плоское хранилище сообщений
chatMessages: { [chatId]: string[] }   — упорядоченные ID сообщений по чатам
```
- **Selectors:** `getChatList()`, `getActiveChat()`, `getChatMessages(chatId)`
- **Actions:** `setChats`, `addChat`, `updateChat`, `setActiveChatId`, `setMessages`, `addMessage`, `prependMessages`

### errorStore
- `errors: AppError[]` (max 5, auto-dismiss)
- `networkStatus: 'online' | 'offline'`
- `addError`, `dismissError`, `clearErrors`

---

## gRPC клиент (grpcClient.ts)

### Методы Auth V2
- `signInV2(username, password, deviceInfo)` → AuthResponseV2
- `signUpV2(username, password, email, deviceInfo)` → AuthResponseV2
- `refreshToken(refreshToken)` → RefreshTokenResponse
- `signOut(refreshToken, allDevices)` → void
- `revokeDevice(deviceId)` → void

### Методы Chat
- `getChats(userId, username)` → Chat[]
- `getHistory(chatId, limit)` → { messages: Message[], hasMore: boolean }
- `sendMessage(chatId, content)` → Message
- `createDirectChat(participantId)` → Chat
- `streamChatMessages(chatId, callback)` → cleanup function

### Error handling
- `classifyError(error)` → 'network' | 'auth' | 'rate_limit' | 'server' | 'unknown'
- `withRetry(fn, options)` — retry с exponential backoff
- Auth errors НЕ ретраятся
- Network errors: 3 попытки, baseDelay 500ms

---

## i18n

### Использование
```typescript
import { t, setLang, getLang } from '@/shared/types'

t('loginTitle')      // "Вход" (RU) / "Sign In" (EN)
t('signIn')          // "Войти" (RU) / "Sign In" (EN)
setLang('en')        // Переключить язык
```

### Переведённые ключи
appName, loginTitle, signupTitle, usernamePlaceholder, passwordPlaceholder, emailPlaceholder, signIn, signUp, hasAccount, noAccount, connectionError, authError, loading, selectChat, writeMessage, signOut, online, offline, retry

### Переключатель
- Кнопка EN/RU в AuthScreen (правый верхний угол)
- Автоопределение по navigator.language

---

## Desktop vs Mobile

### Desktop (≥ 768px)
- Двухпанельный layout: Sidebar (320px) + main area
- ChatListScreen рендерится напрямую (без screen-based навигации)
- Sidebar: список чатов с hover/active состояниями
- Main area: ChatScreen с сообщениями

### Mobile (< 768px)
- Screen-based навигация (ChatListScreen → ChatScreen)
- iOS оптимизации: SafeArea, bounce prevention, keyboard handling
- PWA: standalone display, Web Push

---

## Конфигурация

| Компонент | Адрес | Статус |
|-----------|-------|--------|
| Dev сервер gRPC | `127.0.0.1:50052` | ✅ Работает |
| Prod сервер gRPC | `127.0.0.1:50051` | ⬜ Старая версия |
| gRPC-web proxy | `0.0.0.0:9090` | ✅ Работает → dev |
| Веб-клиент SPA | `/web` (Nginx) | ✅ Работает |
| gRPC-web endpoint | `/messenger` (Nginx → 9090) | ✅ Работает |

### Переменные окружения
- `VITE_API_URL` — URL gRPC-web proxy (по умолчанию `/messenger`)

---

## Команды

```bash
# Dev server
npm run dev

# Production build (+ chmod fix для manifest.json)
npm run build

# TypeScript check
npx tsc --noEmit

# Генерация кода из proto
npx buf generate

# gRPC-web proxy
node grpc-web-proxy.cjs

# Перезапуск proxy (systemd)
sudo systemctl restart grpc-web-proxy
```

---

## Документация сервера

Полная документация: `/root/msg/doc/`
- `AUTHSERVICE_V2.md` — AuthService V2: JWT + device management
- `INTEGRATION_SESSION.md` — Текущий статус, версии, архитектура
- `TASKS.md` — Таск-трекер сервера и Android
- `INDEX.md` — Полный индекс документации

---

## Связанные проекты

| Проект | Путь | Версия |
|--------|------|--------|
| Dev сервер | `/root/msg/` | v1.1.4.0 |
| Prod сервер | `/root/LavenderMessenger/run/` | v1.1.3.10 |
| Android | `/root/msg.client.android/` | v1.1.3.10 |
| iOS | `/root/msg.client.ios/` | — |
| **Web Client** | **/root/msg.client.web/** | **v0.4.0** |

---

## Фазы разработки

### ✅ Завершённые
- Фаза 0: Инициализация проекта
- Фаза 1: gRPC клиент
- Фаза 2: State Management
- Фаза 3: Хуки
- Фаза 4: UI компоненты
- Фаза 5: iOS оптимизации
- Фаза 6: Protobuf + gRPC-web
- Фаза 7: Интеграция с реальным сервером (Auth V2)
- Фаза 7.5: Desktop UI
- Фаза 7.5b: Локализация (i18n)
- **Фаза 8:** Список чатов и сообщения (реальные данные, BiDi stream, i18n)

### 📋 Следующие
- **Фаза 9:** Контакты и профиль (ProfileService V2, экран профиля, настройки)
- **Фаза 10:** AI чаты (OWL + Hermes)
- **Фаза 11:** Настройки и темы
- **Фаза 12:** E2EE (секретные чаты)
- **Фаза 13:** Полировка (pull-to-refresh, поиск, реакции, файлы, голосовые, offline, a11y)

---

## Важные заметки

### Подключение к dev серверу
- Proxy настроен на dev сервер (порт 50052)
- Prod сервер (50051) имеет старую версию — НЕ подключаться
- systemd сервис: `grpc-web-proxy`

### Auth V2
- Сервер требует `deviceInfo` при signIn/signUp
- Access token TTL: 15 минут
- Refresh token TTL: 30 дней
- При истечении refresh token — автоматический logout

### Proto
- `proto/messenger.proto` — копируется с сервера (`/root/msg/messenger.proto`)
- Генерация: `npx buf generate`
- Сгенерированный код: `src/shared/api/gen/proto/`

### Сборка
- `npm run build` — production build + postbuild chmod fix
- `npx tsc --noEmit` — проверка типов
- Vite dev server: `npm run dev` (порт 3000)

### Nginx
- `/web` → `/root/msg.client.web/dist/` (SPA)
- `/messenger` → `127.0.0.1:9090` (gRPC-web proxy)
- Конфиг: `/etc/nginx/sites-enabled/lavender`

---

## Известные проблемы

### Серверные (не блокирующие)
- Prod DB: `ON CONFLICT requires unique constraint` на device registration — миграция не применена
- Dev сервер: работает стабильно

### Клиентские
- Нет интеграции с реальными данными чатов (фаза 8)
- Нет AI чатов (фаза 9)
- Нет контактов/профиля (фаза 10)
