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
| [ARCHITECTURE.md](ARCHITECTURE.md) | Архитектура, стек, паттерны |
| [API.md](API.md) | Все gRPC методы клиента |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Деплой на сервер |
| [CHANGELOG.md](CHANGELOG.md) | История версий |

## Следующие шаги (для новой сессии)

### Приоритет 1 — Важное
- **Favorites sync**: favorites хранятся в `favorites_<username>` room, но `addFavorite`/`removeFavorite` RPC работают через таблицу `favorites` — нужно унифицировать (серверная сторона)
- **ChatV2 stream**: сейчас используется v1 Chat stream. Полный переход на ChatV2 stream нужен когда `messages_v2` таблица будет заполнена (сервер dual-write)

### Приоритет 2 — UI интеграция бэкенд-методов
- **Typing indicators**: метод `sendTyping` есть, нет UI триггера в ChatScreen
- **HTTP uploads**: методы загрузки аватара/изображений/файлов/аудио есть, нет UI интеграции (кроме аватара в профиле)
- **Drafts**: localStorage-based, серверные `SaveDraft`/`GetDraft`/`DeleteDraft` не используются
- **AI Chat Settings**: `GetAIChatSettings`/`UpdateAIChatSettings` — нет UI

### Приоритет 3 — Новые фичи
- **E2EE Secret Chats**: `createSecretChat`/`exchangeSecretKey`/`getSecretChatKey` — методы есть, нет UI
- **WebRTC calls**: `callSession` BiDi stream — нет UI, нужен TURN credentials (HTTP endpoint)
- **Password Reset**: `RequestPasswordReset`/`ResetPassword` — нет UI
- **getUserAvatar RPC**: метод есть, нет UI

### Приоритет 4 — Технический долг
- **Proto codegen**: `npm run proto:generate` падает из-за node_modules → использовать `npx buf generate --path proto/messenger.proto`
- **getHistoryV2 fallback**: сейчас fallback на v1 если messages_v2 пуста — убрать когда все сообщения будут в messages_v2
- **Auth interceptor**: `refreshFailedAt` cooldown 30s — возможно стоит делать logout при permanent fail
- **Desktop routing**: chatList-only, нет sidebar навигации в профиль/контакты/настройки
