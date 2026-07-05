// ============================================
// AuthScreen — iOS Native Style Login/SignUp (V2)
// ============================================
// Clean, native-looking iOS authentication screen.
// V2: Uses AuthService.SignInV2 / SignUpV2 with JWT tokens.
// Multi-language: EN / RU
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { Screen } from '@/components/common'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'
import { t, detectLang, type Lang } from '@/shared/types'
import { APP_VERSION } from '@/shared/version'

interface AuthScreenProps {
  onAuthSuccess: () => void
}

type AuthView = 'login' | 'signup' | 'forgot' | 'resetDone'

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>(detectLang())
  const [authView, setAuthView] = useState<AuthView>('login')

  const usernameRef = useRef<HTMLInputElement>(null)
  const setTokens = useAuthStore((s) => s.setTokens)

  useEffect(() => {
    if (authView === 'login' || authView === 'signup') {
      const timer = setTimeout(() => usernameRef.current?.focus(), 500)
      return () => clearTimeout(timer)
    }
  }, [authView])

  const handleSubmit = useCallback(async () => {
    if (!username.trim()) {
      setError(t('usernamePlaceholder', lang))
      return
    }
    if (!password.trim()) {
      setError(t('passwordPlaceholder', lang))
      return
    }
    if (isSignUp && !email.trim()) {
      setError(t('emailPlaceholder', lang))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const getTokens = () => useAuthStore.getState().tokens
      await grpcClient.connect(undefined, getTokens)

      const result = isSignUp
        ? await grpcClient.signUpV2(username.trim(), password, email.trim())
        : await grpcClient.signInV2(username.trim(), password)

      if (result.success && result.accessToken) {
        setTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          accessExpiresAt: result.accessExpiresAt,
          refreshExpiresAt: result.refreshExpiresAt,
          user: result.user,
        })
        onAuthSuccess()
      } else {
        setError(result.message || t('authError', lang))
      }
    } catch (err: any) {
      setError(err.message || t('connectionError', lang))
    } finally {
      setIsLoading(false)
    }
  }, [username, password, email, isSignUp, setTokens, onAuthSuccess, lang])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (authView === 'forgot') {
          handleRequestReset()
        } else {
          handleSubmit()
        }
      }
    },
    [handleSubmit, authView, username, lang],
  )

  const toggleLang = useCallback(() => {
    setLang(lang === 'ru' ? 'en' : 'ru')
  }, [lang])

  const handleRequestReset = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await grpcClient.requestPasswordReset(username.trim())
      if (result.success) {
        setAuthView('resetDone')
      } else {
        setError(result.message || t('authError', lang))
      }
    } catch (err: any) {
      setError(err.message || t('connectionError', lang))
    } finally {
      setIsLoading(false)
    }
  }, [username, lang])

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
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 13,
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>

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
          <img src="/logo.png" alt="Lava" style={{ width: 56, height: 56, borderRadius: 14 }} />
        </div>

        {/* App name */}
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          {t('appName', lang)}
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
          v{APP_VERSION}
        </div>

        {/* Login/Signup View */}
        {(authView === 'login' || authView === 'signup') && (
          <>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 40 }}>
              {authView === 'signup' ? t('signupTitle', lang) : t('loginTitle', lang)}
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
                  {t('usernamePlaceholder', lang)}
                </label>
                <input
                  ref={usernameRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('usernamePlaceholder', lang)}
                  disabled={isLoading}
                  autoCapitalize="none"
                  autoCorrect="off"
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: authView === 'signup' ? 12 : 20 }}>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
                  {t('passwordPlaceholder', lang)}
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
              {authView === 'signup' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
                    {t('emailPlaceholder', lang)}
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
                {isLoading ? t('loading', lang) : authView === 'signup' ? t('signUp', lang) : t('signIn', lang)}
              </button>

              {/* Toggle mode */}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setAuthView(authView === 'signup' ? 'login' : 'signup'); setError(null) }}
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
                  marginBottom: 12,
                }}
              >
                {authView === 'signup' ? t('hasAccount', lang) : t('noAccount', lang)}
              </button>

              {/* Forgot password */}
              {authView === 'login' && (
                <button
                  onClick={() => { setAuthView('forgot'); setError(null) }}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 12,
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {t('forgotPassword', lang)}
                </button>
              )}
            </div>
          </>
        )}

        {/* Forgot Password — Send request to admin */}
        {authView === 'forgot' && (
          <>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 40 }}>
              {t('resetPasswordTitle', lang)}
            </div>

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

            <div style={{ width: '100%', maxWidth: 320 }}>
              <button
                onClick={handleRequestReset}
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
                  marginBottom: 12,
                }}
              >
                {isLoading ? t('loading', lang) : t('resetPassword', lang)}
              </button>

              <button
                onClick={() => { setAuthView('login'); setError(null) }}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 12,
                  background: 'transparent',
                  border: 'none',
                  color: '#6b5ce7',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {t('backToLogin', lang)}
              </button>
            </div>
          </>
        )}

        {/* Reset Done */}
        {authView === 'resetDone' && (
          <>
            <div style={{ fontSize: 14, color: '#4caf50', marginBottom: 40 }}>
              {t('resetPasswordSentToAdmin', lang)}
            </div>

            <div style={{ width: '100%', maxWidth: 320 }}>
              <button
                onClick={() => { setAuthView('login'); setError(null) }}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('backToLogin', lang)}
              </button>
            </div>
          </>
        )}
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
