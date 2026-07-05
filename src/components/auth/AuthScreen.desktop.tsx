// ============================================
// AuthScreen — Desktop (V2)
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
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
      usernameRef.current?.focus()
    }
  }, [authView])

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

  const handleRequestReset = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const getTokens = () => useAuthStore.getState().tokens
      await grpcClient.connect(undefined, getTokens)
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
          margin: '0 auto 16px',
        }}
      >
        <img src="/logo.png" alt="Lavender" style={{ width: 56, height: 56, borderRadius: 14 }} />
      </div>

      <h2 style={{ color: '#fff', marginBottom: 8 }}>{t('appName', lang)}</h2>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 8 }}>v{APP_VERSION}</div>

      {/* Login/Signup View */}
      {(authView === 'login' || authView === 'signup') && (
        <>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>
            {authView === 'signup' ? t('signupTitle', lang) : t('loginTitle', lang)}
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
          {authView === 'signup' && (
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
            {isLoading ? t('loading', lang) : authView === 'signup' ? t('signUp', lang) : t('signIn', lang)}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setAuthView(isSignUp ? 'login' : 'signup'); setError(null) }}
              style={{ background: 'none', border: 'none', color: '#6b5ce7', cursor: 'pointer' }}
            >
              {authView === 'signup' ? t('hasAccount', lang) : t('noAccount', lang)}
            </button>
            {authView === 'login' && (
              <button
                onClick={() => { setAuthView('forgot'); setError(null); setResetMessage(null) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }}
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
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>
            {t('resetPasswordHint', lang)}
          </p>

          {error && (
            <div style={{ color: '#e74c4c', marginBottom: 16, fontSize: 14 }}>{error}</div>
          )}

          <button
            onClick={handleRequestReset}
            disabled={isLoading}
            style={{
              width: '100%', padding: 12, borderRadius: 8,
              background: '#6b5ce7', color: '#fff', border: 'none',
              cursor: isLoading ? 'default' : 'pointer', marginBottom: 12,
            }}
          >
            {isLoading ? t('loading', lang) : t('resetPassword', lang)}
          </button>

          <button
            onClick={() => { setAuthView('login'); setError(null) }}
            style={{ background: 'none', border: 'none', color: '#6b5ce7', cursor: 'pointer' }}
          >
            {t('backToLogin', lang)}
          </button>
        </>
      )}

      {/* Reset Done */}
      {authView === 'resetDone' && (
        <>
          <div style={{ color: '#4caf50', marginBottom: 16, fontSize: 14 }}>
            {t('resetPasswordSentToAdmin', lang)}
          </div>

          <button
            onClick={() => { setAuthView('login'); setError(null) }}
            style={{ background: 'none', border: 'none', color: '#6b5ce7', cursor: 'pointer' }}
          >
            {t('backToLogin', lang)}
          </button>
        </>
      )}

          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder={t('emailPlaceholder', lang)}
            disabled={isLoading}
            autoFocus
            style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: '#fff' }}
          />

          <button
            onClick={handleRequestReset}
            disabled={isLoading}
            style={{
              width: '100%', padding: 12, borderRadius: 8,
              background: '#6b5ce7', color: '#fff', border: 'none',
              cursor: isLoading ? 'default' : 'pointer', marginBottom: 12,
            }}
          >
            {isLoading ? t('loading', lang) : t('resetPassword', lang)}
          </button>

          <button
            onClick={() => { setAuthView('login'); setError(null) }}
            style={{ background: 'none', border: 'none', color: '#6b5ce7', cursor: 'pointer' }}
          >
            {t('backToLogin', lang)}
          </button>
        </>
      )}

      {/* Reset Code + New Password */}
      {authView === 'resetCode' && (
        <>
          {resetMessage && (
            <div style={{ color: '#4caf50', marginBottom: 16, fontSize: 14 }}>{resetMessage}</div>
          )}

          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>
            {t('enterResetCode', lang)}
          </p>

          {error && (
            <div style={{ color: '#e74c4c', marginBottom: 16, fontSize: 14 }}>{error}</div>
          )}

          <input
            type="text"
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            placeholder={t('enterResetCode', lang)}
            disabled={isLoading}
            autoFocus
            style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: '#fff' }}
          />
          <input
            type="password"
            value={resetNewPassword}
            onChange={(e) => setResetNewPassword(e.target.value)}
            placeholder={t('newPasswordPlaceholder', lang)}
            disabled={isLoading}
            style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: '#fff' }}
          />

          <button
            onClick={handleResetPassword}
            disabled={isLoading}
            style={{
              width: '100%', padding: 12, borderRadius: 8,
              background: '#6b5ce7', color: '#fff', border: 'none',
              cursor: isLoading ? 'default' : 'pointer', marginBottom: 12,
            }}
          >
            {isLoading ? t('loading', lang) : t('resetPassword', lang)}
          </button>

          <button
            onClick={() => { setAuthView('login'); setError(null); setResetMessage(null) }}
            style={{ background: 'none', border: 'none', color: '#6b5ce7', cursor: 'pointer' }}
          >
            {t('backToLogin', lang)}
          </button>
        </>
      )}

      {/* Reset Done */}
      {authView === 'resetDone' && (
        <>
          <p style={{ color: '#4caf50', marginBottom: 32 }}>
            {t('resetPasswordDone', lang)}
          </p>

          <button
            onClick={() => {
              setAuthView('login')
              setResetEmail('')
              setResetToken('')
              setResetNewPassword('')
              setResetMessage(null)
              setError(null)
            }}
            style={{
              width: '100%', padding: 12, borderRadius: 8,
              background: '#6b5ce7', color: '#fff', border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('backToLogin', lang)}
          </button>
        </>
      )}
    </div>
  )
}
