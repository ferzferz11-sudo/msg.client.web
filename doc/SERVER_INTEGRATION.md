# Lavender Messenger Web Client — Интеграция с сервером

Документация по интеграции веб-клиента с сервером Lavender Messenger.

**Дата:** 2026-06-11
**Статус:** AuthService интегрирован, gRPC-web proxy настроен

---

## Архитектура gRPC-web подключения

```
Браузер (gRPC-web) → Nginx :80 (/messenger) → Node.js proxy :9090 → gRPC сервер :50052
```

### Почему не Envoy?

Изначально использовался Envoy в Docker контейнере с grpc_web filter, но возникли проблемы:
- Envoy в контейнере с `--network host` не мог подключиться к gRPC серверу на 127.0.0.1:50052
- SELinux/AppArmor или iptables блокировали подключение из контейнера

Решение: Node.js proxy на хосте — проще и надёжнее.

---

## gRPC-web proxy

**Файл:** `grpc-web-proxy.cjs` — Node.js прокси для конвертации gRPC-web ↔ gRPC

**Сервис:** `grpc-web-proxy.service` (systemd)

**Управление:**
```bash
# Запуск
sudo systemctl start grpc-web-proxy

# Остановка
sudo systemctl stop grpc-web-proxy

# Перезапуск
sudo systemctl restart grpc-web-proxy

# Логи
sudo journalctl -u grpc-web-proxy -f
```

**Подключение:**
- `Nginx :80 /messenger` → `Node.js proxy :9090`
- `Node.js proxy` → `gRPC сервер :50052` (dev) через @grpc/grpc-js

**Proto:** `proto/messenger.proto` загружается через @grpc/proto-loader

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

## Переменные окружения

**gRPC сервер:**
- Dev: `127.0.0.1:50052`
- Prod: `127.0.0.1:50051`

**gRPC-web proxy:** `0.0.0.0:9090`

---

## Зависимости

```bash
npm install @grpc/grpc-js @grpc/proto-loader --legacy-peer-deps
```

---

## Известные проблемы

1. **426 Upgrade Required** — возникает если Nginx проксирует на Envoy, а не на Node.js proxy
2. **502 Bad Gateway** — возникает если proxy не запущен или упал

---

## Сервер — обзор

| Параметр | Dev | Prod |
|----------|-----|------|
| Хост | 13.140.25.249 | 159.195.38.145 |
| gRPC порт | 50052 | 50051 |
| HTTP порт | 8083 | 8081 |
| DB | chat_db_dev | chat_db |
