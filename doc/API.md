# API Reference — grpcClient methods

Все методы доступны через `grpcClient` singleton (`src/shared/api/grpcClient.ts`).

## Auth

| Метод | Описание |
|-------|----------|
| `signInV2(username, password)` | Вход (JWT) — access_token 15мин + refresh_token 30дней |
| `signUpV2(username, password, email)` | Регистрация (JWT) |
| `refreshToken()` | Обновление токенов (rotation) |
| `signOut(allDevices)` | Выход (all_devices=true — все сессии) |
| `revokeDevice(deviceId)` | Отзыв устройства |
| `requestPasswordReset(email)` | Отправка кода сброса пароля |
| `resetPassword(token, newPassword)` | Сброс пароля по коду |

## Profile (ProfileService v2 — JWT-only, отдельный gRPC сервис)

| Метод | Описание |
|-------|----------|
| `getProfile()` | Профиль из JWT (user_id, username, email, avatar, bio, status, locale, isSuperAdmin) |
| `updateProfile({username, bio, status, locale})` | Обновить профиль |
| `updateAvatar(avatarUrl, fullAvatarUrl?)` | Аватар |
| `getUserSettings()` | Настройки (locale, themeId, pushEnabled, custom) |
| `updateUserSettings({locale, themeId, pushEnabled})` | Обновить настройки |
| `deleteProfile(password?)` | Удалить аккаунт (пароль обязателен) |

## Chats

| Метод | Описание |
|-------|----------|
| `getChats(userId, username?, options?)` | GetChatsV2: cursor-based pagination, фильтр (all/pinned/archived/muted) |
| `getHistoryV2(roomId, limit, cursor)` | История v2: cursor-based pagination |
| `createDirectChat(user1, user2, user1Id, user2Id)` | Создать личный чат |
| `createGroupChat(name, participants, creator, creatorId, participantIds)` | Создать группу |
| `deleteChat(chatId, requesterUsername, requesterUserId)` | Удалить чат |
| `updateChatName(chatId, newName)` | Переименовать чат |
| `updateChatAvatar(chatId, avatarUrl, userId)` | Аватар чата |
| `addParticipant(chatId, userId)` | Добавить участника |
| `removeParticipant(chatId, userId)` | Удалить участника |
| `markRead(roomId, username, userId)` | Отметить прочитанным |
| `searchChats(query, limit, offset)` | Поиск чатов |
| `getChatListVersion()` | Версия списка для кэширования |

## Messages v2

| Метод | Описание |
|-------|----------|
| `sendMessageV2(roomId, content, replyToId?)` | Отправить (unary RPC, oneof content: text/media) |
| `sendMessageV2Media(roomId, media, replyToId?)` | Отправить медиа (image/file/voice) |
| `editMessageV2(messageId, newText)` | Редактировать |
| `deleteMessageV2(messageIds, requesterUserId)` | Удалить |
| `setReactionV2(messageId, emoji)` | Реакция (пустая = удалить) |
| `openChatV2Stream(roomId, callback)` | BiDi stream (oneof: message/typing/system) |
| `searchMessages(roomId, query, limit)` | Поиск сообщений (single-chat or cross-chat) |

## ChatList v2

| Метод | Описание |
|-------|----------|
| `pinChat(chatId)` / `unPinChat(chatId)` | Закрепить / открепить |
| `archiveChat(chatId)` / `unarchiveChat(chatId)` | Архивировать / разархивировать |
| `searchChats(query, limit, offset)` | Поиск чатов |
| `getChatListVersion()` | Версия для кэширования |

## Pin Messages

| Метод | Описание |
|-------|----------|
| `pinMessage(chatId, messageId)` / `unPinMessage(chatId, messageId)` | Закрепить / открепить |
| `getPinnedMessages(chatId)` | Список закреплённых |

## Drafts

| Метод | Описание |
|-------|----------|
| `saveDraft(userId, roomId, text)` | Сохранить черновик (серверный) |
| `getDraft(userId, roomId)` | Получить черновик |
| `deleteDraft(userId, roomId)` | Удалить черновик |

## Favorites

| Метод | Описание |
|-------|----------|
| `addFavorite(userId, messageId)` | В избранное |
| `removeFavorite(userId, messageId)` | Убрать из избранного |
| `getFavorites(userId)` | Список избранных |

## Themes

| Метод | Описание |
|-------|----------|
| `getThemes(userId)` | Темы пользователя |
| `saveTheme(userId, theme)` | Сохранить тему |
| `setCurrentTheme(userId, themeId)` | Выбрать тему |
| `deleteTheme(userId, themeId)` | Удалить тему |

## Muted

| Метод | Описание |
|-------|----------|
| `getMutedChats(userId)` | Заглушенные чаты |
| `setMutedChat(userId, roomId, muted)` | Заглушить / включить |

## Users

