# Lavender Messenger Web Client — Changelog

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
