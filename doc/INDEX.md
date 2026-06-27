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

## Статус интеграции (с сервером v1.3.0.23)

**Web клиент:** v1.4.3 | **Дата проверки:** 2026-06-27

### ✅ Реализовано

| Модуль | Готово | Версия | Детали |
|--------|--------|--------|--------|
| **Auth** | | | |
| Auth V2 (JWT) | ✅ | v1.0.0 | signInV2, signUpV2, refresh, signOut |
| Auth Interceptor | ✅ | v1.3.0 | isRefreshing, refreshFailedAt cooldown, stale token |
| RevokeDevice | ✅ | v1.0.0 | revokeDevice |
| Password Reset | ✅ | v1.3.9 | requestPasswordReset, resetPassword |
| Capability Negotiation | ✅ | v1.1.0 | GET /info |
| Health Check | ✅ | v1.0.0 | GET /health |
| **Chat** | | | |
| Chat Stream v1 | ✅ | v0.5.0 | BiDi stream, send/receive |
| ChatV2 Stream | ✅ | v1.2.0 | BiDi stream, typing, system events |
| Chat List (GetChatsV2) | ✅ | v1.1.2 | cursor-based pagination, filter |
| CreateDirectChat | ✅ | v1.0.0 | user1_id, user2_id |
| CreateGroupChat | ✅ | v1.0.0 | name, participant_ids |
| DeleteChat | ✅ | v1.0.0 | chat_id, requester_user_id |
| AddParticipant / RemoveParticipant | ✅ | v1.1.1 | chat_id, username, user_id |
| Pin/Unpin Chat | ✅ | v1.1.1 | userId required |
| Archive/Unarchive Chat | ✅ | v1.1.1 | userId required |
| Muted Chats | ✅ | v1.0.0 | getMutedChats, setMutedChat |
| Search Chats | ✅ | v1.0.0 | searchChats |
| ChatList Version | ✅ | v1.0.0 | getChatListVersion |
| **Messages v1** | | | |
| GetHistory | ✅ | v0.5.0 | limit + room |
| SendMessage | ✅ | v0.5.0 | ephemeral BiDi stream |
| EditMessage | ✅ | v1.0.0 | messageId, text |
| DeleteMessages | ✅ | v1.0.0 | messages[], requesterUsername |
| SetReaction | ✅ | v1.0.0 | nested { message_id, reaction: { user, emoji } } |
| **Messages v2** | | | |
| GetHistoryV2 | ✅ | v1.2.0 | cursor-based pagination |
| SendMessageV2 | ✅ | v1.2.0 | oneof content (text/media), unary RPC |
| EditMessageV2 | ✅ | v1.2.0 | messageId, text |
| DeleteMessageV2 | ✅ | v1.2.0 | message_ids[], requester_user_id |
| SetReactionV2 | ✅ | v1.2.0 | message_id, emoji |
| **Pin Messages** | | | |
| PinMessage / UnPinMessage | ✅ | v1.1.1 | userId required |
| GetPinnedMessages | ✅ | v1.0.0 | chat_id |
| **Read Receipts** | | | |
| Automatic MarkRead | ✅ | v1.4.2 | on chat open + unreadCount reset |
| **Profile** | | | |
| GetProfile (ProfileService v2 + ChatService fallback) | ✅ | v1.4.3 | tries v2, fallback on UNIMPLEMENTED |
| UpdateProfile (ProfileService v2 + ChatService fallback) | ✅ | v1.4.3 | tries v2, fallback on UNIMPLEMENTED |
| UpdateAvatar (ProfileService v2 + ChatService fallback) | ✅ | v1.4.3 | tries v2, fallback on UNIMPLEMENTED |
| DeleteProfile (ProfileService v2 + ChatService fallback) | ✅ | v1.4.3 | tries v2, fallback on UNIMPLEMENTED |
| GetUserSettings / UpdateUserSettings | ✅ | v1.4.3 | graceful degradation (defaults on failure) |
| **Users** | | | |
| GetAllUsers | ✅ | v1.0.0 | UserInfo: username, avatar, userId, isSuperAdmin |
| GetUserProfile | ✅ | v1.0.0 | username → profile |
| GetUserId | ✅ | v1.0.0 | username → UUID |
| **Contacts** | | | |
| GetContacts | ✅ | v1.1.0 | string[] (usernames) |
| AddContact / RemoveContact | ✅ | v1.1.0 | contactUsername, username |
| **Favorites** | | | |
| AddFavorite / RemoveFavorite / GetFavorites | ✅ | v1.3.6 | self-chat chatScreen wrapper |
| Favorites sync | ✅ | v1.3.6 | sendMessageV2 |
| **Drafts** | | | |
| SaveDraft / GetDraft / DeleteDraft | ✅ | v1.3.3 | server-side drafts |
| **Themes** | | | |
| GetThemes / SaveTheme / SetCurrentTheme / DeleteTheme | ✅ | v1.0.0 | custom themes |
| **Typing** | | | |
| Typing Indicators | ✅ | v1.3.1 | via ChatV2 stream (BiDi v1 not supported) |
| **Read Receipts** | | | |
| Automatic MarkRead | ✅ | v1.4.2 | on chat open + unreadCount reset |
| **HTTP Uploads** | | | |
| Upload Avatar/Image/File/Audio/Background | ✅ | v1.3.2 | JWT auth, multipart/form-data |
| Send Media Messages | ✅ | v1.3.2 | sendMessageV2Media (image/file/voice) |
| **Notifications** | | | |
| SubscribeNotifications | ✅ | v1.0.0 | Server Streaming |
| Notification History / MarkRead / UnreadCount | ✅ | v1.0.0 | |
| Native Browser Notifications | ✅ | v1.4.0 | Notification API |
| **Push (FCM)** | | | |
| RegisterPushToken | ✅ | v1.0.0 | user, token, pushEnabled, userId |
| GetDevices / DeleteOtherDevices | ✅ | v1.0.0 | |
| **AI v2** | | | |
| ChatWithAIV2 (Streaming) | ✅ | v1.0.0 | token, toolCalls, agentId, imageUrl |
| AI Agents CRUD | ✅ | v1.0.0 | create, update, delete, get, list, clone |
| AI Marketplace | ✅ | v1.0.0 | listMarketplaceAgents, rate, reviews, stats, share, install |
| AI Chat Settings | ✅ | v1.3.4 | getAIChatSettings, updateAIChatSettings |
| AI Usage Stats | ✅ | v1.0.0 | getAIUsageStats |
| AI Tools List | ✅ | v1.0.0 | listAITools |
| ListAIV2Chats | ✅ | v1.4.1 | list AI chat sessions |
| GetAIV2ChatHistory | ✅ | v1.4.1 | chat history with agent metadata |
| **Secret Chats (E2EE)** | | | |
| Crypto Module | ✅ | v1.4.0 | RSA-OAEP 2048 + AES-GCM 256 |
| CreateSecretChat | ✅ | v1.4.0 | key exchange UI |
| ExchangeSecretKey / GetSecretChatKey | ✅ | v1.4.0 | |
| **WebRTC Calls** | | | |
| useWebRTC Hook | ✅ | v1.4.0 | STUN servers, peer connection |
| CallScreen UI | ✅ | v1.4.0 | full-screen video/audio controls |
| Signaling via CallSession | ✅ | v1.4.0 | BiDi stream |
| TURN Credentials (lazy load) | ✅ | v1.4.3 | fetch on call start, not on mount (fixes 401) |
| **Bot Commands** | | | |
| ProcessBotCommand / GetBotCommands | ✅ | v1.0.0 | |
| **Resilience** | | | |
| Graceful Shutdown | ✅ | v1.1.0 | SERVER_SHUTTINGDOWN handling |
| Offline Mode | ✅ | v1.1.0 | indicators + cached data |
| Auto Reconnect | ✅ | v1.1.0 | exponential backoff (max 30s) |
| Auto Update | ✅ | v1.3.8 | version.json + UpdateBanner + cache clear |
| **UI** | | | |
| Desktop Sidebar Nav | ✅ | v1.4.0 | AI Chats, Search, Archive, Notifications, Settings |
| Lazy Avatar | ✅ | v1.4.0 | IntersectionObserver-based |
| Desktop Right Panel | ✅ | v1.3.10 | profile, contacts, favorites in right panel |
| Password Reset UI | ✅ | v1.3.9 | 3-step flow: email → code + password → success |

