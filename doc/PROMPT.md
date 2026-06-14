# Lavender Messenger Web — AuthService v2 Integration Plan

**Версия:** v1.1.4.0
**Дата:** 2026-06-14
**Статус:** Проект интеграции (legacy код удаляем полностью)

---

## Текущее состояние

Веб клиент (`/root/msg.client.web/`) уже имеет:
- `grpcClient.ts` — gRPC-web клиент с auth interceptor (Bearer token из localStorage)
- `authStore.ts` — Zustand store с `accessToken` + `user`
- Auth interceptor прокидывает `Authorization: Bearer <token>` в каждый запрос

**Проблема:** Сейчас используется AuthService v1 (SignIn/SignUp с UUID tokenом). Нужно перейти на V2 с JWT.

---

## Архитектура AuthService v2

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Client (TypeScript)                   │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  AuthStore    │◄──►│  grpcClient  │◄──►│  AuthService  │  │
│  │  (Zustand)    │    │  (gRPC-web)  │    │  v2 (server)  │  │
│  └──────────────┘    └──────────────┘    └───────────────┘  │
│         │                    │                                │
│         │ store tokens       │ Bearer <access_token>         │
│         ▼                    ▼                                │
│  ┌──────────────┐    ┌──────────────┐                        │
│  │  localStorage │    │  gRPC calls  │                        │
│  │  (encrypted)  │    │  + refresh   │                        │
│  └──────────────┘    └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘

Поток данных:
1. SignInV2(username, password, deviceInfo) → access_token + refresh_token
2. Храним оба токена + expires_at в localStorage
3. Каждый gRPC запрос → interceptor проверяет access_token expiry
4. Если access истёк → refreshToken() → новые access + refresh
5. Если refresh истёк → redirect to login
```

---

## Что изменить

### 1. `src/shared/api/grpcClient.ts`

**Удалить:**
- `signIn()` — старый v1 метод
- `signUp()` — старый v1 метод
- `logout()` — старый (просто disconnect)

**Добавить:**

```typescript
// AuthService V2 методы
async signInV2(username: string, password: string, deviceInfo: DeviceInfo): Promise<AuthResponseV2>
async signUpV2(username: string, password: string, email: string, deviceInfo: DeviceInfo): Promise<AuthResponseV2>
async refreshToken(refreshToken: string): Promise<RefreshTokenResponse>
async signOut(refreshToken: string, allDevices: boolean): Promise<void>
async revokeDevice(deviceId: string): Promise<void>
```

**Типы:**

```typescript
interface DeviceInfo {
  deviceId: string    // crypto.randomUUID() или fingerprint
  deviceName: string  // navigator.userAgent или "Web Browser"
  deviceType: "web"
}

interface AuthResponseV2 {
  success: boolean
  message: string
  accessToken: string      // JWT access token
  refreshToken: string     // JWT refresh token
  accessExpiresAt: number  // unix timestamp
  refreshExpiresAt: number // unix timestamp
  user: {
    id: string
    username: string
    email: string
    avatarUrl: string
    bio: string
    status: string
  }
}

interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string    // новый refresh token (rotation)
  accessExpiresAt: number
  refreshExpiresAt: number
}
```

**Auth Interceptor — обновить:**

```typescript
function createAuthInterceptor(getTokens: () => TokenPair | null) {
  return (next: any) => async (req: any) => {
    const tokens = getTokens()
    if (tokens) {
      // Check if access token needs refresh
      const now = Math.floor(Date.now() / 1000)
      if (now >= tokens.accessExpiresAt - 300) { // 5 min buffer
        // Refresh token
        const newTokens = await grpcClient.refreshToken(tokens.refreshToken)
        if (newTokens) {
          authStore.setTokens(newTokens) // update store + localStorage
          req.header.set('Authorization', `Bearer ${newTokens.accessToken}`)
        } else {
          authStore.logout()
          // redirect to login
        }
      } else {
        req.header.set('Authorization', `Bearer ${tokens.accessToken}`)
      }
    }
    return next(req)
  }
}
```

### 2. `src/store/authStore.ts`

**Удалить:**
- `accessToken: string | null` — заменить на полный TokenPair
- `setAuth()` — заменить на `setTokens()`
- `setAccessToken()` — удалить

**Новый интерфейс:**

```typescript
interface TokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
}

interface AuthState {
  user: User | null
  tokens: TokenPair | null
  isAuthenticated: boolean

  setTokens: (response: AuthResponseV2) => void
  updateAccessToken: (response: RefreshTokenResponse) => void
  logout: () => void
}
```

**localStorage ключи:**
- `auth_tokens` — JSON с TokenPair (вместо `auth_access_token`)
- `auth_user` — JSON с User (без изменений)

### 3. Компоненты UI

**Login/Register формы:**
- Вызывать `grpcClient.signInV2()` / `grpcClient.signUpV2()` вместо v1
- Передавать `deviceInfo: { deviceId, deviceName: "Web Browser", deviceType: "web" }`

**Settings/Security секция (новое):**
- Список устройств пользователя (`GetDevices` — уже есть в ChatService)
- Кнопка "Revoke" для каждого устройства
- Кнопка "Sign out all devices"

### 4. Proto генерация

```bash
cd /root/msg.client.web
# Сгенерировать новые proto из обновлённого messenger.proto
npx buf generate
```

---

## Порядок выполнения

1. **Обновить proto** — сгенерировать из нового messenger.proto
2. **Типы** — добавить AuthResponseV2, RefreshTokenResponse, DeviceInfo
3. **grpcClient.ts** — заменить signIn/signUp на V2, обновить interceptor
4. **authStore.ts** — перейти на TokenPair вместо accessToken
5. **Login/Register UI** — вызовы V2 + deviceInfo
6. **Настройки** — секция управления устройствами
7. **Тестирование** — login → refresh → API calls → logout

---

## Безопасность

- Access token живёт 15 минут
- Refresh token живёт 30 дней, ротация при каждом refresh
- При обнаружении reuse refresh token — все устройства отзываются
- Токены хранятся в localStorage (для PWA на iPhone)
- Для production — рассмотреть httpOnly cookies

---

## Совместимость

- Старые клиенты (Android v1.1.3.x) продолжают работать через Chat stream auth
- Новые клиенты (web v1.1.4.0+) используют AuthService v2 + JWT
- Сервер поддерживает оба механизма одновременно
