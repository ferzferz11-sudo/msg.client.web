# Gotchas, Fixes & Known Issues

## Proto Gotchas

### ProfileService v2 — UNIMPLEMENTED on server (v0.1.4.3 fix)

Сервер v1.3.0.24 регистрирует `ProfileService`, но大部分 методов возвращают UNIMPLEMENTED. Сервер отвечает `profile: "1.0"` на `/info`.

**Решение**: все profile методы пробуют ProfileService v2, при ошибке fallback на ChatService:
- `getProfile` → fallback `getUserProfile`
- `updateProfile` → fallback `updateProfile` (ChatService)
- `updateAvatar` → fallback `updateAvatar` (ChatService)
- `deleteProfile` → fallback `deleteProfile` (ChatService)
- `getUserSettings`/`updateUserSettings` → graceful degradation (defaults/false)

### SendMessageV2 oneof content (CRITICAL — v0.1.4.2 fix)

`SendMessageV2Request` использует `oneof content { text, media }`. При использовании `any`-типа flat-объект `{ roomId, text: content }` serialized protobuf отправляет `text` как неизвестное верхнеуровневое поле — сервер игнорирует его, `content` oneof остаётся nil → пустое сообщение в БД.

**Правильно:**
```typescript
const request = new SendMessageV2Request({
  roomId,
  content: { case: 'text', value: text },
})
```

**Неправильно:**
```typescript
const request: any = { roomId, text: content }  // oneof НЕ сериализуется!
```

То же для media:
```typescript
const request = new SendMessageV2Request({
  roomId,
  content: { case: 'media', value: { type, url, duration } },
})
```

### TURN credentials — 401 on page load (v0.1.4.3 fix)

`/turn-credentials` требует JWT auth. При загрузке страницы токены ещё не готовы → 401.

**Решение**: ленивая загрузка — `fetchICEServers()` вызывается только при начале звонка (`startCall`/`answerCall`), не при монтировании хука.

### GetChats / GetChatsV2
Proto содержит оба RPC → codegen схлопывает в `getChats` с name `GetChats`. Сервер реализует только V2 → вызывать `this.chatClient.getChatsV2()` вместо `this.chatClient.getChats()`.

### AuthResponseV2 поля
`accessExpiresAt` / `refreshExpiresAt` (не `expiresAt`).

### HTTP endpoints vs gRPC
`/info` и `/health` — HTTP REST (порт 8082), НЕ gRPC. Нужен nginx прокси. `fetchServerInfo()` и `checkHealth()` используют корневой путь `/info`, `/health` (не `/messenger/...`).

### DeleteMessageV2Request
Использует `messageIds: string[]` + `requesterUserId: string`.

### SetReactionV2Request
`{ messageId, emoji }` — emoji пустая строка = удалить реакцию.

### EditMessageV2Request
Только `{ messageId, text }`.

### GetContactsResponse
Возвращает `repeated string contacts` — просто массив username строк.

### GetHistoryV2Request
Cursor-based: `roomId`, `limit`, `cursor` (пустая строка = первая страница).

### SearchMessagesRequest
`{ roomId, query, limit }` — `roomId` опциональный (пустой = поиск по всем чатам).

### ListAITools vs ListAIAgents
Разные RPC, не путать.

## Known Issues (Fixed)

### v1 Typing BiDi Stream (v0.1.4.1 fixed)
v1 `typing()` RPC — BiDi stream. `@connectrpc/connect-web` использует fetch, который НЕ поддерживает streaming request bodies. Результат: `ConnectError: The fetch API does not support streaming request bodies`.

**Решение**: typing отправляется через ChatV2 stream (`openChatV2Stream` → `send({ typing: { isTyping } })`). Глобальный typing stream из chat list удалён.

### openChatV2Stream return type (v0.1.4.1)
`openChatV2Stream` теперь возвращает `{ cleanup, send }` вместо `cleanup`. Все вызывающие коды обновлены.

### DeleteProfileV2Request
Требует поле `password`.

### TokenRequest (push)
Требует `user_id`.

### AddParticipant / RemoveParticipant
Используют `chat_id`, `username`, `user_id`.

### CreateDirectChatRequest
Использует `user1_id`, `user2_id` (с подчёркиваниями).

---

## Server Proto Field Conventions (cross-reference 2026-06-27)

- Множество ChatService RPCs требуют `user_id` даже когда клиент опускает (pinChat, archiveChat, pinMessage, setMutedChat и т.д.)
- `DeleteMessageV2Request` — `messageIds: string[]`, `requesterUserId: string`
- `SetReactionV2Request` — `messageId`, `emoji` (пустая = удалить)
- `EditMessageV2Request` — `messageId`, `text`
- `GetHistoryV2Request` — `roomId`, `limit`, `cursor`
- `SearchMessagesRequest` — `roomId` (опциональный), `query`, `limit`
- `GetContactsResponse` — `repeated string contacts` (только username строки)
- `ListAITools` — отдельный RPC от `ListAIAgents`
- `DeleteProfileV2Request` — требует `password`
- `TokenRequest` (push) — требует `user_id`
- `AddParticipantRequest` / `RemoveParticipantRequest` — `chat_id`, `username`, `user_id`
- `CreateDirectChatRequest` — `user1_id`, `user2_id` (с подчёркиваниями)

---

## Known Doc vs Proto Discrepancies (proto — source of truth)

- **MarkRead**: proto — `(room_id, username, user_id)`, doc — `(room_id, message_id)`
- **TokenRequest (push)**: proto — `(user, token, pushEnabled, userId)`, doc — `(user_id, token, platform, device_id)`
- **AddParticipant/RemoveParticipant**: proto использует username где doc ожидает participant ID

