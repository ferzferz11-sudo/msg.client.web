# Деплой

## deploy.sh

Скрипт `deploy.sh` в корне проекта. Запуск:

```bash
./deploy.sh
```

Делает:
1. `npm run build` — production build (tsc + vite build)
2. `rsync` dist/ на сервер (`lava:/root/msg.client.web/dist/`)
3. `nginx -t && systemctl reload nginx`
4. Пересоздаёт envoy контейнер (rm + docker run)

## Сервер

SSH алиас: `lava` (root@13.140.25.249, ключ `~/.ssh/lava`)

### Envoy (gRPC-web прокси)

```bash
# Перезапуск
ssh lava "sudo docker rm -f envoy-grpc-web && sudo docker run -d --name envoy-grpc-web --network host -v /root/msg.client.web/envoy.yaml:/etc/envoy/envoy.yaml:ro envoyproxy/envoy:v1.31-latest"

# Логи
ssh lava "sudo docker logs envoy-grpc-web --tail 20"

# Проверка порта
ssh lava "sudo ss -tlnp | grep 9090"
```

Envoy: порт 9090 → gRPC backend 50051 (prod), 50052 (dev).

### Nginx

```bash
# Конфиг
ssh lava "cat /etc/nginx/sites-enabled/lavender"

# Релоад
ssh lava "sudo nginx -t && sudo systemctl reload nginx"
```

Маршруты:
- `/` → `/var/www/lavender/` (landing page)
- `/web/` → `/root/msg.client.web/dist/` (web client)
- `/messenger/` → envoy:9090 (gRPC-web)
- `/info`, `/health` → 127.0.0.1:8082 (HTTP API)
- `/files/` → 127.0.0.1:8082 (file server)
- `/avatars/`, `/images/`, `/audio/` → 127.0.0.1:8082

### Landing Page

```bash
# Редактирование
ssh lava "vim /var/www/lavender/index.html"

# Версии
ssh lava "cat /var/www/lavender/version.txt"
```

### Lavender Server

```bash
# Статус
ssh lava "sudo systemctl status lavender-server"

# Перезапуск
ssh lava "sudo systemctl restart lavender-server"

# Логи
ssh lava "sudo journalctl -u lavender-server -f"
```

### Database

```bash
# Prod: chat_db (user paveld)
ssh lava "sudo -u postgres psql -d chat_db -c 'SELECT count(*) FROM users;'"

# Dev: chat_db_dev (user lavender)
ssh lava "sudo -u postgres psql -d chat_db_dev -c 'SELECT count(*) FROM users;'"

# Пустые сообщения (проверка после fix)
ssh lava "sudo -u postgres psql -d chat_db -c \"SELECT id, room_id, created_at FROM messages_v2 WHERE content_type='text' AND text='' ORDER BY created_at DESC LIMIT 10;\""
```

## Proto генерация

```bash
# ⚠️ npm run proto:generate падает из-за node_modules protobuf ошибок
# Используй:
npx buf generate --path proto/messenger.proto
```

Генерирует `src/shared/api/gen/proto/messenger_pb.ts` и `messenger_connect.ts`.

**Важно**: после генерации проверять `messenger_connect.ts` — protoc-gen-connect-es может схлопнуть дублирующие RPC (например GetChats/GetChatsV2) и оставить имя первого. Если сервер реализует только V2, нужно вручную поправить `name` поле.

## Известные проблемы

1. **envoy падает** — порт 9090 занят. Решение: `docker rm -f` перед запуском.
2. **envoy не видит конфиг** — файл envoy.yaml имеет права 600. Решение: `chmod 644`.
3. **415 на /info** — `/info` это HTTP, не gRPC. Нужен nginx прокси на 8082.
4. **GetChats not implemented** — сервер реализует только GetChatsV2. Исправлять в messenger_connect.ts.
5. **SendMessageV2 пустые сообщения** — oneof content не сериализуется при `any` типе. Использовать `new SendMessageV2Request({ content: { case: 'text', value } })`.
