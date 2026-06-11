// ============================================
// LoginScreen — iOS Native Style
// ============================================
// Authentication screen with username/password form.
// Matches the Android SplashActivity auth flow.
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { Screen } from '@/components/common'
import { grpcClient } from '@/shared/api/grpcClient'

interface LoginScreenProps {
  onLoginSuccess: (username: string, userId: string) => void
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [serverAddress, setServerAddress] = useState(
    import.meta.env.VITE_API_URL || '13.140.25.249:50051'
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegister, setIsRegister] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)

  // Focus username on mount
  useEffect(() => {
    const timer = setTimeout(() => usernameRef.current?.focus(), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      setError('Введите имя пользователя и пароль')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Parse server address
      const [host, portStr] = serverAddress.includes(':')
        ? serverAddress.split(':')
        : [serverAddress, '50051']
      const baseUrl = `http://${host}:${portStr}`

      // Connect to server
      await grpcClient.connect(baseUrl)

      // Authenticate
      const result = await grpcClient.login(
        username.trim(),
        password,
        isRegister
      )

      if (result.success) {
        // Save credentials
        localStorage.setItem('lavender_username', username.trim())
        localStorage.setItem('lavender_password', password)
        localStorage.setItem('lavender_server', serverAddress)
        if (result.userId) {
          localStorage.setItem('lavender_user_id', result.userId)
        }

        onLoginSuccess(username.trim(), result.userId || '')
      } else {
        setError(result.error || (isRegister ? 'Ошибка регистрации' : 'Неверные данные'))
      }
    } catch (err) {
      setError(`Ошибка подключения: ${String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }, [username, password, serverAddress, isRegister, onLoginSuccess])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <Screen>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 32px',
          background: '#1a1a2e',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            marginBottom: 16,
          }}
        >
          🦞
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 8,
          }}
        >
          Lavender
        </div>

        <div
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 40,
          }}
        >
          {isRegister ? 'Создать аккаунт' : 'Вход в мессенджер'}
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(231, 76, 92, 0.15)',
              borderRadius: 12,
              border: '1px solid rgba(231, 76, 92, 0.3)',
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 13, color: '#e74c4c' }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <div style={{ width: '100%', maxWidth: 320 }}>
          {/* Server address */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
              Сервер
            </label>
            <input
              ref={usernameRef}
              type="text"
              value={serverAddress}
              onChange={(e) => setServerAddress(e.target.value)}
              placeholder="13.140.25.249:50051"
              disabled={isLoading}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: 15,
                padding: '0 16px',
                outline: 'none',
                opacity: isLoading ? 0.5 : 1,
              }}
            />
          </div>

          {/* Username */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="username"
              disabled={isLoading}
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: 15,
                padding: '0 16px',
                outline: 'none',
                opacity: isLoading ? 0.5 : 1,
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              disabled={isLoading}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: 15,
                padding: '0 16px',
                outline: 'none',
                opacity: isLoading ? 0.5 : 1,
              }}
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              background: isLoading ? 'rgba(107, 92, 231, 0.5)' : 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
              border: 'none',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              cursor: isLoading ? 'default' : 'pointer',
              transition: 'opacity 0.15s',
              WebkitTapHighlightColor: 'transparent',
              marginBottom: 16,
            }}
          >
            {isLoading ? 'Подключение...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>

          {/* Toggle register/login */}
          <button
            onClick={() => setIsRegister(!isRegister)}
            disabled={isLoading}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 12,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </Screen>
  )
}
