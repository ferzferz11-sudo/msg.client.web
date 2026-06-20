# Session Notes — v0.6.0

## 2026-06-18/19 — Адаптация к серверу v1.2.0.7

### Критическая несовместимость AuthResponseV2

Сервер v1.2.0.7 возвращает другие поля в AuthResponseV2:
- `expiresAt` (единое) вместо `accessExpiresAt` + `refreshExpiresAt`
- `userId` + `username` (плоские) вместо `user` объекта
- `access_token`, `refresh_token` (snake_case) вместо camelCase

Также SignInV2 запрос:
- `device.platform` вместо `device.deviceType`
- Нет поля `clientVersion`

### Исправления внесены

- grpcClient.ts: signInV2, signUpV2 — правильные имена полей
- AuthScreen.mobile.tsx, AuthScreen.desktop.tsx: `result.expiresAt`, убрана проверка `result.user`
- proto: deviceType → platform, clientVersion убран

### Проблема с vite билдом

Новые экраны (ProfileScreen и др.) не включаются в бандл когда импортируют `Screen` из `@/components/common`. Причина — конфликт с lazy loading в Screen.tsx.

Решение: новые экраны должны использовать обычный div вместо Screen, или Screen.tsx нужно переписать без lazy loading.

### gRPC-web proxy

Обновлён со всеми новыми методами. Запущен через systemd.

### Файлы изменены

- `src/shared/api/grpcClient.ts` — signInV2, signUpV2, RefreshToken
- `src/components/auth/AuthScreen.mobile.tsx` — auth check fix
- `src/components/auth/AuthScreen.desktop.tsx` — auth check fix
- `grpc-web-proxy.cjs` — все новые методы
- `proto/messenger.proto` — обновлён с сервера
- `src/shared/types/index.ts` — новые поля Chat
- Новые хуки: useChatListV2, usePinnedMessages, useNotifications, useAIChats, useProfile, useContacts, useDevices
- Новые экраны: ProfileScreen, SettingsScreen, ContactsScreen, SearchScreen, ArchiveScreen, PinnedMessagesScreen, AIChatsScreen, NotificationsScreen
- `package.json` — version 0.6.0
- `doc/CHANGELOG.md` — обновлён

### Тестирование

- Вход работает с правильными полями
- gRPC-web proxy запущен и отвечает
- Новые экраны НЕ подключены к App.tsx (проблема с vite)
