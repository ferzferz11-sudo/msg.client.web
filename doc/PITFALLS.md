# Lavender Messenger Web Client — Подводные камни

Известные проблемы и важные заметки при разработке веб-клиента.

**Дата:** 2026-06-10

---

## iOS Safari

### Клавиатура перекрывает input

**Проблема:** на iOS при открытии клавиатуры `window.innerHeight` не меняется, но `visualViewport.height` уменьшается.

**Решение:** `useIOSKeyboard` hook использует `window.visualViewport` API. CSS переменная `--keyboard-height` обновляется автоматически.

**Pitfall:** `visualViewport` не поддерживается в Safari < 13. Graceful degradation — используем `window.innerHeight` как fallback.

### Зум на input focus

**Проблема:** Safari зумит страницу если `font-size < 16px` на input.

**Решение:** `font-size: 16px !important` на всех input/textarea/select. Двойная страховка через `@supports (-webkit-touch-callout: none)`.

### Bounce scroll

**Проблема:** при скролле за пределы контента — "отскок" (bounce). Выглядит не как нативное приложение.

**Решение:** `overflow: hidden; position: fixed` на html и body. `overscroll-behavior: none`.

**Pitfall:** внутри `.scrollable` контейнеров bounce разрешён через `-webkit-overflow-scrolling: touch`.

### Background streams убивают батарею

**Проблема:** когда Safari в бэкграунде, gRPC стримы продолжают работать.

**Решение:** `useGrpcStream` слушает `visibilitychange`, `pagehide`, `pageshow`. При уходе в бэкграунд — `AbortController.abort()`.

**Pitfall:** `setTimeout` в бэкграунде замедляется iOS. Нельзя полагаться на таймеры для критичной логики.

### 300ms delay на tap

**Проблема:** на старых iOS был 300ms delay перед click для определения double-tap.

**Решение:** `width=device-width` в viewport meta убирает этот delay. Актуально для iOS < 13.

---

## gRPC и сеть

### grpc-web ограничения

**Проблема:** grpc-web НЕ поддерживает bidirectional streaming в браузере.

**Решение:** используем server streaming + unary calls. Для bidirectional нужен WebSocket fallback.

### CORS

**Проблема:** сервер Lavender не настроен для CORS из коробки.

**Решение:** Nginx reverse proxy с CORS headers или Envoy proxy с `cors` filter.

### Proto field numbers

**Проблема:** номера полей proto на клиенте должны совпадать с сервером.

**Решение:** использовать один `.proto` файл для генерации клиентского и серверного кода.

**Pitfall:** никогда не менять номера полей — ломает обратную совместимость.

---

## React и State

### Лишние re-renders при стриминге

**Проблема:** каждый чанк AI ответа = обновление state = re-render.

**Решение:** Zustand store обновляется по сообщениям (не по чанкам). Debounce UI updates если нужно.

### Гонка данных при быстром переключении чатов

**Проблема:** при быстром переключении чатов, ответ от старого чата может прийти после открытия нового.

**Решение:** `chatIdRef` в `useChatMessages` — проверка актуальности перед обновлением store.

### Normalized store — ручная синхронизация

**Проблема:** при нормализованном store нужно вручную синхронизировать `messages` и `chatMessages`.

**Решение:** все обновления через store actions (`addMessage`, `setMessages`), никогда напрямую.

---

## Сборка и деплой

### Vite + Node.js версия

**Проблема:** Vite 5.4+ требует Node.js 18+. На сервере Node 22 — OK.

**Pitfall:** `@vitejs/plugin-react` может конфликтовать с версией Vite. Использовать совместимые версии.

### Environment variables

**Проблема:** Vite использует `import.meta.env.VITE_*` — значения попадают в бандл.

**Решение:** НЕ хранить секреты в env vars. Серверный адрес — через env var (меняется при деплое).

### Path aliases

**Проблема:** `@/` работает в Vite, но TypeScript не резолвит без `tsconfig.json` paths.

**Решение:** дублировать paths в `tsconfig.json` и `vite.config.ts`.

---

## Безопасность

### XSS через сообщения

**Проблема:** React экранирует по умолчанию, но `dangerouslySetInnerHTML` — опасен.

**Решение:** никогда не использовать `dangerouslySetInnerHTML` для user content. Markdown в AI ответах — через sanitized renderer.

### Credentials в браузере

**Проблема:** localStorage доступен любому JS на странице (XSS).

**Решение:** ключ шифрования E2EE — только в памяти, не сохранять. Credentials — в HttpOnly cookies.

### Content Security Policy

**Нужно:** настроить CSP headers. Запрет inline scripts, eval, etc.
