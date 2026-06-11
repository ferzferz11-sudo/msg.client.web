// ============================================
// AuthScreen — iOS Native Style Login/SignUp
// ============================================
// Clean, native-looking iOS authentication screen.
// Features:
// - Large logo + app name
// - Username/password inputs with autoCapitalize="none"
// - Smooth validation transitions
// - Toggle between Sign In and Sign Up
// - Loading state with spinner
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { Screen } from '@/components/common'
import { grpcClient, protoToUser } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'

interface AuthScreenProps {
  onAuthSuccess: () => void
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usernameRef = useRef<HTMLInputElement>(null)
  const setAuth = useAuthStore((s) => s.setAuth)

  // Focus username on mount
  useEffect(() => {
    const timer = setTimeout(() => usernameRef.current?.focus(), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!username.trim()) {
      setError('Введите имя пользователя')
      return
    }
    if (!password.trim()) {
      setError('Введите пароль')
      return
    }
    if (isSignUp && !email.trim()) {
      setError('Введите email')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Connect to server (uses relative /messenger path via Nginx)
      const getToken = () => useAuthStore.getState().accessToken
      await grpcClient.connect(undefined, getToken)

      // Authenticate
      const result = isSignUp
        ? await grpcClient.signUp(username.trim(), password, email.trim())
        : await grpcClient.signIn(username.trim(), password)

      if (result.success && result.token && result.user) {
        // Save to Zustand store (persists to localStorage)
        const user = protoToUser(result.user)
        setAuth(user, result.token)
        onAuthSuccess()
      } else {
        setError(result.message || (isSignUp ? 'Ошибка регистрации' : 'Неверные данные'))
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу')
    } finally {
      setIsLoading(false)
    }
  }, [username, password, email, isSignUp, setAuth, onAuthSuccess])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const toggleMode = useCallback(() => {
    setIsSignUp(!isSignUp)
    setError(null)
  }, [isSignUp])

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
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          Lavender
        </div>

        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 40 }}>
          {isSignUp ? 'Создать аккаунт' : 'Вход в мессенджер'}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              width: '100%',
              maxWidth: 320,
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
          {/* Username */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
              Имя пользователя
            </label>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="username"
              disabled={isLoading}
              autoCapitalize="none"
              autoCorrect="off"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: isSignUp ? 12 : 20 }}>
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
              style={inputStyle}
            />
          </div>

          {/* Email (Sign Up only) */}
          {isSignUp && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="email@example.com"
                disabled={isLoading}
                autoCapitalize="none"
                autoCorrect="off"
                style={inputStyle}
              />
            </div>
          )}

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
            {isLoading ? 'Подключение...' : isSignUp ? 'Зарегистрироваться' : 'Войти'}
          </button>

          {/* Toggle mode */}
          <button
            onClick={toggleMode}
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
            {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </Screen>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 12,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  fontSize: 15,
  padding: '0 16px',
  outline: 'none',
}
