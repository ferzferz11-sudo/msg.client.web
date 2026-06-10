# Lavender Messenger Web Client — Соответствие Android-клиенту

Функциональное соответствие веб-клиента Android-клиенту.

**Дата:** 2026-06-10
**Android версия (база):** v1.1.2.7
**Web версия:** v0.1.0

---

## Статус реализации

| Функция | Android | Web | Статус |
|---------|---------|-----|--------|
| Список чатов | ChatListActivity | ChatListScreen | ✅ |
| Личные чаты | NewChatActivity | ChatScreen | ✅ |
| Групповые чаты | NewChatActivity | ChatScreen | ❌ |
| Отправка сообщений | gRPC SendMessage | gRPC SendMessage | ✅ (mock) |
| Real-time получение | SubscribeChat | useGrpcStream | ✅ (mock) |
| Удаление чата | DeleteChat | — | ❌ |
| OWL AI чат | OwlChatActivity | — | ❌ |
| Hermes чат | HermesChatActivity | — | ❌ |
| AI Bottom Sheet | AIBottom Sheet | — | ❌ |
| Настройки AI | OwlSettingsActivity | — | ❌ |
| Rate limit indicator | Toolbar counter | — | ❌ |
| Контакты | ContactsFragment | — | ❌ |
| Профиль | ProfileActivity | — | ❌ |
| Темы | ThemeStore | — | ❌ |
| E2EE | E2EEManager | — | ❌ |
| Push | FCM | — | ❌ |

---

## Компоненты Android → Web

### View → Component

| Android | Web | Примечание |
|---------|-----|-----------|
| ChatListActivity | ChatListScreen | Главный экран |
| activity_chat.xml | ChatScreen | Окно чата |
| OwlChatActivity | — (планируется) | OWL AI |
| HermesChatActivity | — (планируется) | Hermes |
| AIBottom Sheet | — (планируется) | Быстрый доступ к AI |

### ViewModel → Store/Hook

| Android | Web |
|---------|-----|
| ChatListStore | useChatStore + useChats |
| ChatViewModel | useChatStore + useChatMessages |
| OwlChatViewModel | — |
| HermesChatViewModel | — |

### gRPC клиент

| Android | Web |
|---------|-----|
| RealGrpcClient | grpcClient (singleton) |
| GrpcClient (facade) | — (прямой доступ к singleton) |
| OwlGrpc | — (в grpcClient) |
| HermesGrpc | — (в grpcClient) |
| AiChatGrpc | — (в grpcClient) |

---

## Различия от Android

### Что НЕ нужно в веб-клиенте
- Room DB → localStorage/IndexedDB
- Firebase → Web Push API
- WebRTC звонки → пока не реализуем
- SplashScreen → loading state
- System UI (status bar) → не применимо
- Notification channels → Web Push permissions

### Что проще в веб-клиенте
- Обновления: деплой на сервер → сразу у всех
- Нет версии APK / versionCode
- Haptic feedback → не применимо
- Intent system → URL routing

### Что сложнее в веб-клиенте
- gRPC через grpc-web (нужен Envoy proxy)
- E2EE через WebCrypto (менее проверено)
- Background sync (Service Workers)
- Offline mode (Service Workers + IndexedDB)
