# Lava Messenger Web Client — gRPC клиент и стриминг

**Версия:** v0.5.0
**Файл:** `src/shared/api/grpcClient.ts`
**Хуки:** `src/hooks/useGrpcStream.ts`, `src/hooks/useChatMessages.ts`
**Дата:** 2026-06-16

---

## 1. Архитектура gRPC клиента

### Singleton + 3 клиента

```typescript
class GrpcClient {
  private authClient: any = null    // AuthService V2 (JWT)
  private chatClient: any = null    // ChatService (unary + BiDi)
  private profileClient: any = null // ProfileService V2 (JWT)
}
```

### Подключение

```typescript
const getToken = () => useAuthStore.getState().tokens
grpcClient.connect('/messenger', getToken)
```

---

## 2. API клиента

### AuthService V2 (Unary, JWT через interceptor)

| Метод | Описание |
|-------|----------|
| `signInV2(username, password)` | Вход → JWT токены |
| `signUpV2(username, password, email)` | Регистрация |
| `signOut(allDevices)` | Выход |
| `revokeDevice(deviceId)` | Отзыв устройства |

### ProfileService V2 (Unary, JWT — user_id из токена)

| Метод | Описание |
|-------|----------|
| `getProfile()` | Получить профиль (bio, status, locale, avatar) |
| `updateProfile({username?, bio?, status?, locale?})` | Обновить профиль |
| `updateAvatar(avatarUrl, fullAvatarUrl?)` | Обновить аватар |
| `getUserSettings()` | Настройки (locale, theme, push) |
| `updateUserSettings({locale?, themeId?, pushEnabled?})` | Обновить настройки |

### ChatService (Unary)

| Метод | Описание |
|-------|----------|
| `getChats(userId, username)` | Список чатов |
| `getHistory(roomId, limit)` | История сообщений |
| `createDirectChat(user1, user2, user1Id, user2Id)` | Личный чат |
| `createGroupChat(name, participants, creator, creatorId, participantIds)` | Группа |
| `deleteChat(chatId, requesterUsername, requesterUserId)` | Удаление |
| `markRead(roomId, username, userId)` | Прочитано |

### ChatService (BiDi Streaming)

| Метод | Описание |
|-------|----------|
| `openReceiveStream(roomId, callback)` | Приём real-time сообщений |
| `sendMessage(roomId, content, userId)` | Отправка через эфемерный BiDi |

---

## 3. BiDi Chat Stream — архитектура

Серверный `Chat()` — **bidirectional streaming**. Первое сообщение должно содержать `jwt_token`.

### Receive Stream

```
Клиент → Chat (BiDi) → Сервер
  ├── 1-е: { jwt_token, room_id } (auth)
  └── ← broadcast Message[] (real-time)
```

### Send Message (эфемерный стрим)

```
Клиент → Chat (BiDi) → Сервер
  ├── 1-е: { jwt_token, room_id } (auth)
  ├── 2-е: { room_id, text, user_id }
  └── ← echoed Message (сохранённое)
→ abort stream
```

---

## 4. Система сервисов на сервере

| Сервис | Версия | Аутентификация | Методы |
|--------|--------|---------------|--------|
| AuthService | V2 | — | SignInV2, SignUpV2, RefreshToken, SignOut, RevokeDevice |
| ChatService | V1+V2 | JWT interceptor | Все методы чатов |
| ProfileService | V2 | JWT (user_id из токена) | GetProfile, UpdateProfile, UpdateAvatar, GetUserSettings, UpdateUserSettings |

---

## 5. Error Handling + Retry

```typescript
// Auth errors НЕ ретраятся
// Network errors: 3 попытки, baseDelay 500ms
// signIn/SignUp: 2 попытки, baseDelay 1000ms
// sendMessage: 2 попытки, baseDelay 300ms
```

---

## 6. Proto генерация

```bash
cp /root/msg/messenger.proto proto/
npx buf generate --path proto/messenger.proto
```
