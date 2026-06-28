# Changelog

## v0.1.9.0 (2026-06-28)

Fixes: reactions visible in chat, token refresh race condition, logout, logo reload.

### Reactions Fix

- **Server broadcast**: `BroadcastV2Reaction` sends `REACTION_V2` system messages to ChatV2 stream clients (previously only v1 WebSocket)
- **Client stream handler**: `handleChatV2Message` parses `REACTION_V2` from ChatV2 stream and emits `reaction_update` events
- **`setReactionV2` returns reactions**: method now returns `{ success, reactions }` instead of `boolean`
- **`toggleReaction` updates local state**: immediately updates message reactions from server response (optimistic update)
- **`StreamEvent` type**: added `reaction_update` event type

### Auth Fixes

- **Token refresh race condition**: concurrent requests now queue while refresh is in progress instead of failing with expired token
- **Logout always works**: `handleLogout` wraps `signOut` in try/catch, always calls `disconnect()` + `reload()`
- **Logo click = page reload**: clicking "Лава" logo does `window.location.reload()` — interceptor auto-refreshes token on next request

### Infrastructure

- **Service Worker**: cache bumped to `msg-v3` for force update
- **Package version**: `0.1.9.0` (was `0.1.7.0`)

## v0.1.8.0 (2026-06-28)

Initial reactions fix attempt (incomplete — server broadcast was missing).

## v0.1.7.0 (2026-06-28)

Multi-Agent AI Chat — parallel streaming to multiple agents.

### Multi-Agent AI Chat

- **Multi-select mode**: toggle button in agent panel to enable multi-select
- **Agent checkboxes**: visual checkboxes on each agent when in multi-select mode
- **Parallel streaming**: sends message to all selected agents simultaneously
- **Tabbed responses**: tab bar above messages showing each agent's response
- **Active tab indicator**: tab highlights with agent emoji, name, and status (⏳ streaming / ✓ done)
- **Stop all**: stop button cancels all parallel streams
- **Desktop**: multi-select in right agent panel, tabbed messages area
- **Mobile**: multi-select in agents view, "→ Чат" button to return to chat, tabbed messages
- **No new proto**: reuses existing `ChatWithAIV2` RPC — each agent gets its own session

## v0.1.6.1 (2026-06-27)

Delete for all messages, nginx proxy fix.

### Delete for All Messages

- **Context menu**: "🗑 Удалить" now visible for all messages (not just own)
- Edit remains owner-only
- Works for images, files, voice, text — any message type

### Nginx Proxy Fix (Critical)

- **proxy_pass trailing slash**: `proxy_pass http://127.0.0.1:8082;` → `proxy_pass http://127.0.0.1:8082/;`
- Without trailing slash, nginx forwarded `/api/upload-image` as-is, server only knows `/upload-image`
- Added to deploy.sh to persist across deploys

## v0.1.6.0 (2026-06-27)

Upload fix, image compression, [deleted] filter, full v1→v2 cleanup.

### Upload Fix (Critical)

- **404 on upload**: client called `/upload-image` directly, but nginx only proxies `/api/*` → port 8082
- **Fix**: all upload endpoints now use `/api/` prefix (`/api/upload-image`, `/api/upload-file`, etc.)
- **Affects**: image upload, file upload, voice upload, avatar upload, background upload

### Image Compression

- **compressImage**: all images compressed to JPEG before upload (max 1920px, quality 85%)
- Prevents large file uploads and reduces bandwidth

### [deleted] Message Filter

- **useChatMessages**: filters out messages with `text === '[deleted]'` (soft-deleted by server)
- Applied on initial load, pagination, and real-time stream

### Version Display Fix

- **public/version.json**: was stale at 0.1.4.4, now tracks actual version
- Update banner now works correctly

## v0.1.5.2 (2026-06-27)

Chat Background, File Download Progress.

### Chat Background

- **Menu option**: "🖼 Фон чата" in chat three-dot menu (desktop + mobile)
- **File picker**: select image → upload via `uploadBackground` → apply as chat background
- **Visual**: background image covers the message area

### File Download Progress

- **FileDownloadButton**: replaces plain `<a>` links for file messages
- **Progress tracking**: fetch with ReadableStream, tracks bytes received vs content-length
- **Progress bar**: purple bar at bottom of file bubble during download
- **Fallback**: on error, opens file in new tab

