# Lavender Messenger Web Client

Веб-клиент мессенджера Lavender. React 18 + TypeScript + Vite + gRPC-web.

## Быстрый старт

```bash
npm install
npm run dev          # dev server на :3000
npm run build        # production build в dist/
npm run proto:generate  # regen proto из proto/messenger.proto
./deploy.sh          # build + deploy на сервер
```

## Сервер

| | Prod | Dev |
|---|---|---|
| gRPC | `13.140.25.249:50051` | `13.140.25.249:50052` |
| HTTP | `13.140.25.249:8082` | `13.140.25.249:8083` |
| Web client | `http://13.140.25.249/web/` | — |
| DB (prod) | `chat_db` (paveld) | `chat_db_dev` (lavender) |

## Структура проекта

```
src/
├── App.tsx                    # Root: auth gate, routing, resilience banners
├── main.tsx                   # React mount
├── components/
│   ├── auth/                  # Login/signup (mobile + desktop)
│   ├── chatList/              # Chat list (mobile + desktop)
│   ├── chat/                  # Chat screen (mobile + desktop)
│   ├── aiChats/               # AI v2 chat (mobile + desktop)
│   ├── contacts/              # Contacts + user directory
│   ├── profile/               # Profile modal
│   ├── settings/              # Settings screen
│   ├── search/                # Chat search
│   ├── notifications/         # Notification history
│   ├── pinned/                # Pinned messages
│   ├── archive/               # Archived chats
│   ├── favorites/             # Favorites self-chat
│   └── common/                # Screen layout wrapper
├── hooks/                     # Custom hooks (useChats, useChatMessages, etc.)
├── store/                     # Zustand stores (auth, chat, error)
├── shared/
│   ├── types/                 # TypeScript interfaces + i18n
│   └── api/
│       ├── grpcClient.ts      # Singleton gRPC-web client (30+ methods)
│       └── gen/proto/         # Auto-generated from proto
├── styles/global.css          # CSS reset, iOS optimizations, animations
└── gen/                       # Legacy proto stubs (unused)
```

## Документация

| Файл | Описание |
|------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Архитектура, стек, паттерны, инфраструктура |
| [API.md](API.md) | Все gRPC методы клиента |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Деплой, сервер, proto генерация |
| [GOTCHAS.md](GOTCHAS.md) | Known issues, proto gotchas, fixes, UI patterns |
| [CHANGELOG.md](CHANGELOG.md) | История версий |

## Статус интеграции (с сервером v1.3.0.18)

### ✅ Реализовано

