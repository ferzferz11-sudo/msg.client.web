# Lavender Messenger Web Client — Соответствие Android-клиенту

Функциональное соответствие веб-клиента Android-клиенту.

**Дата:** 2026-06-10
**Android версия (база):** v1.1.2.7

---

## Функциональность Android → Web

### Чат-система

| Функция | Android | Web | Примечание |
|---------|---------|-----|-----------|
| Список чатов | ChatListActivity | ChatList view | Главный экран |
| Личные чаты | NewChatActivity | ChatView | 1-on-1 сообщения |
| Групповые чаты | NewChatActivity | ChatView | Группы |
| Отправка сообщений | gRPC SendMessage | gRPC SendMessage | Тот же RPC |
| Получение в реальном времени | SubscribeChat stream | SubscribeChat stream | Real-time |
| Удаление чата | Swipe/Menu → DeleteChat | Context menu → DeleteChat | Каскадное удаление |
| Редактирование сообщений | Long press → Edit | Context menu → Edit | |
| Реакции | Emoji reactions | Emoji reactions | |
| Reply (ответ на сообщение) | Swipe → Reply | Click → Reply | |
| Forward | Menu → Forward | Context menu → Forward | |
| Поиск по сообщениям | SearchView | Search bar | ILIKE по БД |

### AI чаты

| Функция | Android | Web | Примечание |
|---------|---------|-----|-----------|
| OWL AI чат | OwlChatActivity | AIChatView (type=owl) | Стриминг ответов |
| Hermes чат | HermesChatActivity | AIChatView (type=hermes) | Оркестратор |
| AI Bottom Sheet | AIBottom Sheet | AI панель | Быстрый доступ |
| Настройки AI | OwlSettingsActivity | AISettings panel | API key, model |
| История AI | GetOwlHistory / GetOrchestratorHistory | GetAIChatHistory | Единый RPC |
| Rate limit indicator | Toolbar counter | Header counter | remaining/limit |
| Стриминг ответов | gRPC server streaming | grpc-web streaming | AIChatResponse |

### Контакты и профиль

| Функция | Android | Web | Примечание |
|---------|---------|-----|-----------|
| Список контактов | ContactsFragment | ContactsView | |
| Добавление контакта | AddContactActivity | AddContact panel | |
| Профиль пользователя | ProfileActivity | ProfileView | |
| Аватар | ImageView + upload | Avatar component | HTTP upload |
| Статус онлайн | Presence indicator | Online badge | |

### Настройки

| Функция | Android | Web | Примечание |
|---------|---------|-----|-----------|
| Темы оформления | ThemeStore + ThemeApplier | CSS variables + theme switcher | Material Design 3 |
| Кастомные темы | AddThemeActivity | Theme editor | |
| Настройки сервера | SettingsActivity | ServerSettings | Адрес, порт |
| Уведомления | FCM push | Web Push API | |
| Язык | RU/EN | RU/EN | i18n |

### E2EE (секретные чаты)

| Функция | Android | Web | Примечание |
|---------|---------|-----|-----------|
| ECDH обмен ключами | E2EEManager | WebCrypto API | secp256r1 |
| AES-256-GCM | E2EEManager | WebCrypto API | |
| Индикатор E2EE | Lock icon | Lock icon | |

---

## Компоненты Android → Web аналоги

### Layouts → Components

| Android Layout | Web Component |
|----------------|--------------|
| ChatListActivity | `<ChatListView>` |
| activity_chat.xml | `<ChatView>` |
| widget_chat.xml | `<ChatWidget>` |
| OwlChatActivity | `<AIChatView type="owl">` |
| HermesChatActivity | `<ChatView type="hermes">` |
| AIBottom Sheet | `<AIPanel>` |
| item_chat_message.xml | `<ChatMessage>` |
| activity_settings.xml | `<SettingsView>` |

### Adapters → Lists

| Android Adapter | Web Equivalent |
|----------------|---------------|
| ChatAdapter | Virtualized chat list |
| ChatMessageAdapter | Virtualized message list |
| MentionAgentAdapter | Agent mention popup |
| MentionUserAdapter | User mention popup |

### ViewModels → Stores

| Android ViewModel | Web Store |
|-------------------|----------|
| ChatListViewModel | `chatListStore` |
| ChatViewModel | `chatStore` |
| OwlChatViewModel | `aiChatStore(type=owl)` |
| HermesChatViewModel | `aiChatStore(type=hermes)` |
| SettingsViewModel | `settingsStore` |

### gRPC клиенты → Services

| Android gRPC | Web Service |
|-------------|------------|
| RealGrpcClient | grpc-web client |
| GrpcClient (facade) | `grpcService` |
| OwlGrpc | `aiChatService.owl.*` |
| HermesGrpc | `aiChatService.hermes.*` |
| AiChatGrpc | `aiChatService.*` |

---

## Различия от Android

### Что НЕ нужно в веб-клиенте
- Room DB → вместо него localStorage/IndexedDB
- Firebase → Web Push API
- WebRTC звонки → пока не реализуем (сложно в браузере)
- SplashScreen → loading state
- System UI (status bar) → не применимо
- Notification channels → Web Push permissions

### Что проще в веб-клиенте
- Обновления: деплой на сервер → сразу у всех
- Нет версии APK / versionCode
- Нет App Store / Google Play
- Haptic feedback → не применимо
- Intent system → URL routing

### Что сложнее в веб-клиенте
- gRPC через grpc-web (нужен Envoy proxy)
- E2EE через WebCrypto (менее проверено)
- Background sync (Service Workers)
- Offline mode (Service Workers + IndexedDB)
- File system access (File API)

---

## Дизайн-система

Android использует Material Design 3 — веб-клиент тоже:
- Material Design 3 tokens (цвета, типографика, spacing)
- Material Web Components или собственная реализация
- Темы: светлая / тёмная / кастомные
- Анимации: CSS transitions + Web Animations API