## v0.1.5.1 (2026-06-27)

Message Search UI, Contact Profile Modal.

### Message Search UI

- **Search icon**: 🔍 button in chat header (desktop + mobile)
- **Search panel**: opens overlay with search input + debounced results (300ms)
- **Results list**: shows message preview, sender name, timestamp
- **Click to navigate**: scrolls to the message in chat via Virtuoso

### Contact Profile Modal

- **Click avatar/name**: clicking the avatar or name in chat header opens a profile modal
- **ProfileModal**: shows username, avatar, bio, status
- **Direct chats only**: only works for 1-on-1 chats (not groups)

## v0.1.5.0 (2026-06-27)

v1→v2 Message Migration, SearchMessages, Copy Text, Version Display.

### v1→v2 Message Migration (Breaking)

Server removed v1 dual-write — all messages now only in `messages_v2`. Web client fully migrated:

- **Removed v1 RPCs**: `getHistory`, `sendMessage` (BiDi stream), `setReaction`, `deleteMessages`, `editMessage`, `openReceiveStream`
- **Removed v1 helpers**: `protoToMessage`, `handleChatMessage`
- **getHistoryV2**: removed v1 fallback merge — reads v2 only
- **getPinnedMessages/getFavorites**: now use `protoToMessageV2` instead of `protoToMessage`
- **useAIChats**: removed v1 `getHistory` fallback — uses `getAIV2ChatHistory` only
- **useChatMessages**: removed `usingV2Ref` dead code

### SearchMessages

- **Proto**: added `SearchMessages` RPC + `SearchMessagesRequest`/`SearchMessagesResponse`/`SearchResult` messages
- **grpcClient**: `searchMessages(roomId, query, limit)` — single-chat or cross-chat search

### Copy Text

- **Context menu**: "📋 Копировать" / "Copy" option in both desktop (right-click) and mobile (long press) chat menus
- **Text selection**: `user-select: text` on message bubbles — text is now selectable with mouse

### Version Display

- **Select chat screen**: app version displayed below the placeholder text
- **version.json**: updated to `0.1.5.0`

## v0.1.4.4 (2026-06-27)

Image Lightbox, Pinned Messages Screen, Voice Recording, ChatV2 stream fixes, version scheme v0.1.x.x.

### Image Lightbox

- **ImageLightbox component**: fullscreen image preview overlay with dark background
- **Desktop + Mobile**: clicking image in chat opens lightbox instead of new tab
- **Keyboard**: Escape key closes lightbox
- **Click outside**: clicking backdrop closes lightbox

### Pinned Messages Screen

- **Mobile**: full-screen pinned messages view with back navigation
- **Desktop**: right-side overlay panel (400px) within chat
- **Telegram dark theme**: consistent colors, user name, timestamp, image preview
- **Unpin**: button to unpin messages directly from the list
- **Integration**: ✓ menu → "Закреплённые" in both mobile and desktop ChatScreen

### Voice Recording

- **useVoiceRecorder hook**: MediaRecorder API with echo cancellation, noise suppression
- **Desktop + Mobile**: microphone button when input empty, tap to start recording
- **Recording UI**: timer display, cancel button, stop button
- **Auto-send**: recording stops → audio blob → sendMediaMessage as voice type
- **Cleanup**: stream tracks stopped on cancel/stop

### ChatV2 Stream Fixes (Critical)

- **Auth deadlock fix** (web client): auth JWT was sent only after receiving first server message, but server waits for auth before sending anything — deadlock. Fix: auth message pushed to input stream queue immediately after stream creation.
- **Server: SendMessageV2 ChatV2 broadcast**: SendMessageV2 now broadcasts the actual message via ChatV2 stream (was only broadcasting `NEW_MESSAGE_V2:<id>` via v1 stream). Ensures real-time delivery to all ChatV2-connected clients.
- **Android: v1 stream filter**: filter out `NEW_MESSAGE_V2:`/`EDIT_MESSAGE_V2:`/`DELETE_MESSAGE_V2:` system messages from v1 Chat stream — no longer shown as text.

### Version Scheme

- **v0.1.x.x**: changed from v1.x.x to reflect alpha status
- All previous versions updated in docs and package.json

## v0.1.4.3 (2026-06-27)

ProfileService fallback, TURN credentials lazy load, landing page version badge.

### ProfileService Fallback (Critical)