| Модуль | Готово | Версия | Детали |
|--------|--------|--------|--------|
| Auth V2 (JWT) | ✅ | v1.0.0 | signInV2, signUpV2, refresh, signOut |
| Auth Interceptor | ✅ | v1.3.0 | isRefreshing, refreshFailedAt cooldown, stale token |
| Chat Stream v1 | ✅ | v0.5.0 | BiDi stream, send/receive |
| ChatV2 Stream | ✅ | v1.2.0 | BiDi stream, typing, system events |
| Chat List (GetChatsV2) | ✅ | v1.1.2 | cursor-based pagination, filter |
| Messages V1 | ✅ | v0.5.0 | getHistory, sendMessage, edit, delete, reactions |
| Messages V2 | ✅ | v1.2.0 | getHistoryV2, sendMessageV2, editV2, deleteV2, reactionV2 |
| Pin/Unpin Chat | ✅ | v1.1.1 | userId required |
| Archive/Unarchive Chat | ✅ | v1.1.1 | userId required |
| Muted Chats | ✅ | v1.0.0 | getMutedChats, setMutedChat |
| Search Chats | ✅ | v1.0.0 | searchChats |
| Pin/Unpin Messages | ✅ | v1.1.1 | userId required |
| Profile (ProfileService v2) | ✅ | v1.0.0 | getProfile, updateProfile, updateAvatar |
| User Settings | ✅ | v1.0.0 | getUserSettings, updateUserSettings |
| Delete Profile | ✅ | v1.1.0 | requires password |
| All Users | ✅ | v1.0.0 | getAllUsers, getUserId |
| User Profile | ✅ | v1.0.0 | getUserProfile |
| Contacts | ✅ | v1.1.0 | getContacts (string[]), addContact, removeContact |
| Typing Indicators | ✅ | v1.3.1 | sendTyping (v1 stream), ChatV2 typing, openTypingStream |
| HTTP Uploads | ✅ | v1.3.2 | uploadImage, uploadFile_, uploadAudio, uploadAvatar, uploadBackground |
| Send Media Messages | ✅ | v1.3.2 | sendMessageV2Media (image/file/voice) |
| Drafts (Server) | ✅ | v1.3.3 | saveDraft, getDraft, deleteDraft |
| Favorites | ✅ | v1.3.6 | ChatScreen wrapper, полный функционал чата |
| Favorites sync | ✅ | v1.3.6 | FavoritesScreen = ChatScreen, sendMessageV2 |
| Auto Update | ✅ | v1.3.8 | version.json + UpdateBanner + cache clear |
| Auth Screen Version | ✅ | v1.3.9 | Версия под названием приложения |
| Themes | ✅ | v1.0.0 | getThemes, saveTheme, setCurrentTheme, deleteTheme |
| AI Chat V2 | ✅ | v1.0.0 | chatWithAIV2 (streaming), images, tool calls |
| AI Agents CRUD | ✅ | v1.0.0 | create, update, delete, get, list, clone |
| AI Marketplace | ✅ | v1.0.0 | listMarketplaceAgents, rate, reviews, stats, share, install |
| AI Chat Settings | ✅ | v1.3.4 | getAIChatSettings, updateAIChatSettings |
| AI Usage Stats | ✅ | v1.0.0 | getAIUsageStats |
| AI Tools List | ✅ | v1.0.0 | listAITools |
| Bot Commands | ✅ | v1.0.0 | processBotCommand, getBotCommands |
| Notifications | ✅ | v1.0.0 | subscribeNotifications, history, markRead, unreadCount |
| Push (FCM) | ✅ | v1.0.0 | registerPushToken, getDevices, deleteOtherDevices |
| Graceful Shutdown | ✅ | v1.1.0 | SERVER_SHUTTINGDOWN handling |
| Offline Mode | ✅ | v1.1.0 | indicators + cached data |
| Capability Negotiation | ✅ | v1.1.0 | GET /info |
| Health Check | ✅ | v1.0.0 | GET /health |
| Free Models List | ✅ | v1.0.0 | getFreeModels |

### ❌ Не реализовано (нет UI)

| Модуль | RPC | Приоритет | Описание |
|--------|-----|-----------|----------|
| E2EE Secret Chats | createSecretChat / exchangeSecretKey / getSecretChatKey | P3 | Требует RSA key gen + шифрование — сложная фича |
| WebRTC Calls | callSession (BiDi stream) + TURN credentials | P3 | Требует TURN endpoint на сервере |

### ⚠️ Известные проблемы

| Проблема | Описание | Решение |
|----------|----------|---------|
| ChatV2 stream full transition | Сейчас dual-write v1+v2 | Полный переход когда messages_v2 заполнена |
| getHistoryV2 merge | v1+v2 мерж при загрузке | Временно — нужен для чтения старых сообщений |

## Следующие шаги (для новой сессии)

### Приоритет 1 — Важное
- **ChatV2 stream**: полный переход на ChatV2 stream когда `messages_v2` таблица будет заполнена (сервер dual-write)

### Приоритет 2 — Сложные фичи
- **E2EE Secret Chats**: RSA key generation (Web Crypto API) + key storage + message encryption/decryption
- **WebRTC Calls**: TURN credentials endpoint + WebRTC UI

### Приоритет 3 — Улучшения
- **getUserAvatar lazy loading**: использовать getUserAvatar для ленивой загрузки аватаров
- **Desktop sidebar**: добавить AI чаты и настройки в сайдбар