| Метод | Описание |
|-------|----------|
| `getAllUsers()` | Все пользователи (UserInfo: username, avatar, userId, isSuperAdmin) |
| `getUserProfile(username?, userId?)` | Профиль пользователя |
| `getUserId(username)` | username → UUID |
| `getUserAvatar(userIdOrUsername)` | Получить аватар |
| `updateUsername(oldUsername, newUsername, userId)` | Сменить username |
| `updatePassword(username, userId, oldPassword, newPassword)` | Сменить пароль |

## Contacts

| Метод | Описание |
|-------|----------|
| `getContacts()` | Список контактов (string[] usernames) |
| `addContact(userId, username)` | Добавить контакт |
| `removeContact(userId)` | Удалить контакт |

## AI v2 (ChatWithAIV2)

| Метод | Описание |
|-------|----------|
| `chatWithAIV2(params)` | Async generator — стриминг AI ответов (token, toolCalls, agentId, imageUrl) |
| `getAIAgent(agentId)` | Информация об агенте (включая provider_config) |
| `listAIAgents(includePublic)` | Список агентов |
| `createAIAgent(agent)` | Создать агента (→ agent_id) |
| `updateAIAgent(agent)` | Обновить агента |
| `deleteAIAgent(agentId)` | Удалить агента |
| `cloneAIAgent(agentId, newName)` | Клонировать агента |
| `listAITools()` | Доступные инструменты |

## AI Chat v2 Sessions

| Метод | Описание |
|-------|----------|
| `listAIV2Chats()` | Список AI чат-сессий (id, name, chatType, agentId, timestamps) |
| `getAIV2ChatHistory(sessionId, limit)` | История AI чата с метаданными агента |

## AI Marketplace

| Метод | Описание |
|-------|----------|
| `listMarketplaceAgents(query, limit, offset)` | Поиск агентов |
| `rateAIAgent(agentId, rating, review)` | Оценить агента |
| `getAIAgentReviews(agentId)` | Отзывы |
| `getAIAgentStats(agentId)` | Статистика |
| `shareAIAgent(agentId)` | Поделиться (→ share_code) |
| `installAIAgent(shareCode)` | Установить по коду |
| `getAIUsageStats()` | Статистика использования (totalTokens, totalRequests) |

## AI Chat Settings (Per-Session)

| Метод | Описание |
|-------|----------|
| `getAIChatSettings(sessionId)` | Настройки сессии (api_key, model, rate limits) |
| `updateAIChatSettings(sessionId, apiKey, model)` | Обновить настройки (пустые значения = сброс) |

## Secret Chats (E2EE)

| Метод | Описание |
|-------|----------|
| `createSecretChat(userId, otherUserId)` | Создать секретный чат |
| `exchangeSecretKey(chatId, userId, publicKey)` | Обмен ключами |
| `getSecretChatKey(chatId, userId)` | Получить ключ |

## Bot Commands

| Метод | Описание |
|-------|----------|
| `processBotCommand(userId, command, args)` | Выполнить команду |
| `getBotCommands()` | Список команд |

## Notifications

| Метод | Описание |
|-------|----------|
| `subscribeNotifications(callback)` | Подписка (Server Streaming) |
| `getNotificationHistory(limit)` | История уведомлений |
| `markNotificationsRead(notificationIds)` | Прочитано |
| `getUnreadCount()` | Непрочитанные |

## Push

| Метод | Описание |
|-------|----------|
| `registerPushToken(userId, token, pushEnabled)` | Регистрация FCM token |
| `getDevices()` | Устройства |
| `deleteOtherDevices()` | Удалить остальные |

## HTTP Uploads (JWT Auth)

| Метод | Описание |
|-------|----------|
| `uploadAvatar(avatar, avatarFull?)` | Загрузка аватара (multipart/form-data) |
| `uploadImage(file)` | Загрузка изображения |
| `uploadFile(file)` | Загрузка файла |
| `uploadAudio(file)` | Загрузка аудио |
| `uploadBackground(file)` | Загрузка фона |

**Allowed extensions:**
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Audio: `.m4a`, `.aac`, `.ogg`, `.mp3`, `.wav`
- Files: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.csv`, `.json`, `.xml`, `.zip`, `.rar`, `.7z`, `.mp3`, `.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`

## Streams

| Метод | Описание |
|-------|----------|
| `openChatV2Stream(roomId, callback)` | BiDi stream (message/typing/system) |
| `openReceiveStream(roomId, callback)` | BiDi stream v1 |
| `openTypingStream(callback)` | BiDi typing stream (deprecated — use ChatV2) |
| `callSession(messages)` | BiDi CallSession (WebRTC signaling) |

## HTTP Endpoints (Non-gRPC)

| Метод | Описание |
|-------|----------|
| `fetchServerInfo()` | GET `/info` — capability negotiation |
| `checkHealth()` | GET `/health` — health check |
| `fetchICEServers()` | GET `/turn-credentials` — TURN server credentials |