- **getProfile**: tries ProfileService v2 first, falls back to ChatService `getUserProfile`
- **updateProfile**: tries ProfileService v2, falls back to ChatService `updateProfile`
- **updateAvatar**: tries ProfileService v2, falls back to ChatService `updateAvatar`
- **deleteProfile**: tries ProfileService v2, falls back to ChatService `deleteProfile`
- **getUserSettings/updateUserSettings**: graceful degradation — returns defaults on failure
- **Root cause**: server v1.3.0.24 has profile "1.0" — ProfileService registered but methods return UNIMPLEMENTED

### WebRTC TURN Credentials

- **Lazy load**: TURN credentials now fetched only when a call starts (was: on mount)
- **Fixes 401 on load**: `/turn-credentials` requires JWT auth, but tokens weren't ready on mount

### Landing Page

- **"Войти" version badge**: web version badge added next to "Войти" button

## v0.1.4.2 (2026-06-27)

Fix empty messages, Read Receipts, landing page multilingual, doc overhaul.

### Empty Message Fix (Critical)

- **SendMessageV2 oneof serialization**: fixed `any`-typed request causing `text` field to be sent as unknown top-level field instead of properly setting the `content` oneof case
- **SendMessageV2Request.create → new SendMessageV2Request**: use typed constructor with `{ case: 'text', value: content }` oneof
- **SendMessageV2Media**: same fix — `{ case: 'media', value: { type, url, duration } }`
- **Empty message validation**: added `if (!content || !content.trim())` guard before sending
- **Root cause**: `@connectrpc/connect` with `protobuf-es v2` ignores flat `text` field when using `any` type — oneof `content` stays nil, server saves empty message

### Read Receipts v2

- **Automatic MarkRead**: when user opens a chat, `markRead` is called on the server
- **Unread count reset**: `unreadCount` set to 0 locally after MarkRead

### Landing Page (http://13.140.25.249/)

- **"Что нового" → "Войти"**: replaced button with web login link (`/web` target="_blank")
- **Download button**: changed from "Скачать последнюю версию" to "Скачать приложение Android" with version badge
- **Web client link**: opens in new tab (`target="_blank"`)
- **Full i18n**: all 10 languages translated (ru, en, zh, es, hi, ar, pt, de, ja, ko)
  - Added missing keys: `web_login`, `view_releases`, `name` for all languages
  - Fixed broken Japanese `clients` (クラ¤Аント → クライアント)
  - Fixed broken Hindi `clients` (कऽलाइंट → क्लाइंट)

### Documentation

- **INDEX.md**: complete rewrite — server v1.3.0.23 compliance, full integration status table
- **API.md**: added ListAIV2Chats, GetAIV2ChatHistory, TURN credentials, HTTP upload extensions
- **ARCHITECTURE.md**: added E2EE flow, WebRTC, new screens (SecretChat, Call)
- **GOTCHAS.md**: added SendMessageV2 oneof gotcha

## v0.1.4.1 (2026-06-22)

Typing stream fix, TURN credentials, E2EE encryption, call button.

### Typing Stream Fix

- **Removed v1 BiDi typing stream**: fetch API doesn't support streaming request bodies, causing `ConnectError` on `openTypingStream`
- **Typing via ChatV2 stream**: `openChatV2Stream` now returns `{ cleanup, send }` — typing events sent through the same stream
- **ChatList typing removed**: desktop and mobile chat lists no longer use global typing stream (typing works in active chat only)

### TURN Credentials

- **fetchICEServers**: client now fetches TURN credentials from `/turn-credentials` endpoint on startup
- **Fallback**: Google STUN servers used as fallback if server is unreachable

### E2EE Message Encryption

- **useChatMessages E2EE**: messages in secret chats encrypted with AES-GCM before send, decrypted on receive/load
- **isSecret prop**: ChatScreen accepts `isSecret` to enable encryption pipeline

### Call Button

- **Desktop header**: 📞 call button added to ChatScreen header (dispatches `start-call` custom event)
- **Mobile header**: 📞 call button added to ChatScreen mobile header

## v0.1.4.0 (2026-06-22)

E2EE Secret Chats, WebRTC Calls, Desktop Sidebar Navigation, Native Notifications.

### ChatV2 Migration

- **useGrpcStream v2**: switched from v1 `openReceiveStream` to v2 `openChatV2Stream`
- **useGrpcStream history**: switched from v1 `getHistory` to v2 `getHistoryV2` for missed messages

