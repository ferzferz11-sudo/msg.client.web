# Changelog

## v1.1.4 (2026-06-21)

Hotfix: GetChatsV2 RPC name.

### Исправления

- **GetChatsV2**: вызывает `getChatsV2` вместо `getChats` (сервер не реализует GetChats)

---

## v1.1.3 (2026-06-21)

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

## v1.1.2 (2026-06-21)

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

## v1.1.1 (2026-06-21)

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

## v1.1.0 (2026-06-20)

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

### Исправления (после v1.0.0)

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
