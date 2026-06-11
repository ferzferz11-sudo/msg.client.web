# gRPC-web Proxy — Архитектура и настройка

**Файл:** `grpc-web-proxy.cjs`
**Сервис:** `grpc-web-proxy.service` (systemd)
**Порт:** 9090

---

## Проблема

Браузер использует gRPC-web (HTTP/1.1), а сервер — чистый gRPC (HTTP/2). Нужен прокси для конвертации.

---

## Решение

Node.js прокси на хосте (не в Docker):

```
Браузер → Nginx :80 (/messenger) → Node.js proxy :9090 → gRPC сервер :50051 (prod)
```

**Важно:** Prod сервер на порту 50051, dev — 50052. По умолчанию proxy использует prod.

### Почему не Envoy?

Envoy в Docker контейнере не мог подключиться к gRPC серверу на хосте (127.0.0.1:50052). Node.js на хосте работает надёжнее.

---

## Поддерживаемые методы

### AuthService
- `SignIn` — вход (username, password) → AuthResponse
- `SignUp` — регистрация (username, password, email) → AuthResponse

### ChatService
- `GetChats` — список чатов (GetChatsRequest: username, user_id) → GetChatsResponse
- `GetHistory` — история сообщений (GetHistoryRequest: room, limit) → GetHistoryResponse
- `CreateDirectChat` — создание чата (CreateDirectChatRequest) → CreateDirectChatResponse

---

## gRPC-web framing

```
[compressed flag (1 byte)] [message length (4 bytes)] [message]
```

Trailer frame (в конце ответа):
```
[0x80 (trailer flag)] [length (4 bytes)] ["grpc-status: 0\r\ngrpc-message: OK\r\n"]
```

**Важно:** Браузерный gRPC-web клиент ожидает trailer с `grpc-status`. Без него ошибка "missing trailer".

---

## Proto

Используется `protobufjs` для ручного декодирования/кодирования:
```javascript
const root = protobuf.loadSync(PROTO_PATH);
const SignInRequest = root.lookupType('messenger.SignInRequest');
const request = SignInRequest.decode(message);
```

**Важно:** `@grpc/proto-loader` и `@bufbuild/protobuf` — разные библиотеки. Для ручного декодирования использовать `protobufjs`.

---

## Управление

```bash
# Статус
sudo systemctl status grpc-web-proxy

# Перезапуск
sudo systemctl restart grpc-web-proxy

# Логи
sudo journalctl -u grpc-web-proxy -f
```

---

## Известные проблемы и решения

### "missing trailer"
**Причина:** Proxy не отправлял trailer с `grpc-status`.
**Решение:** Добавлен trailer frame в конец каждого ответа.

### "user not found" при входе
**Причина:** Пользователь не зарегистрирован в БД.
**Решение:** Сначала зарегистрировать через SignUp.

### GetChats возвращает пустой список
**Причина:** GetChats ищет чаты по `username` в поле `participants` (JSON массив username), а не по `user_id`.
**Решение:** Передавать `username` из authStore в `useChats.ts`.

### systemd сервис не запускался
**Причина:** Путь `/usr/bin/node` не найден.
**Решение:** Node.js в `/root/.local/bin/node`.

---

## Nginx configuration

```nginx
location /messenger {
    rewrite ^/messenger(/.*)$ $1 break;
    proxy_pass http://127.0.0.1:9090;
    proxy_http_version 1.1;
    proxy_read_timeout 300s;
    # CORS headers...
}
```
