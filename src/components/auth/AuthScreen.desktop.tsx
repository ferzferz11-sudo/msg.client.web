// ============================================
// AuthScreen — Desktop (V2)
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'
import { t, detectLang, type Lang } from '@/shared/types'

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
  const [lang, setLang] = useState<Lang>(detectLang())

  const usernameRef = useRef<HTMLInputElement>(null)
  const setTokens = useAuthStore((s) => s.setTokens)

  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!username.trim()) { setError(t('usernamePlaceholder', lang)); return }
    if (!password.trim()) { setError(t('passwordPlaceholder', lang)); return }
    if (isSignUp && !email.trim()) { setError(t('emailPlaceholder', lang)); return }

    setIsLoading(true)
    setError(null)

    try {
      const getTokens = () => useAuthStore.getState().tokens
      await grpcClient.connect(undefined, getTokens)

      const result = isSignUp
        ? await grpcClient.signUpV2(username.trim(), password, email.trim())
        : await grpcClient.signInV2(username.trim(), password)

      if (result.success && result.accessToken && result.user) {
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

  return (
    <div style={{ padding: 40, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.1)', border: 'none',
          color: 'rgba(255,255,255,0.6)', fontSize: 13,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
        }}
      >
        {lang === 'ru' ? 'EN' : 'RU'}
      </button>

      <h2 style={{ color: '#fff', marginBottom: 8 }}>{t('appName', lang)}</h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>
        {isSignUp ? t('signupTitle', lang) : t('loginTitle', lang)}
      </p>

      {error && (
        <div style={{ color: '#e74c4c', marginBottom: 16, fontSize: 14 }}>{error}</div>
      )}

      <input
        ref={usernameRef}
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder={t('usernamePlaceholder', lang)}
        disabled={isLoading}
        autoCapitalize="none"
        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: '#fff' }}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('passwordPlaceholder', lang)}
        disabled={isLoading}
        style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: '#fff' }}
      />
      {isSignUp && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder', lang)}
          disabled={isLoading}
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: '#fff' }}
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        style={{
          width: '100%', padding: 12, borderRadius: 8,
          background: '#6b5ce7', color: '#fff', border: 'none',
          cursor: isLoading ? 'default' : 'pointer', marginBottom: 12,
        }}
      >
        {isLoading ? t('loading', lang) : isSignUp ? t('signUp', lang) : t('signIn', lang)}
      </button>

      <button
        onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
        style={{ background: 'none', border: 'none', color: '#6b5ce7', cursor: 'pointer' }}
      >
        {isSignUp ? t('hasAccount', lang) : t('noAccount', lang)}
      </button>
    </div>
  )
}
