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
| Landing page | `http://13.140.25.249/` | — |
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
│   ├── calls/                 # WebRTC call screen
│   ├── secretChats/           # E2EE secret chat screen
│   └── common/                # Screen layout wrapper, LazyAvatar
├── hooks/                     # Custom hooks (useChats, useChatMessages, etc.)
│   ├── useWebRTC.ts           # WebRTC peer connection
│   └── useGrpcStream.ts       # ChatV2 stream management
├── store/                     # Zustand stores (auth, chat, error)
├── shared/
│   ├── types/                 # TypeScript interfaces + i18n
│   ├── crypto.ts              # RSA-OAEP + AES-GCM E2EE
│   └── api/
│       ├── grpcClient.ts      # Singleton gRPC-web client (40+ methods)
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

## Статус интеграции (с сервером v1.3.0.25)

**Web клиент:** v0.1.5.1 | **Дата проверки:** 2026-06-27

### ✅ Реализовано

| Модуль | Готово | Версия | Детали |
|--------|--------|--------|--------|
| **Auth** | | | |
| Auth V2 (JWT) | ✅ | v0.1.0.0 | signInV2, signUpV2, refresh, signOut |
| Auth Interceptor | ✅ | v0.1.3.0 | isRefreshing, refreshFailedAt cooldown, stale token |
| RevokeDevice | ✅ | v0.1.0.0 | revokeDevice |
| Password Reset | ✅ | v0.1.3.9 | requestPasswordReset, resetPassword |
| Capability Negotiation | ✅ | v0.1.1.0 | GET /info |
| Health Check | ✅ | v0.1.0.0 | GET /health |
| **Chat** | | | |
| Chat Stream v1 | ✅ | v0.5.0 | BiDi stream, send/receive |
| ChatV2 Stream | ✅ | v0.1.2.0 | BiDi stream, typing, system events |
| Chat List (GetChatsV2) | ✅ | v0.1.1.2 | cursor-based pagination, filter |
| CreateDirectChat | ✅ | v0.1.0.0 | user1_id, user2_id |
| CreateGroupChat | ✅ | v0.1.0.0 | name, participant_ids |
| DeleteChat | ✅ | v0.1.0.0 | chat_id, requester_user_id |
| AddParticipant / RemoveParticipant | ✅ | v0.1.1.1 | chat_id, username, user_id |
| Pin/Unpin Chat | ✅ | v0.1.1.1 | userId required |
| Archive/Unarchive Chat | ✅ | v0.1.1.1 | userId required |
| Muted Chats | ✅ | v0.1.0.0 | getMutedChats, setMutedChat |
| Search Chats | ✅ | v0.1.0.0 | searchChats |
| ChatList Version | ✅ | v0.1.0.0 | getChatListVersion |
| **Messages v1** | ❌ | removed | Удалено в v0.1.5.0 (сервер убрал dual-write) |
| **Messages v2** | | | |
| GetHistoryV2 | ✅ | v0.1.5.0 | cursor-based pagination, v2 only (v1 fallback removed) |
| SendMessageV2 | ✅ | v0.1.5.0 | oneof content (text/media), unary RPC |
| EditMessageV2 | ✅ | v0.1.5.0 | messageId, text |
| DeleteMessageV2 | ✅ | v0.1.5.0 | message_ids[], requester_user_id, soft delete |
| SetReactionV2 | ✅ | v0.1.5.0 | message_id, emoji, inline JSONB |
| SearchMessages | ✅ | v0.1.5.0 | single-chat or cross-chat search |
| ChatV2 Stream | ✅ | v0.1.5.0 | BiDi stream, typing, system events (v1 stream removed) |
| **Pin Messages** | | | |
| PinMessage / UnPinMessage | ✅ | v0.1.1.1 | userId required |
| GetPinnedMessages | ✅ | v0.1.0.0 | chat_id |
| **Read Receipts** | | | |
| Automatic MarkRead | ✅ | v0.1.4.2 | on chat open + unreadCount reset |
| **Profile** | | | |
| GetProfile (ProfileService v2 + ChatService fallback) | ✅ | v0.1.4.3 | tries v2, fallback on UNIMPLEMENTED |
| UpdateProfile (ProfileService v2 + ChatService fallback) | ✅ | v0.1.4.3 | tries v2, fallback on UNIMPLEMENTED |
| UpdateAvatar (ProfileService v2 + ChatService fallback) | ✅ | v0.1.4.3 | tries v2, fallback on UNIMPLEMENTED |
| DeleteProfile (ProfileService v2 + ChatService fallback) | ✅ | v0.1.4.3 | tries v2, fallback on UNIMPLEMENTED |
| GetUserSettings / UpdateUserSettings | ✅ | v0.1.4.3 | graceful degradation (defaults on failure) |
| **Users** | | | |
| GetAllUsers | ✅ | v0.1.0.0 | UserInfo: username, avatar, userId, isSuperAdmin |
| GetUserProfile | ✅ | v0.1.0.0 | username → profile |
| GetUserId | ✅ | v0.1.0.0 | username → UUID |
| **Contacts** | | | |
| GetContacts | ✅ | v0.1.1.0 | string[] (usernames) |
| AddContact / RemoveContact | ✅ | v0.1.1.0 | contactUsername, username |
| **Favorites** | | | |
| AddFavorite / RemoveFavorite / GetFavorites | ✅ | v0.1.3.6 | self-chat chatScreen wrapper |
| Favorites sync | ✅ | v0.1.3.6 | sendMessageV2 |
| **Drafts** | | | |
| SaveDraft / GetDraft / DeleteDraft | ✅ | v0.1.3.3 | server-side drafts |
| **Themes** | | | |
| GetThemes / SaveTheme / SetCurrentTheme / DeleteTheme | ✅ | v0.1.0.0 | custom themes |
| **Typing** | | | |
| Typing Indicators | ✅ | v0.1.3.1 | via ChatV2 stream (BiDi v1 not supported) |
| **Read Receipts** | | | |
| Automatic MarkRead | ✅ | v0.1.4.2 | on chat open + unreadCount reset |
| **HTTP Uploads** | | | |
| Upload Avatar/Image/File/Audio/Background | ✅ | v0.1.3.2 | JWT auth, multipart/form-data |
| Send Media Messages | ✅ | v0.1.3.2 | sendMessageV2Media (image/file/voice) |
| **Notifications** | | | |
| SubscribeNotifications | ✅ | v0.1.0.0 | Server Streaming |
| Notification History / MarkRead / UnreadCount | ✅ | v0.1.0.0 | |
| Native Browser Notifications | ✅ | v0.1.4.0 | Notification API |
| **Push (FCM)** | | | |
| RegisterPushToken | ✅ | v0.1.0.0 | user, token, pushEnabled, userId |
| GetDevices / DeleteOtherDevices | ✅ | v0.1.0.0 | |
| **AI v2** | | | |
| ChatWithAIV2 (Streaming) | ✅ | v0.1.0.0 | token, toolCalls, agentId, imageUrl |
| AI Agents CRUD | ✅ | v0.1.0.0 | create, update, delete, get, list, clone |
| AI Marketplace | ✅ | v0.1.0.0 | listMarketplaceAgents, rate, reviews, stats, share, install |
| AI Chat Settings | ✅ | v0.1.3.4 | getAIChatSettings, updateAIChatSettings |
| AI Usage Stats | ✅ | v0.1.0.0 | getAIUsageStats |
| AI Tools List | ✅ | v0.1.0.0 | listAITools |
| ListAIV2Chats | ✅ | v0.1.4.1 | list AI chat sessions |
| GetAIV2ChatHistory | ✅ | v0.1.4.1 | chat history with agent metadata |
| **Secret Chats (E2EE)** | | | |
| Crypto Module | ✅ | v0.1.4.0 | RSA-OAEP 2048 + AES-GCM 256 |
| CreateSecretChat | ✅ | v0.1.4.0 | key exchange UI |
| ExchangeSecretKey / GetSecretChatKey | ✅ | v0.1.4.0 | |
| **WebRTC Calls** | | | |
| useWebRTC Hook | ✅ | v0.1.4.0 | STUN servers, peer connection |
| CallScreen UI | ✅ | v0.1.4.0 | full-screen video/audio controls |
| Signaling via CallSession | ✅ | v0.1.4.0 | BiDi stream |
| TURN Credentials (lazy load) | ✅ | v0.1.4.3 | fetch on call start, not on mount (fixes 401) |
| **Bot Commands** | | | |
| ProcessBotCommand / GetBotCommands | ✅ | v0.1.0.0 | |
| **Resilience** | | | |
| Graceful Shutdown | ✅ | v0.1.1.0 | SERVER_SHUTTINGDOWN handling |
| Offline Mode | ✅ | v0.1.1.0 | indicators + cached data |
| Auto Reconnect | ✅ | v0.1.1.0 | exponential backoff (max 30s) |
| Auto Update | ✅ | v0.1.3.8 | version.json + UpdateBanner + cache clear |
| **UI** | | | |
| Desktop Sidebar Nav | ✅ | v0.1.4.0 | AI Chats, Search, Archive, Notifications, Settings |
| Lazy Avatar | ✅ | v0.1.4.0 | IntersectionObserver-based |
| Desktop Right Panel | ✅ | v0.1.3.10 | profile, contacts, favorites in right panel |
| Password Reset UI | ✅ | v0.1.3.9 | 3-step flow: email → code + password → success |
| Image Lightbox | ✅ | v0.1.4.4 | fullscreen image preview overlay |
| Pinned Messages Screen | ✅ | v0.1.4.4 | desktop overlay + mobile full-screen |
| Voice Recording | ✅ | v0.1.4.4 | MediaRecorder API, send as voice message |
| Real-time Messages | ✅ | v0.1.4.4 | ChatV2 stream auth deadlock fix + server broadcast |
| Copy Text | ✅ | v0.1.5.0 | context menu copy + text selection on bubbles |
| Version Display | ✅ | v0.1.5.0 | app version on select chat screen |
| Message Search UI | ✅ | v0.1.5.1 | search icon in chat header, results with click-to-navigate |
| Contact Profile Modal | ✅ | v0.1.5.1 | click avatar/name in header opens profile modal |

### ⚠️ Частично реализовано / Known Issues

| Проблема | Описание | Решение |
|----------|----------|---------|
| Proto codegen | npm run proto:generate падает | `buf generate --path proto/messenger.proto` |

### ❌ Не реализовано / Нет UI

| Модуль | RPC | Приоритет | Описание |
|--------|-----|-----------|----------|
| E2EE Secret Chat UI | полный UI поток | P2 | Crypto модуль есть, нужен完整的UI |
| Chat Background | uploadBackground | P3 | пользовательский фон чата |
| File Download Progress | — | P3 | прогресс-бар при скачивании файлов |
| Multi-Agent AI Chat | client-side routing | P3 | параллельные ChatWithAIV2 запросы |

## Следующие шаги (для следующей сессии)

### Приоритет 1 — Фичи
- **E2EE полный UI**: SecretChatScreen с полным потоком шифрования/дешифрования

### Приоритет 2 — Фичи
- **E2EE полный UI**: SecretChatScreen с полным потоком шифрования/дешифрования
- **Chat Background**: пользовательский фон чата

### Приоритет 3 — Технический долг
- **ChatV2 полный переход**: когда messages_v2 заполнена, убрать v1 fallback