### Desktop Sidebar Navigation

- **Sidebar nav bar**: added AI Chats, Search, Archive, Notifications, Settings buttons below header
- **Right panel screens**: AI Chats, Settings, Archive, Notifications, Search now open in right panel
- **Lazy loading**: all sidebar screens use lazy imports for better bundle splitting

### E2EE Secret Chats

- **Crypto module** (`src/shared/crypto.ts`): RSA-OAEP 2048 + AES-GCM 256 encryption
- **SecretChatScreen**: key exchange UI with loading/error/ready states
- **New Chat modal**: 🔐 button next to each user to start secret chat
- **Key storage**: private keys and shared AES keys stored in localStorage

### WebRTC Calls

- **useWebRTC hook**: WebRTC peer connection management with STUN servers
- **CallScreen**: full-screen call UI with video/audio controls
- **Signaling**: uses existing `callSession` BiDi stream for WebRTC signaling
- **Call states**: idle → calling → ringing → connected → ended

### Native Notifications

- **Browser notifications**: native Notification API integration in useNotifications
- **Permission request**: button in NotificationsScreen to enable native notifications
- **Auto-show**: native notifications shown when new server notifications arrive
- **Preference**: native notification setting persisted in localStorage

### Lazy Avatar

- **LazyAvatar component**: IntersectionObserver-based lazy loading for chat avatars
- **Chat list avatars**: avatars now load lazily as they scroll into view
- **Fallback**: shows first letter while avatar loads

## v0.1.3.10 (2026-06-22)

Auth interceptor fix, v1/v2 merge, desktop UI, reactions.

### Auth Interceptor Fixes

- **Stale token on parallel requests**: interceptor теперь перечитывает свежий токен из стора после refresh, а не использует snapshot
- **Permanent fail handling**: `permanentFail` флаг блокирует все запросы после permanent failure refresh
- **Logout on permanent fail**: автоматический logout + reload при UNAUTHENTICATED/invalid_token/expired

### v1/v2 Message Merge

- **getHistoryV2 merge**: всегда загружает v1 сообщения при первой загрузке и мержит с v2 (убирает дубликаты по ID, сортирует по дате)
- **protoToMessageV2 v1 fallback**: читает `msg.text`/`msg.imageUrl`/etc если `content` oneof пуст
- **v1 reactions fix**: конвертирует `[{user, emoji}]` в `Record<string, string[]>` для совместимости с UI

### Desktop UI

- **Right panel**: профиль, контакты и избранное открываются в правой панели (как в Telegram Desktop)
- **New Chat button**: кнопка ➕ в хедере сайдбара, модалка с поиском пользователей
- **Contacts button**: кнопка 👥 в хедере сайдбара
- **Profile link**: "Изменить профиль" ссылка под именем пользователя

### Chat Scroll

- **Unread scroll**: при входе в чат скролл к первому непрочитанному (минус 3 сообщения для контекста)
- **Read scroll**: если все прочитано — скролл вниз к последнему сообщению

### Password Reset UI

- **Request flow**: email → код + новый пароль → успех
- **Desktop + Mobile**: оба экрана авторизации с forgot password
- **Translations**: RU/EN ключи для password reset

### Typing Stream

- **BiDi error handling**: обёрнут в try-catch, ошибки BiDi streaming больше не крашат приложение

### Other

- **getUserAvatar RPC**: метод для получения аватара пользователя
- **Proto codegen fix**: `npm run proto:generate` с `--path proto/messenger.proto`

---

## v0.1.3.9 (2026-06-21)

Технический долг + P3 фичи + Password Reset.

### Tech Debt Fixes

- **Proto codegen**: исправлен `npm run proto:generate` — добавлен `--path proto/messenger.proto` для избежания сканирования node_modules
- **getHistoryV2 fallback**: fallback на v1 messages оставлен — необходим для чтения старых сообщений
- **Auth interceptor**: добавлен logout при permanent fail refresh (UNAUTHENTICATED/invalid_token/expired)

### New Features

- **Password Reset UI**: экран восстановления пароля на desktop и mobile
  - `requestPasswordReset(email)` — отправка кода сброса
  - `resetPassword(token, newPassword)` — сброс пароля по коду
  - 3-step flow: email → код + новый пароль → успех
