# Lava Messenger Web Client — Интеграция с сервером

**Версия:** v0.4.0
**Дата:** 2026-06-14
**Статус:** ✅ Auth V2 работает, gRPC-web proxy настроен на dev сервер

---

## Архитектура gRPC-web подключения

```
Браузер (gRPC-web) → Nginx :80 (/messenger) → Node.js proxy :9090 → gRPC dev сервер :50052
Браузер (SPA) → Nginx :80 (/web) → /root/msg.client.web/dist/
```

---

## Конфигурация

| Компонент | Адрес | Статус |
|-----------|-------|--------|
| Dev сервер gRPC | `127.0.0.1:50052` | ✅ Работает |
| Prod сервер gRPC | `127.0.0.1:50051` | ⬜ Старая версия |
| gRPC-web proxy | `0.0.0.0:9090` | ✅ Работает → dev |
| Веб-клиент SPA | `/web` (Nginx) | ✅ Работает |
| gRPC-web endpoint | `/messenger` (Nginx → 9090) | ✅ Работает |

---

## gRPC-web proxy

**Файл:** `grpc-web-proxy.cjs`
**Сервис:** `grpc-web-proxy.service` (systemd)
**Порт:** 9090

### Поддерживаемые методы

#### AuthService V2
- `SignInV2` — вход (username, password, deviceInfo) → AuthResponseV2
- `SignUpV2` — регистрация (username, password, email, deviceInfo) → AuthResponseV2
- `RefreshToken` — обновление токена → RefreshTokenResponse
- `SignOut` — выход (refreshToken, allDevices) → void
- `RevokeDevice` — отзыв устройства (deviceId) → void
- `GetDevices` — список устройств → GetDevicesResponse

#### ChatService
- `GetChats` — список чатов (username, user_id) → GetChatsResponse
- `GetHistory` — история сообщений (room, limit) → GetHistoryResponse
- `Chat` — bidirectional streaming (SendMessage, ReceiveMessage)
- `CreateDirectChat` — создание личного чата
- `CreateGroupChat` — создание группового чата
- `DeleteChat` — удаление чата
- `MarkRead` — отметить как прочитанное
- `RegisterToken` — регистрация push токена

### Управление

```bash
# Статус
sudo systemctl status grpc-web-proxy

# Перезапуск
sudo systemctl restart grpc-web-proxy

# Логи
sudo journalctl -u grpc-web-proxy -f
```

---

## Nginx configuration

**Файл:** `/etc/nginx/sites-enabled/lavender`

Ключевые location:
```nginx
# Web client (React PWA)
location /web {
    alias /root/msg.client.web/dist;
    try_files $uri $uri/ =404;
    error_page 404 = /web/index.html;
}

# gRPC-web proxy
location /messenger {
    rewrite ^/messenger(/.*)$ $1 break;
    proxy_pass http://127.0.0.1:9090;
    proxy_http_version 1.1;
    proxy_read_timeout 300s;
    # CORS headers...
}
```

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

## Известные проблемы

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

### 426 Upgrade Required
**Причина:** Nginx проксирует на Envoy, а не на Node.js proxy.
**Решение:** Использовать Node.js proxy.

### 502 Bad Gateway
**Причина:** Proxy не запущен или упал.
**Решение:** `sudo systemctl restart grpc-web-proxy`

---

## Сервер — обзор

| Параметр | Dev | Prod |
|----------|-----|------|
| Хост | 13.140.25.249 | 159.195.38.145 |
| gRPC порт | 50052 | 50051 |
| HTTP порт | 8083 | 8081 |
| DB | chat_db_dev | chat_db |