### ⚠️ Частично реализовано / Known Issues

| Проблема | Описание | Решение |
|----------|----------|---------|
| ChatV2 stream full transition | dual-write v1+v2 на сервере | getHistoryV2 мержит v1+v2 сообщения |
| v1/v2 Message Merge | старые сообщения только в messages | getHistoryV2 с fallback на v1 |
| Proto codegen | npm run proto:generate падает | `buf generate --path proto/messenger.proto` |

### ❌ Не реализовано / Нет UI

| Модуль | RPC | Приоритет | Описание |
|--------|-----|-----------|----------|
| Message Search | searchMessages | P2 | поиск по сообщениям внутри чата |
| E2EE Secret Chat UI | полный UI поток | P2 | Crypto модуль есть, нужен完整的UI |
| Pinned Messages Screen | getPinnedMessages UI | P2 | экран закреплённых сообщений |
| Image Preview | lightbox | P3 | клик по изображению → полноэкранный просмотр |
| Chat Background | uploadBackground | P3 | пользовательский фон чата |
| Voice Messages Recording | MediaRecorder API | P3 | запись + отправка голосовых |
| File Download Progress | — | P3 | прогресс-бар при скачивании файлов |
| Multi-Agent AI Chat | client-side routing | P3 | параллельные ChatWithAIV2 запросы |
| ChatV2 полный переход | dual-write removal | P2 | когда messages_v2 заполнена |

## Следующие шаги (для следующей сессии)

### Приоритет 1 — Улучшения UX
- **Message Search UI**: поиск по сообщениям внутри чата (RPC `searchMessages` уже есть)
- **Image Lightbox**: полноэкранный просмотр изображений по клику
- **Pinned Messages Screen**: UI для просмотра закреплённых сообщений

### Приоритет 2 — Фичи
- **E2EE полный UI**: SecretChatScreen с полным потоком шифрования/дешифрования
- **Voice Recording**: MediaRecorder API для записи + отправки голосовых
- **Chat Background**: пользовательский фон чата

### Приоритет 3 — Технический долг
- **ChatV2 полный переход**: когда messages_v2 заполнена, убрать v1 fallback
- **Multi-Agent AI**: параллельные запросы к нескольким AI агентам