- **getUserAvatar RPC**: метод `getUserAvatar(userIdOrUsername)` для получения аватара
- **Desktop sidebar**: "Изменить профиль" ссылка под именем пользователя

### i18n

- Добавлены ключи для password reset: `forgotPassword`, `resetPasswordTitle`, `resetPasswordHint`, `resetPasswordSuccess`, `enterResetCode`, `newPasswordPlaceholder`, `resetPassword`, `resetPasswordDone`, `backToLogin`, `passwordMismatch`

---

## v0.1.3.8 (2026-06-21)

Автообновление клиента — Telegram-style "Обновить" баннер.

### Auto Update

- **version.json**: файл с текущей версией в `public/` (перезаписывается при деплое)
- **App.tsx**: проверка `/version.json` при загрузке + каждые 60 секунд
- **UpdateBanner**: баннер внизу экрана "Доступно обновление vX.X.X" с кнопкой "Обновить"
- **handleUpdate**: очищает все Service Worker кэши → `location.reload()`
- Версия сохраняется в `localStorage.app_version` для сравнения

---

## v0.1.3.7 (2026-06-21)

Избранное — пересборка для сброса кэша.

- FavoritesScreen = ChatScreen (полный функционал: отправка, скрепка, реакции, медиа)
- Исправлена ошибка streaming request bodies (v1 → v2)

---

## v0.1.3.6 (2026-06-21)

Избранное — полный функционал чата.

### Favorites Screen

- **FavoritesScreen**: заменён на ChatScreen — теперь работает как обычный чат
- Поддержка отправки текста, изображений, файлов, аудио
- Поддержка реакций, редактирования, удаления сообщений
- Исправлена ошибка "fetch API does not support streaming request bodies" (v1 sendMessage → v2)
- Исправлено отображение имени — показывается "⭐ Избранное"

---

## v0.1.3.5 (2026-06-21)

Исправление имён личных чатов + работающие вложения.

### Имена чатов

- **protoToChat**: для direct чатов имя показывает только собеседника (было "user1 & user2")
- Определяет текущего пользователя и убирает его из имени

### Вложения (изображения, файлы, аудио)

- **Message type**: добавлено поле `fileUrl` для файловых вложений
- **protoToMessageV2**: обработка `media.type === 'file'` — извлекается URL и имя файла
- **ChatScreen desktop**: рендеринг изображений (`<img>`), аудио (`<audio>`), файлов (`<a>` ссылка)
- **ChatScreen mobile**: рендеринг изображений (`<img>`), аудио (`<audio>`), файлов (`<a>` ссылка)
- Изображения открываются по клику в новой вкладке
- Файлы скачиваются по ссылке

---

## v0.1.3.4 (2026-06-21)

AI Chat Settings — настройки API ключа и модели.

### AI Chat Settings

- **grpcClient**: методы `getAIChatSettings` и `updateAIChatSettings` для управления настройками AI чата
- **AIChatsScreen mobile**: новый view "Настройки AI" с формой API ключа и модели
- **AIChatsScreen mobile**: отображение использования (remaining/limit)
- Кнопка 🔑 в хедере для доступа к настройкам

---

## v0.1.3.3 (2026-06-21)

Drafts server integration — замена localStorage на серверные RPC.

### Drafts

- **useChatMessages**: `getDraft` загружает черновик с сервера при открытии чата
- **useChatMessages**: `updateDraft` сохраняет черновик на сервер через `saveDraft` (debounce 800ms)
- **useChatMessages**: `clearDraft` удаляет черновик на сервер через `deleteDraft`
- Убрана зависимость от `localStorage` для черновиков

---

## v0.1.3.2 (2026-06-21)

HTTP uploads — отправка изображений, файлов и аудио.

### HTTP Uploads

