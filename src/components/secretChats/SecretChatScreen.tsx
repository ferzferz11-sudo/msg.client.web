// ============================================
// SecretChatScreen — E2EE Chat Wrapper
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { useAuthStore } from '@/store/authStore'
import { grpcClient } from '@/shared/api/grpcClient'
import {
  generateRSAKeyPair,
  storePrivateKey,
  loadPrivateKey,
  loadSharedKey,
  storeSharedKey,
  exportAESKey,
  createEncryptedAESKey,
  decryptEncryptedAESKey,
  generateAESKey,
} from '@/shared/crypto'

interface SecretChatScreenProps {
  chatId: string
  onBack: () => void
  onServerShutdown?: () => void
  onReconnecting?: (reconnecting: boolean) => void
  onStreamError?: (error: string) => void
}

type KeyState = 'loading' | 'needs_exchange' | 'ready' | 'error'

export function SecretChatScreen({ chatId, onBack, onServerShutdown, onReconnecting, onStreamError }: SecretChatScreenProps) {
  const user = useAuthStore((s) => s.user)
  const [keyState, setKeyState] = useState<KeyState>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const setupKeys = async () => {
      try {
        const existingKey = await loadSharedKey(chatId)
        if (existingKey && !cancelled) {
          setKeyState('ready')
          return
        }

        const privateKey = await loadPrivateKey(chatId)
        if (!privateKey) {
          if (!cancelled) setKeyState('needs_exchange')
          return
        }

        const peerPubKey = await grpcClient.getSecretChatKey(chatId)
        if (!peerPubKey) {
          if (!cancelled) setKeyState('needs_exchange')
          return
        }

        const encryptedAESKey = await createEncryptedAESKey(
          (await exportAESKey(await generateAESKey())),
          peerPubKey,
        )
        const aesKey = await decryptEncryptedAESKey(encryptedAESKey, privateKey)
        await storeSharedKey(chatId, aesKey)

        if (!cancelled) setKeyState('ready')
      } catch (err) {
        console.error('[SecretChat] Key setup failed:', err)
        if (!cancelled) {
          setError('Не удалось настроить шифрование')
          setKeyState('error')
        }
      }
    }

    setupKeys()
    return () => { cancelled = true }
  }, [chatId, user?.id])

  const handleKeyExchange = useCallback(async () => {
    if (!user?.id) return
    try {
      setKeyState('loading')
      const { publicKeyB64, privateKey } = await generateRSAKeyPair()
      await storePrivateKey(chatId, privateKey)
      await grpcClient.exchangeSecretKey(chatId, publicKeyB64)

      const peerPubKey = await grpcClient.getSecretChatKey(chatId)
      if (!peerPubKey) {
        setKeyState('needs_exchange')
        return
      }

      const aesKey = await generateAESKey()
      const aesKeyB64 = await exportAESKey(aesKey)
      const encryptedAESKey = await createEncryptedAESKey(aesKeyB64, peerPubKey)
      const decryptedAESKey = await decryptEncryptedAESKey(encryptedAESKey, privateKey)
      await storeSharedKey(chatId, decryptedAESKey)

      setKeyState('ready')
    } catch (err) {
      console.error('[SecretChat] Key exchange failed:', err)
      setError('Ошибка обмена ключами')
      setKeyState('error')
    }
  }, [chatId, user?.id])

  if (keyState === 'loading') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0E1621', color: '#F5F5F5', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>🔐</div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Настройка шифрования...</div>
      </div>
    )
  }

  if (keyState === 'needs_exchange') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0E1621', color: '#F5F5F5', gap: 16,
        padding: 32,
      }}>
        <div style={{ fontSize: 48 }}>🔐</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Секретный чат</div>
        <div style={{ fontSize: 14, color: '#6C7883', textAlign: 'center', maxWidth: 400 }}>
          Для начала обмена ключами нажмите кнопку ниже. Это создаст ключи шифрования для этого чата.
        </div>
        {error && (
          <div style={{ fontSize: 13, color: '#E5533D' }}>{error}</div>
        )}
        <button
          onClick={handleKeyExchange}
          style={{
            padding: '12px 32px', borderRadius: 12,
            background: '#5EB5F7', border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Обменять ключи
        </button>
        <button
          onClick={onBack}
          style={{
            padding: '8px 24px', borderRadius: 10,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
            color: '#6C7883', fontSize: 14, cursor: 'pointer',
          }}
        >
          Назад
        </button>
      </div>
    )
  }

  if (keyState === 'error') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0E1621', color: '#F5F5F5', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 16, color: '#E5533D' }}>{error}</div>
        <button
          onClick={onBack}
          style={{
            padding: '8px 24px', borderRadius: 10,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
            color: '#6C7883', fontSize: 14, cursor: 'pointer',
          }}
        >
          Назад
        </button>
      </div>
    )
  }

  return <ChatScreen chatId={chatId} onBack={onBack} isSecret onServerShutdown={onServerShutdown} onReconnecting={onReconnecting} onStreamError={onStreamError} />
}
