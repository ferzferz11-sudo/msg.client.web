# Prompt: Next Session — E2EE Secret Chat UI + Testing

**Client:** v0.1.9.0 | **Date:** 2026-06-28 | **Status:** Reactions, auth, logout fixed

---

## Выполнено в этой сессии (v0.1.8.0–v0.1.9.0)

- ✅ Реакции: `BroadcastV2Reaction` на сервере + обработка `REACTION_V2` в ChatV2 stream + `toggleReaction` обновляет локальное состояние
- ✅ Auth interceptor: очередь `refreshWaiters[]` для concurrent запросов при рефреше токена
- ✅ Logout: всегда работает (try/catch + disconnect + reload)
- ✅ Логотип "Лава": клик = `window.location.reload()` (интерсептор рефрешит токен)
- ✅ Удаление сообщений: убраны проверки `[deleted]` — сервер физически удаляет записи
- ✅ Service Worker: кеш `msg-v3` для force update

---

## Новая фича: Admin Panel (Priority 1)

### Цель
Панель администратора для просмотра списка пользователей (как на Android в `SuperAdminActivity`).

### Реализация

#### 1. Доступ
- Проверка `isSuperAdmin` в профиле пользователя
- Кнопка "Админ" в настройках/меню (только для superAdmin)

#### 2. Экран AdminPanel
- Список пользователей с cursor-based пагинацией
- Информация: username, avatar, email, isSuperAdmin, lastClientVersion, lastSeenAt, isOnline, lastMessageText, lastMessageTime, chatCount
- Поиск по username/email
- Сортировка: lastSeenAt, username, chatCount
- Клик на пользователя → профиль модалка

#### 3. Файлы для создания
- `src/components/admin/AdminPanel.tsx` — основной экран
- `src/components/admin/AdminUserCard.tsx` — карточка пользователя
- `src/hooks/useAdminUsers.ts` — хук для загрузки данных

#### 4. API
- `grpcClient.getAdminUserList(query, cursor, limit, sortBy)` — уже реализован на сервере

---

## Новая фича: E2EE Secret Chat UI (Priority 2)

### Цель
Полный UI flow для end-to-end encrypted secret chats с обменом ключами.

### Реализация

#### 1. Secret Chat Creation Flow
- В модалке нового чата добавить 🔐 кнопку рядом с каждым пользователем
- Клик по 🔐 создаёт secret chat + генерирует RSA keypair
- Публичный ключ отправляется на сервер через `exchangeSecretKey`

#### 2. Key Exchange UI
- `SecretChatScreen` показывает прогресс обмена ключами:
  - Ожидание публичного ключа пира
  - Ключ получен → общий AES ключ derived
  - Готов к чату
- Индикаторы: 🔒 Ожидание / 🔓 Готов

#### 3. Encrypted Messaging
- Сообщения шифруются AES-GCM перед отправкой
- Сообщения расшифровываются при получении/загрузке
- E2EE badge на сообщениях в секретных чатах

#### 4. Файлы для изменения
- `src/components/secretChats/SecretChatScreen.tsx` — UI обмена ключами
- `src/components/chat/ChatScreen.tsx` — E2EE режим
- `src/hooks/useChatMessages.ts` — pipeline шифрования/дешифрования

---

## Testing Checklist (Priority 2)

Проверить все фичи v0.1.5.0–v0.1.9.0 на https://13.140.25.249/web/:

### Реакции
- [ ] Клик на сообщение → контекстное меню → "Реакция" → пикер эмодзи
- [ ] Выбрать эмодзи → реакция появляется под сообщением
- [ ] Реакция видна другим пользователям в реальном времени

### Auth
- [ ] Токен протух → автоматический рефреш без ошибок
- [ ] Несколько запросов одновременно → все ждут рефреша иucceed
- [ ] Клик на "Лава" → страница перезагружается
- [ ] Logout → всегда работает

### Загрузка
- [ ] Список чатов загружается
- [ ] Сообщения загружаются в чате
- [ ] Старые сообщения подгружаются при скролле вверх

### Multi-Agent AI Chat
- [ ] Click 🔀 in agent panel → multi-select mode
- [ ] Select 2+ agents → parallel streaming
- [ ] Tab bar shows agent status

### Error Toasts
- [ ] Network error → toast appears
- [ ] Auto-dismiss after 5s
- [ ] Max 3 toasts visible

---

## Architecture Notes

### Auth Interceptor (с очередью)
```
Request → isExpired?
  → Yes → isRefreshing?
    → Yes → wait in refreshWaiters[]
    → No → refreshToken() → resolve waiters
  → No → proceed with token
```

### Reactions Flow
```
setReactionV2 → server saves JSONB → returns { success, reactions }
                                    → Broadcast() → v1 WebSocket
                                    → BroadcastV2Reaction() → ChatV2 stream
Client: toggleReaction → updateMessage(reactions) → UI updates
Stream: REACTION_V2 → reaction_update → updateMessage
```

### Testing
```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```
- Framework: Vitest + @testing-library/react
- Setup: `src/test/setup.ts`
- Test files: `*.test.ts(x)` colocated with source