---

## Applied Proto Fixes

### Batch 5 (2026-06-27 — v0.1.5.0 v1→v2 migration)
- Removed all v1 message RPCs from client (getHistory, sendMessage BiDi, setReaction, deleteMessages, editMessage, openReceiveStream)
- Removed v1 fallback in getHistoryV2 (server removed dual-write)
- Added SearchMessages RPC + client method
- getPinnedMessages/getFavorites now use protoToMessageV2
- Removed v1 getHistory fallback in useAIChats

### Batch 4 (2026-06-21 — post-proto-sync)
- **chatWithAIV2**: base64→Uint8Array для images, imageUrl response handling
- **HTTP upload methods**: uploadAvatar, uploadImage, uploadFile_, uploadAudio, uploadBackground — JWT auth
- **sendTyping**: BiDi stream для typing indicators
- **callSession**: BiDi stream для WebRTC signaling
- **Secret chat methods**: createSecretChat, exchangeSecretKey, getSecretChatKey — correct signatures
- **registerPushToken**: sends (user, token, pushEnabled, userId) matching proto

---

## Server API Fixes Applied (2026-06-20)

- `setReaction`: flat `{ messageId, roomId, userId, emoji }` → nested `{ messageId, reaction: { user, userId, emoji } }`
- `deleteMessages`: `{ messageIds, roomId, userId }` → `{ messages: [{ id }], requesterUsername }`
- `editMessage`: `{ messageId, roomId, userId, newText }` → `{ messageId, text: newText }`
- `listAITools`: вызывал `listAIAgents` → исправлен на `listAITools`
- `getContacts`: return type `Contact[]` → `string[]` (сервер возвращает username строки)
- `addContact`/`removeContact`: proper field mapping (`username`, `contactUsername`, `userId`)
- `deleteProfile`: optional `password` параметр для ProfileService v2

---

## Runtime Issues

### Auth Token Refresh — Parallel Requests Bug
Параллельные запросы во время refresh использовали протухший token. Interceptor читал snapshot в начале, а после refresh не перечитывал.
**Решение** (v1.3.10): interceptor перечитывает `getTokens()` после refresh блока. `permanentFail` флаг блокирует все запросы после permanent failure.

### Auth Token Refresh на Reload
`grpcClient.ts:130` триггерит refresh когда `now >= accessExpiresAt`. При перезагрузке с валидным токеном сервер отклоняет refresh как "revoked or expired".
**Решение**: `isRefreshing` флаг блокирует рекурсию, 30s cooldown после ошибки, stale token fallback.

### v1/v2 Message Migration (Completed v0.1.5.0)
Сервер завершил миграцию v1→v2, убрал dual-write. Все сообщения теперь только в `messages_v2`.
Клиент полностью переключен на v2 RPC.

### v1 Reactions Format (Legacy)
V1 reactions: `[{user, emoji}]` array. V2 reactions: `bytes reactions` (JSON `{"uuid":"emoji"}`).
`protoToMessageV2` парсит JSONB reactions из v2.

### Typing Stream — BiDi Not Supported
`openTypingStream` использует BiDi stream (fetch streaming request bodies), не поддерживается браузерами.
**Решение** (v1.3.10): обёрнуто в try-catch, ошибки не крашат приложение.

### Favorites Server Query
`GetFavorites` возвращает сообщения с `room_id='favorites_<username>'`. Использует `protoToMessageV2` для конвертации.

### messages_v2 Table
Сервер завершил миграцию (v0.1.5.0). Dual-write удалён. Все сообщения только в `messages_v2`.

### Proto Codegen
`npm run proto:generate` падает из-за node_modules protobuf ошибок.
**Решение**: `buf generate --path proto/messenger.proto`

---

## UI Component Patterns

### ProfileScreen action buttons
Flat list of `<button>` с emoji prefix + label,conditionally rendered через `onXxx` проп (onSettings, onContacts, onAIChats, onFavorites).

### Chat context menu
`CtxItem` компонент с emoji+label+onClick, `position: fixed` overlay, одинаковый паттерн в mobile и desktop.

### App.tsx mobile routing
`Screen = 'auth' | 'chatList' | 'chat' | 'profile' | 'favorites' | 'contacts'` — добавление экранов требует расширение union типа.

### App.tsx desktop routing
Desktop использует `ChatListScreen` с `rightPanel` prop: `'profile' | 'contacts' | 'favorites' | null`. Все экраны открываются в правой панели.

### Screen component pattern
`Screen` принимает `header` и `footer` JSX пропы. Inline JSX в footer в scope для hooks (useState, useRef, useCallback).

---

## UI Design Direction

- Auth: `<img src="/logo.png">` (не эмодзи). Лого в `/public/logo.png`.
- Chat: Telegram Web эстетика — outgoing справа, distinct bubble colors, tails, timestamp+read check, Telegram-style input.
- `handleChatMessage` должен эмитить `SERVER_SHUTTINGDOWN` и `FORCE_DISCONNECT` (было silent ignore).
- Chat stream auth: `jwt_token`, `room_id`, `user_id`, `client_version`, `device_id`, `device_name`.
- `chatStore.setChats` не затирает загруженные message indices для существующих чатов.

### Telegram Web Dark Theme
- Background: `#0E1621`, Header/Input: `#17212B`, Input field: `#242F3D`
- Outgoing: `#2B5278`, Incoming: `#182533`
- Text: `#F5F5F5`, Secondary: `#6C7883`, Accent: `#5EB5F7`, Online: `#4FAE4E`
- Destructive: `#E53935`
