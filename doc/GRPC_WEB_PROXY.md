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
Браузер → Nginx :80 (/messenger) → Node.js proxy :9090 → gRPC сервер :50052
```

### Почему не Envoy?

Envoy в Docker контейнере не мог подключиться к gRPC серверу на хосте (127.0.0.1:50052). Node.js на хосте работает надёжнее.

---

## Управление

```bash
# Статус
sudo systemctl status grpc-web-proxy

# Запуск / остановка / перезапуск
sudo systemctl start grpc-web-proxy
sudo systemctl stop grpc-web-proxy
sudo systemctl restart grpc-web-proxy

# Логи
sudo journalctl -u grpc-web-proxy -f

# Автозапуск
sudo systemctl enable grpc-web-proxy
```

---

## Конфигурация

```javascript
// grpc-web-proxy.cjs
const GRPC_HOST = '127.0.0.1';
const GRPC_PORT = 50052;  // dev сервер
const PROXY_PORT = 9090;
```

---

## Зависимости

```bash
npm install @grpc/grpc-js @grpc/proto-loader --legacy-peer-deps
```

---

## Отладка

### Проверка что proxy работает

```bash
curl -X POST http://127.0.0.1:9090/messenger.AuthService/SignIn \
  -H "Content-Type: application/grpc-web+proto"
```

Ожидаемый ответ: 400 (пустой body) или 200 (с данными).

### Проверка что Nginx проксирует

```bash
curl -X POST http://127.0.0.1/messenger/messenger.AuthService/SignIn \
  -H "Content-Type: application/grpc-web+proto"
```

### Логи proxy

```bash
sudo journalctl -u grpc-web-proxy --no-pager -n 50
```

---

## Типичные ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| 426 Upgrade Required | Nginx проксирует на Envoy, а не на Node.js proxy | Проверить `proxy_pass` в Nginx |
| 502 Bad Gateway | Proxy не запущен | `sudo systemctl start grpc-web-proxy` |
| 400 Bad Request | Неправильный gRPC-web framing | Проверить что браузер отправляет правильный запрос |
| missing trailer | gRPC-web framing не конвертируется | Проверить версию proxy |

---

## Схема потока данных

```
┌─────────────────────────────────────────────────────────────────┐
│ Браузер                                                        │
│  gRPC-web клиент (@connectrpc/connect-web)                      │
│  HTTP/1.1 POST /messenger/messenger.AuthService/SignIn          │
│  Content-Type: application/grpc-web+proto                       │
│  Body: [5-byte framing] + protobuf message                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Nginx :80                                                       │
│  location /messenger {                                          │
│    rewrite ^/messenger(/.*)$ $1 break;                          │
│    proxy_pass http://127.0.0.1:9090;                            │
│  }                                                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Node.js gRPC-web Proxy :9090                                    │
│  1. Парсит gRPC-web framing (5-byte header + message)           │
│  2. Декодирует protobuf через @grpc/proto-loader                │
│  3. Вызывает gRPC метод через @grpc/grpc-js                     │
│  4. Кодирует ответ обратно в gRPC-web framing                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ gRPC Сервер :50052                                              │
│  AuthService.SignIn / AuthService.SignUp                        │
│  HTTP/2 + protobuf                                              │
└─────────────────────────────────────────────────────────────────┘
```