- **grpcClient**: новый метод `sendMessageV2Media` — отправка медиа-сообщений (image/file/voice) через SendMessageV2Request с MessageMedia
- **useChatMessages**: новый метод `sendMediaMessage` — загрузка файла + отправка медиа-сообщения с определением типа по MIME
- **ChatScreen desktop**: кнопка скрепки открывает file picker (image/*, audio/*, documents)
- **ChatScreen mobile**: кнопка скрепки открывает file picker (image/*, audio/*, documents)
- **Upload flow**: file → uploadImage/uploadFile_/upload-audio → URL → sendMessageV2Media

---

## v0.1.3.1 (2026-06-21)

Typing indicators — отправка и отображение в чате и списке чатов.

### Typing Indicators

- **grpcClient**: `handleChatV2Message` теперь пересылает typing события из ChatV2 stream в callback (было silent ignore)
- **grpcClient**: новый метод `openTypingStream` — persistent BiDi Typing stream для получения typing событий из всех чатов
- **useChatMessages**: переключение с v1 `openReceiveStream` на `openChatV2Stream` для получения typing событий
- **useChatMessages**: новый метод `sendTypingIndicator` — отправкаtyping信号 с debounce (3s timeout, дедупликация)
- **useChatMessages**: cleanup при смене чата — автоматическая отправка `isTyping: false`
- **useChatMessages**: userId → username резолв для `typingUsers` map (отображение имён вместо UUID)
- **ChatScreen desktop**: `handleInputChange` вызывает `sendTypingIndicator(true)` при наборе текста
- **ChatScreen mobile**: `handleInputTextChange` вызывает `sendTypingIndicator(true)` при наборе текста
- **ChatListScreen desktop/mobile**: переключение с `openReceiveStream('__global_typing__')` на `openTypingStream` для корректного получения typing событий

---

## v0.1.3.0 (2026-06-21)

Messages V2 + Favorites self-chat + Auth interceptor fix.

### Messages V2

- **Proto**: MessageV2, MessageMedia, MessageReply, ChatV2Message + 6 RPCs (ChatV2, GetHistoryV2, SendMessageV2, EditMessageV2, DeleteMessageV2, SetReactionV2)
- **grpcClient**: V2 methods с V1 fallback (getHistoryV2 → getHistory при пустом messages_v2)
- **useChatMessages**: V2 send/edit/delete/reaction, cursor pagination, user resolution

### Favorites

- **FavoritesScreen**: self-chat в `favorites_<username>` room — отправка сообщений себе
- **ProfileScreen**: кнопка "⭐ Избранное"
- **Chat context menu** (mobile + desktop): "⭐ В избранное"

### Auth Interceptor

- **isRefreshing** флаг — блокирует бесконечную рекурсию refreshToken
- **refreshFailedAt** — 30s cooldown после неудачного refresh
- Токен всегда attached к запросу (stale token) — данные загружаются даже при ошибке refresh

### Routing

- **App.tsx mobile**: profile и favorites экраны
- **App.tsx desktop**: profile/favorites через sidebar

---

## v0.1.2.0 (2026-06-21)

Messages V2 интеграция — lean message type, cursor pagination, ChatV2 stream.

### Messages v2

- **Proto**: добавлены MessageV2, MessageMedia, MessageReply, ChatV2Message, ChatV2Typing, ChatV2System
- **RPCs**: ChatV2 (BiDi stream), GetHistoryV2, SendMessageV2, EditMessageV2, DeleteMessageV2, SetReactionV2
- **grpcClient**: `getHistoryV2` — cursor-based pagination (`nextCursor`, `hasMore`)
- **grpcClient**: `sendMessageV2` — unary RPC (вместо ephemeral BiDi stream)
- **grpcClient**: `editMessageV2`, `deleteMessageV2`, `setReactionV2` — обновлённые V2 методы
- **grpcClient**: `openChatV2Stream` — bidirectional stream с oneof payload (message/typing/system)
- **protoToMessageV2** — конвертер MessageV2 → Message (oneof content → flat fields, JSONB reactions)
- **useChatMessages**: переход на V2 методы (getHistoryV2, sendMessageV2, editMessageV2, deleteMessageV2, setReactionV2)
- **useChatMessages**: cursor-based пагинация (вместо offset-based)
- **useChatMessages**: ChatV2 stream для real-time (вместо v1 Chat stream)
- **User resolution**: автоматическое разрешение sender_id → username через users map

### Что убрано vs v1 Message

| Поле | Замена в v2 |
|------|------------|
| `user` (username) | `sender_id` (UUID) → разрешается через users map |
| `replied_to_user/text` | `MessageReply { message_id, preview }` |
| `avatar_url`, `is_super_admin` | Нет в MessageV2 (resolve at read time) |
| `image_url`, `voice_url`, `duration` | `MessageMedia { type, url, urls, duration }` |
| `reactions` (array) | `bytes reactions` (JSON: `{"uuid":"emoji",...}`) |

---

## v0.1.1.4 (2026-06-21)

Hotfix: GetChatsV2 RPC name.

### Исправления

- **GetChatsV2**: вызывает `getChatsV2` вместо `getChats` (сервер не реализует GetChats)

---

## v0.1.1.3 (2026-06-21)

AI v2 images, HTTP uploads, typing stream, secret chat E2EE.

### AI v2

- `chatWithAIV2`: base64→Uint8Array конвертация для images, обработка imageUrl из response
- `AIMessage`: добавлено поле `imageUrl` для генерации изображений (Reve)

### HTTP Uploads

- `uploadAvatar(avatar, avatarFull?)` — загрузка аватара
- `uploadImage(file)` — загрузка изображения
- `uploadFile(file)` — загрузка файла
- `uploadAudio(file)` — загрузка аудио
- `uploadBackground(file)` — загрузка фона

### Streams

- `sendTyping(roomId, username, userId, isTyping)` — BiDi Typing stream
- `callSession(messages)` — BiDi CallSession (WebRTC signaling)

### Secret Chat (E2EE)

- `createSecretChat(targetUsername, targetUserId, publicKey)` — создание секретного чата
- `exchangeSecretKey(chatId, publicKey)` — обмен ключами
- `getSecretChatKey(chatId)` — получение публичного ключа пира

---

## v0.1.1.2 (2026-06-21)

Синхронизация proto с сервером v1.3.0.18 + cursor pagination + AI v2 RPCs.

### Proto sync (messenger.proto v1.3.0.18)

- **GetChatsV2**: cursor-based pagination (`cursor` field, `nextCursor`, `hasMore` в ответе)
- **AI v2 RPCs**: chatWithAIV2, createAIAgent, updateAIAgent, deleteAIAgent, getAIAgent, listAIAgents, cloneAIAgent, listAITools, rateAIAgent, getAIAgentReviews, listMarketplaceAgents, getAIAgentStats, shareAIAgent, installAIAgent, getAIUsageStats — все 15 RPCs теперь в proto
- **ChatWithAIV2Request**: `images` (repeated bytes), `toolCalls` (ToolCallV2[])
- **ChatWithAIV2Response**: `agentId`, `agentName`, `toolCalls`, `hasRagContext`, `modelUsed`, `tokenCount`, `imageUrl`
- **UserInfo**: добавлены `userId` (field 6) и `isSuperAdmin` (field 7)
- **Drafts**: поле `draftText` (was `text`) в SaveDraftRequest/GetDraftResponse
- **SetCurrentTheme**: добавлено `username` в запрос

### Исправления

- `grpcClient.saveDraft`: поле `draftText` вместо `text`
- `grpcClient.getChats`: возврат `{ chats, nextCursor, hasMore }` вместо `Chat[]`
- `grpcClient.setCurrentTheme`: добавлен параметр `username`
- `protoToDraft`: чтение `draftText` вместо `text`
- `useChatListV2`: cursor-based пагинация
- `useChats`: деструктуризация `result.chats`

---

## v0.1.1.1 (2026-06-21)

Исправления proto field mismatches + пагинация + автономный аудит.

### Исправления gRPC (proto field mismatches)

- **pinChat/unPinChat/archiveChat/unarchiveChat**: добавлен `userId` в запрос (сервер требует)
- **pinMessage/unPinMessage**: добавлен `userId` в запрос
- **addParticipant/removeParticipant**: исправлены имена полей — `chatId, username, userId` (было `chatId, userId, newParticipantId`)
- **getDevices**: перенесён из `authClient` на `chatClient`, принимает `userId`
- **getThemes**: возвращает `{ currentThemeId, themes }`, принимает `(username, userId)`, читает `result.customThemes`
- **saveTheme**: принимает `(username, userId, theme)`, отправляет `{ username, theme, userId }`

### Исправления хуков

- **useChatListV2**: pinChat/unpinChat/archiveChat/unarchiveChat передают `user.id`
- **useDevices**: передаёт `user.id` в `getDevices`
- **usePinnedMessages**: передаёт `user.id` в pinMessage/unPinMessage
- **useChatMessages.loadMore**: фильтрация дубликатов при пагинации

---

## v0.1.1.0 (2026-06-20)

Массовое исправление багов + Telegram Web UI + серверная интеграция.

### Исправления gRPC (критические)

- **setReaction**: исправлены поля запроса — `reaction: { user, emoji }` вместо плоских полей
- **deleteMessages**: исправлен формат — `messages: [{ id }], requesterUsername`
- **editMessage**: исправлен формат — `messageId, text` (без лишних `roomId`/`userId`)
- **listAITools**: вызывал `listAIAgents` — теперь вызывает `listAITools`
- **getContacts**: возвращает `string[]` (usernames), useContacts резолвит в `Contact[]`
- **addContact/removeContact**: исправлены поля под proto (`contactUsername`, `username`)
- **deleteProfile**: передаёт пароль в `DeleteProfileV2Request` (сервер требует)
- **sendMessage**: поддержка reply — `repliedToMessageId/User/Text`
- **Chat stream auth**: добавлены `userId`, `deviceId`, `deviceName` в первое сообщение
- **SERVER_SHUTTINGDOWN**: теперь эмитит событие для UI вместо тихого игнора

### Исправления хуков

- **useChatMessages**: `editMessage`/`deleteMessages`/`toggleReaction` вызывают бэкенд gRPC
- **useChats**: `createNewChat` резолвит `user2Id` через `getUserId` (был хардкод `'user-2-id'`)
- **usePushNotifications**: реальный userId из `authStore` (был хардкод `'user-1'`)
- **useProfile**: пароль передаётся в `deleteProfile`
- **chatStore.setChats**: не затирает загруженные сообщения при обновлении списка чатов

### Telegram Web UI

- **Chat (desktop + mobile)**: тёмная тема Telegram — цвета `#0E1621`/`#17212B`/`#2B5278`/`#182533`
- Пузыри сообщений: мои справа, чужие слева, скругления как в Telegram
- Read receipts: SVG иконки ✓/✓✓ в стиле Telegram
- Контекстные меню и reaction picker в стиле Telegram
- Заголовок чата: круглый аватар, имя, статус онлайн/typing
- Область ввода: скруглённое поле, кнопка скрепки, кнопка отправки/голоса
- Логотип добавлен на экран логина (desktop)

### Технический долг

- `isMobile()` вынесен в `shared/utils.ts`, удалено 7 дублей
- Пустые `catch` — добавлено логирование в 5 критических мест (auth refresh, notifications, SW)
- Локализация: 40+ ключей translations, заменены хардкоды в ChatScreen
- Удалены мёртвые стабы `src/gen/`
- Исправлен redundant ternary в AuthScreen.mobile

Полная переработка клиента под сервер Lavender v1.3.0.15.

**Proto**: синхронизация с сервером (1891 строка, 15 новых RPC)
**grpcClient**: 30+ новых методов (реакции, черновики, избранное, темы, muted, AI v2, маркетплейс, секретные чаты, bot commands)

### Экраны

- **AI Chats v2**: ChatWithAIV2 стриминг, CRUD агентов, маркетплейс, статистика
- **Chat**: реакции, редактирование/удаление, typing индикаторы, черновики, read receipts, выделение
- **ChatList**: контекстные меню, свайп-действия, mute/delete, typing в списке
- **Profile**: модал с аватар/bio/status
- **Settings**: смена username/пароля, темы, устройства, язык, danger zone
- **Contacts**: вкладки контакты + каталог с поиском

### Resilience

- Graceful shutdown обработка (SERVER_SHUTTINGDOWN)
- Автопереподключение с exponential backoff (макс 30с)
- Offline режим с индикаторами
- Capability negotiation (GET /info)

### Деплой

- deploy.sh для деплоя на сервер
- Envoy на --network host
- Nginx прокси для /info, /health, /files

### Исправления (после v0.1.0.0)

- Auth token expiry: use accessExpiresAt/refreshExpiresAt (не expiresAt)
- GetChatsV2: правильное имя RPC (сервер не реализует GetChats)
- /info endpoint: проксируется через nginx на порт 8082
- Логотип: заменён эмодзи на <img src="/logo.png">

---

## v0.6.0 (2026-06-19)

Адаптация к серверу v1.2.0.7: Auth V2 фиксы, новые gRPC методы.

## v0.5.0 (2026-06-18)

Реальные чаты и сообщения через gRPC-web BiDi stream.

## v0.4.0 (2026-06-17)

i18n (EN/RU), переименование проекта в Lava.

## v0.3.0 (2026-06-16)

Desktop UI, Auth V2 JWT, gRPC-web proxy.

## v0.1.0 (2026-06-14)

Начало проекта.
