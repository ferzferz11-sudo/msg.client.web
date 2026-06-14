# Lava Messenger Web Client — Changelog

---

## v0.4.0 (2026-06-14) — i18n + Dev proxy + App rename

### Новое: Мультиязычность (EN/RU)

- **Локализация**: `t()`, `detectLang()` в shared/types
- **Переводы**: appName, loginTitle, signupTitle, usernamePlaceholder, passwordPlaceholder, signIn, signUp, hasAccount, noAccount, connectionError, authError, loading, selectChat, writeMessage, signOut, online, offline, retry
- **Переключатель языка**: кнопка EN/RU в правом верхнем углу
- **Автоопределение**: по navigator.language (ru → РУ, остальное → EN)

### Переименование: Lavender → Lava / Лава

- Название приложения: "Lava" (EN) / "Лава" (RU)
- Логотип 🦞 добавлен к названию
- Обновлены все компоненты: AuthScreen, ChatListScreen (mobile + desktop)

### Переключение на Dev сервер

- gRPC-web proxy → dev сервер (порт 50052)
- systemd unit: GRPC_PORT=50052
- Сервер запущен и работает

---

## v0.3.2 (2026-06-14) — Proxy V2 + Fixes

### Исправлено: gRPC-web proxy не поддерживал V2 методы

- **grpc-web-proxy.cjs** — полная переработка:
  - Добавлены Auth V2 методы: SignInV2, SignUpV2, RefreshToken, SignOut, RevokeDevice, GetDevices
  - Добавлены Chat методы: GetHistory, Chat, CreateDirectChat, CreateGroupChat, DeleteChat, MarkRead, RegisterToken
  - Улучшена обработка ошибок (decode errors → gRPC status 3)
  - Логирование всех методов при старте

### Исправлено: crypto.randomUUID() не работает в старых браузерах

- Добавлен fallback `generateUUID()` через `Math.random()` для браузеров без `crypto.randomUUID`

### Исправлено: права файлов после билда

- `manifest.json`, `sw.js`, `logo.png` — права 644 после билда
- `dist/icons/` — права 755 после билда
- Добавлен postbuild скрипт в package.json

---

## v0.3.1 (2026-06-14) — Error handling + Retry

### Новое: Обработка ошибок

- **errorStore** — Zustand store для глобальных ошибок (max 5, auto-dismiss)
- **Классификация ошибок**: network / auth / rate_limit / server / unknown
- **gRPC error mapping**: UNAUTHENTICATED → auth, UNAVAILABLE → network, RESOURCE_EXHAUSTED → rate_limit
- **Online/offline detection**: window.addEventListener('online'/'offline')
- **Stream error handling**: error callback + error store notification

### Новое: Retry с exponential backoff

- **withRetry()** — утилита для retry с exp. backoff (baseDelay * 2^attempt)
- **getChats**: 3 попытки, baseDelay 500ms
- **getHistory**: 2 попытки, baseDelay 500ms
- **sendMessage**: 2 попытки, baseDelay 300ms
- **signInV2/signUpV2**: 2 попытки, baseDelay 1000ms
- **Неретраемые ошибки**: auth errors не ретраятся

---

## v0.3.0 (2026-06-14) — Desktop UI + Auth V2

### Новое: Desktop UI

- **Двухпанельный layout**: Sidebar (320px) + main area в стиле Telegram Desktop
- **ChatListScreen.desktop**: Управление навигацией внутри компонента
- **ChatList.desktop**: Компактные элементы с hover/active состояниями, бейджами, аватарами
- **ChatScreen.desktop**: Сообщения, textarea с auto-resize, кнопка вложения, хедер с поиском
- **AuthScreen.desktop**: Полноценная форма входа/регистрации V2
- **App.tsx**: Десктоп рендерит ChatListScreen напрямую (без screen-based навигации)

### Новое: AuthService V2 — JWT авторизация

- **JWT токены**: Переход с v1 (UUID token) на v2 (access + refresh JWT)
- **Автоматический refresh**: Access token обновляется автоматически за 5 минут до истечения
- **Token rotation**: Refresh token ротируется при каждом refresh
- **Device management**: При login/signup передаётся device info (deviceId, deviceName, deviceType)
- **SignOut**: Полноценный logout через AuthService.SignOut
- **RevokeDevice**: Возможность отзыва устройств

