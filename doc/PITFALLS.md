# Lavender Messenger Web Client — Подводные камни

Известные проблемы и важные заметки при разработке веб-клиента.

**Дата:** 2026-06-10

---

## gRPC и сеть

### grpc-web ограничения
- grpc-web НЕ поддерживает bidirectional streaming в браузере (только server streaming)
- Для `SubscribeChat` (server streaming) — работает
- Для bidirectional — нужен WebSocket fallback или Envoy proxy
- **Решение:** использовать grpc-web с Envoy proxy для unary + server streaming

### CORS
- Сервер Lavender не настроен для CORS из коробки
- **Нужно:** добавить CORS headers на сервере или использовать reverse proxy (Nginx)

### Credentials в браузере
- Нельзя хранить секреты в браузере надёжно
- localStorage доступен любому JS на странице (XSS)
- **Решение:** использовать HttpOnly cookies для токенов, localStorage только для нечувствительных данных
- Ключ шифрования E2EE — в памяти, не сохранять

---

## Аутентификация

### Нет Firebase Auth
- Android использует свою систему (credential store)
- Веб-клиент должен реализовать аналогичную систему
- Серверный адрес + ключ → localStorage

### Сессии
- Нет аналога Android SessionManager
- **Решение:** JWT токен или долгоживущий credential в HttpOnly cookie

---

## E2EE

### WebCrypto API
- ECDH (secp256r1) — поддерживается в WebCrypto
- AES-256-GCM — поддерживается
- **НО:** ключи нужно хранить в памяти, не в localStorage
- При закрытии вкладки — ключи теряются (нужна пере-аутентификация)

### Protobuf в браузере
- protobuf-js или google-protobuf для JS
- Типы генерируются из .proto файлов
- **Pitfall:** номера полей proto должны совпадать с сервером
- Никогда не менять номера полей — ломает обратную совместимость

---

## Производительность

### Virtual scrolling
- Список чатов и сообщений может быть большим
- **Нужно:** виртуализация списков (react-window / vue-virtual-scroller)
- Без виртуализации — лаг при 1000+ элементах

### Streaming AI ответов
- grpc-web server streaming работает через HTTP/1.1 chunked encoding
- **Pitfall:** некоторые прокси/балансировщики буферизируют chunked responses
- **Решение:** Nginx с `proxy_buffering off` для streaming endpoints

### Re-renders
- React: избегать лишних re-renders при стриминге (каждый чанк = обновление state)
- **Решение:** debounce UI updates или batch updates

---

## Безопасность

### XSS
- Сообщения от пользователей — всегда экранировать
- React экранирует по умолчанию, но `dangerouslySetInnerHTML` — никогда для user content
- Markdown в AI ответах — использовать sanitized markdown renderer

### CSRF
- gRPC через grpc-web — каждый запрос должен включать credential
- **Решение:** CSRF token или SameSite cookies

### Content Security Policy
- Нужно настроить CSP headers
- Запрет inline scripts, eval, etc.

---

## Совместимость с сервером

### Proto field numbers
- **КРИТИЧНО:** номера полей proto на клиенте должны совпадать с сервером
- Сервер: `/root/msg/messenger.proto`
- При изменении proto на сервере — нужно перегенерировать клиентские типы

### Deprecated RPC
- `ChatWithOWL`, `ChatWithOrchestrator` — deprecated, но работают
- Веб-клиент должен использовать `ChatWithAI` (единый RPC)
- Старые RPC могут быть удалены в будущих версиях

### Rate limiting
- Сервер считает запросы по user_id
- Веб-клиент должен показывать remaining/limit пользователю
- При исчерпании — блокировать отправку с сообщением

---

## Темы и стили

### CSS переменные
- Использовать CSS custom properties для тем
- Переключение темы = смена набора переменных
- **Pitflash:** `color-scheme` влияет на нативные элементы (scrollbars, inputs)

### Material Design 3
- Material Web Components (MWC) — могут быть тяжёлыми
- Альтернатива: собственная реализация на CSS + минимальный JS
- **Решение:** начать с простых компонентов, при необходимости — MWC

---

## Сборка и деплой

### Vite
- Dev server с HMR для быстрой разработки
- Production build — статические файлы
- **Деплой:** скопировать dist/ на сервер в /var/www/ или аналогичный путь

### Environment variables
- Vite использует `import.meta.env.VITE_*` для env vars
- НЕ хранить секреты в env vars — они попадают в бандл
- Серверный адрес — через env var (меняется при деплое)
