# API Reference — grpcClient methods

Все методы доступны через `grpcClient` singleton (`src/shared/api/grpcClient.ts`).

## Auth

| Метод | Описание |
|-------|----------|
| `signInV2(username, password)` | Вход (JWT) |
| `signUpV2(username, password, email)` | Регистрация (JWT) |
| `signOut(allDevices)` | Выход |
| `revokeDevice(deviceId)` | Отзыв устройства |

## Profile (ProfileService — JWT-only)

| Метод | Описание |
|-------|----------|
| `getProfile()` | Профиль из JWT |
| `updateProfile({username, bio, status, locale})` | Обновить профиль |
| `updateAvatar(avatarUrl, fullAvatarUrl?)` | Аватар |
| `getUserSettings()` | Настройки |
| `updateUserSettings({locale, themeId, pushEnabled})` | Обновить настройки |
| `deleteProfile()` | Удалить аккаунт |

## Chats

| Метод | Описание |
|-------|----------|
| `getChats(userId, username?, options?)` | Список чатов (фильтр, лимит, offset) |
| `getHistory(roomId, limit)` | История сообщений |
| `createDirectChat(user1, user2, user1Id, user2Id)` | Создать личный чат |
| `createGroupChat(name, participants, creator, creatorId, participantIds)` | Создать группу |
| `deleteChat(chatId, requesterUsername, requesterUserId)` | Удалить чат |
| `updateChatName(chatId, newName)` | Переименовать чат |
| `updateChatAvatar(chatId, avatarUrl, userId)` | Аватар чата |
| `addParticipant(chatId, userId)` | Добавить участника |
| `removeParticipant(chatId, userId)` | Удалить участника |
| `markRead(roomId, username, userId)` | Отметить прочитанным |

## Messages

| Метод | Описание |
|-------|----------|
| `sendMessage(roomId, content, userId)` | Отправить (ephemeral BiDi stream) |
| `openReceiveStream(roomId, callback)` | Получать сообщения (persistent BiDi stream) |
| `setReaction(messageId, emoji)` | Реакция |
| `deleteMessages(messageIds, roomId, userId)` | Удалить сообщения |
| `editMessage(messageId, roomId, userId, newText)` | Редактировать |

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
| `saveDraft(userId, roomId, text)` | Сохранить черновик |
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
| `getAllUsers()` | Все пользователи |
| `getUserProfile(username?, userId?)` | Профиль пользователя |
| `getUserId(username)` | username → UUID |
| `updateUsername(oldUsername, newUsername, userId)` | Сменить username |
| `updatePassword(username, userId, oldPassword, newPassword)` | Сменить пароль |

## Contacts

| Метод | Описание |
|-------|----------|
| `getContacts()` | Список контактов |
| `addContact(userId, username)` | Добавить контакт |
| `removeContact(userId)` | Удалить контакт |

## AI v2 (ChatWithAIV2)

| Метод | Описание |
|-------|----------|
| `chatWithAIV2(params)` | Async generator — стриминг AI ответов |
| `getAIAgent(agentId)` | Информация об агенте |
| `listAIAgents(includePublic)` | Список агентов |
| `createAIAgent(agent)` | Создать агента (→ agent_id) |
| `updateAIAgent(agent)` | Обновить агента |
| `deleteAIAgent(agentId)` | Удалить агента |
| `cloneAIAgent(agentId, newName)` | Клонировать агента |
| `listAITools()` | Доступные инструменты |

## AI Marketplace

| Метод | Описание |
|-------|----------|
| `listMarketplaceAgents(query, limit, offset)` | Поиск агентов |
| `rateAIAgent(agentId, rating, review)` | Оценить агента |
| `getAIAgentReviews(agentId)` | Отзывы |
| `getAIAgentStats(agentId)` | Статистика |
| `shareAIAgent(agentId)` | Поделиться (→ share_code) |
| `installAIAgent(shareCode)` | Установить по коду |
| `getAIUsageStats()` | Статистика использования |

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

## HTTP

| Метод | Описание |
|-------|----------|
| `fetchServerInfo()` | GET `/info` — capability negotiation |
| `checkHealth()` | GET `/health` — health check |