### Изменено
- `authStore.ts`: `accessToken: string` → `tokens: TokenPair` (access + refresh + expires)
- `grpcClient.ts`: signIn/signUp → signInV2/signUpV2, добавлен refreshToken interceptor
- `AuthScreen`: Вызовы V2 API с device info
- `App.tsx`: Восстановление сессии через refresh token expiry check
- Proto: Синхронизирован с сервером (SignInV2, SignUpV2, RefreshToken, SignOut, RevokeDevice)
- localStorage: `auth_access_token` → `auth_tokens` (JSON с TokenPair)
- ChatList.tsx: Добавлен проп `activeChatId` для desktop highlight

### Безопасность
- Access token TTL: 15 минут
- Refresh token TTL: 30 дней
- При истечении refresh token — автоматический logout
- Device ID генерируется при первом входе и сохраняется в localStorage

---

## v0.2.2 (2026-06-11)

### Ключевые проблемы и решения

#### 1. gRPC-web proxy: "missing trailer" ошибка
**Проблема:** Браузерный gRPC-web клиент (@connectrpc/connect-web) ожидал в ответе HTTP trailer с `grpc-status` и `grpc-message`, но proxy отправлял только данные без trailer.

**Решение:** Добавлен правильный trailer frame в конец ответа:
```javascript
const trailer = 'grpc-status: 0\r\ngrpc-message: OK\r\n';
const trailerFrame = Buffer.alloc(5 + trailer.length);
trailerFrame[0] = 0x80; // trailer marker
trailerFrame.writeUInt32BE(trailer.length, 1);
```

**Урок:** gRPC-web использует специальный framing: 5-byte header (1 byte flags + 4 bytes length) + message. Trailer должен иметь флаг `0x80`.

#### 2. Envoy vs Node.js proxy
**Проблема:** Envoy в Docker контейнере с `--network host` не мог подключиться к gRPC серверу на хосте (127.0.0.1:50052).

**Решение:** Node.js proxy на хосте — проще и надёжнее. Envoy не нужен.

**Урок:** Docker контейнеры даже с host network mode могут иметь проблемы с подключением к хосту. Node.js на хосте — более простое решение.

#### 3. systemd сервис: путь к node
**Проблема:** systemd сервис не запускался — путь `/usr/bin/node` не найден.

**Решение:** Node.js установлен в `/root/.local/bin/node`. Обновлён сервис:
```
ExecStart=/root/.local/bin/node /root/msg.client.web/grpc-web-proxy.cjs
```

**Урок:** Всегда проверять `which node` перед созданием systemd сервиса.

#### 4. GetChats: username vs user_id
**Проблема:** GetChats на сервере ищет чаты по `username` в поле `participants` (JSON массив username), а не по `user_id`.

**Решение:** В `useChats.ts` теперь передаётся `username` из authStore:
```typescript
const userId = user?.id || '';
const username = user?.username || '';
grpcClient.getChats(userId, username);
```

**Урок:** Поле `participants` в БД содержит username (не UUID). GetChats ищет по username.

#### 5. protobufjs для декодирования
**Проблема:** `@grpc/proto-loader` возвращает объекты без метода `decode`.

**Решение:** Используется `protobufjs` напрямую для декодирования запросов и кодирования ответов:
```javascript
const root = protobuf.loadSync(PROTO_PATH);
const SignInRequest = root.lookupType('messenger.SignInRequest');
const request = SignInRequest.decode(message);
```

**Урок:** `@grpc/proto-loader` и `@bufbuild/protobuf` — разные библиотеки с разными API. Для ручного декодирования использовать `protobufjs`.

---

### Добавлено
- **gRPC-web proxy v2**: Правильная конвертация gRPC-web ↔ gRPC с trailer
- **ChatService.GetChats**: Получение списка чатов с сервера
- **ChatService.GetHistory**: Получение истории сообщений
- **ChatService.CreateDirectChat**: Создание личного чата
- **systemd сервис**: `grpc-web-proxy.service` с автозапуском

### Исправлено
- Вход в систему работает корректно
- Список чатов загружается с сервера

---

## v0.2.1 (2026-06-11)

### Добавлено
- **AuthService интеграция**: веб-клиент подключён к реальному AuthService на сервере
- **Proto синхронизация**: messenger.proto обновлён с сервера
- **gRPC-web proxy**: Nginx проксирует `/messenger` → proxy (9090) → gRPC сервер (50052)
- **Production деплой**: веб-клиент доступен через `/web` на сервере

### Изменёнено
- grpcClient теперь использует относительный путь `/messenger`
- AuthScreen упрощён — убрано поле serverAddress
- authStore обновлён — убраны поля refreshToken

---

## v0.2.0 (2026-06-10)
...

## v0.1.0 (2026-06-10)
...
