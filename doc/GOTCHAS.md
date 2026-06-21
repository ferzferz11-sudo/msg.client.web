# Gotchas, Fixes & Known Issues

## Proto Gotchas

### GetChats / GetChatsV2
Proto содержит оба RPC → codegen схлопывает в `getChats` с name `GetChats`. Сервер реализует только V2 → вызывать `this.chatClient.getChatsV2()` вместо `this.chatClient.getChats()`.

### AuthResponseV2 поля
`accessExpiresAt` / `refreshExpiresAt` (не `expiresAt`).

### HTTP endpoints vs gRPC
`/info` и `/health` — HTTP REST (порт 8082), НЕ gRPC. Нужен nginx прокси. `fetchServerInfo()` и `checkHealth()` используют корневой путь `/info`, `/health` (не `/messenger/...`).

### DeleteMessagesRequest
Ожидает `messages: Message[]` (полные объекты), НЕ `messageIds: string[]`.

### ReactionRequest
Вложенная структура: `{ message_id, reaction: { user, emoji } }`.

### EditMessageRequest
Только `{ message_id, text }` — без roomId/userId.

### GetContactsResponse
Возвращает `repeated string contacts` — просто массив username строк.

### GetHistoryRequest
Только `limit` + `room` — НЕТ cursor/offset поля.

### ListAITools vs ListAIAgents
Разные RPC, не путать.

### DeleteProfileV2Request
Требует поле `password`.

### TokenRequest (push)
Требует `user_id`.

### AddParticipant / RemoveParticipant
Используют `chat_id`, `username`, `user_id`.

### CreateDirectChatRequest
Использует `user1_id`, `user2_id` (с подчёркиваниями).

---

## Server Proto Field Conventions (cross-reference 2026-06-20)

- Множество ChatService RPCs требуют `user_id` даже когда клиент опускает (pinChat, archiveChat, pinMessage, setMutedChat и т.д.)
- `DeleteMessagesRequest` ожидает `messages: Message[]` (полные объекты), НЕ `messageIds: string[]`
- `ReactionRequest` — вложенная структура `{ message_id, reaction: { user, emoji } }`
- `EditMessageRequest` — только `{ message_id, text }`
- `GetContactsResponse` — `repeated string contacts` (только username строки)
- `GetHistoryRequest` — только `limit` + `room` (без cursor/offset)
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

### Batch 2 (2026-06-20)
- Message reply fields: `repliedToMessageId`, `repliedToUser`, `repliedToText` в sendMessage
- `useChatMessages` edit/delete/reaction — gRPC вызовы verified
- `useChats.ts` hardcoded `'user-2-id'` — resolved
- `usePushNotifications.ts` hardcoded `'user-1'` — resolved
- `useChatMessages.loadMore` — fixed duplicate filtering pagination
- `usePinnedMessages.ts` — added userId к pinMessage/unPinMessage

### Batch 3 (2026-06-21 — proto sync v1.3.0.18)
- Proto synced из сервера v1.3.0.18 (1984 строки)
- **GetChatsV2**: cursor-based pagination (cursor, nextCursor, hasMore)
- **AI v2 RPCs**: 15 новых RPC (chatWithAIV2, createAIAgent и т.д.)
- **ChatWithAIV2Request**: images (Uint8Array[]), toolCalls (ToolCallV2[])
- **ChatWithAIV2Response**: agentId, agentName, toolCalls, hasRagContext, modelUsed, tokenCount, imageUrl
- **UserInfo**: userId (field 6), isSuperAdmin (field 7)
- **Drafts**: draftText поле (было text)
- **SetCurrentTheme**: username поле добавлено

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

### Auth Token Refresh на Reload
`grpcClient.ts:130` триггерит refresh когда `now >= accessExpiresAt - 300`. При перезагрузке с валидным токеном сервер отклоняет refresh как "revoked or expired".
**Решение**: `isRefreshing` флаг блокирует рекурсию, 30s cooldown после ошибки, stale token fallback.

### Favorites Server Query
`GetFavorites` SQL (`db_messages.go:207-212`) делает JOIN favorites с messages, вызывает `decrypt()`. Subqueries резолвят user_id из username — если нет строк, запрос возвращает пусто молча.
**Данные**: favorites хранятся в `messages` с `room_id='favorites_<username>'`.

### messages_v2 Table Empty
Dual-write на сервере (`server_chat.go:341+`) пишет только НОВЫЕ сообщения, не ретроактивно. Все существующие — только в `messages`.
**Решение**: getHistoryV2 с fallback на getHistory.

### Proto Codegen
`npm run proto:generate` падает из-за node_modules protobuf ошибок.
**Решение**: `npx buf generate --path proto/messenger.proto`

---

## UI Component Patterns

### ProfileScreen action buttons
Flat list of `<button>` с emoji prefix + label,conditionally rendered через `onXxx` проп (onSettings, onContacts, onAIChats, onFavorites).

### Chat context menu
`CtxItem` компонент с emoji+label+onClick, `position: fixed` overlay, одинаковый паттерн в mobile и desktop.

### App.tsx mobile routing
`Screen = 'auth' | 'chatList' | 'chat' | 'profile' | 'favorites'` — добавление экранов требует расширение union типа.

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
