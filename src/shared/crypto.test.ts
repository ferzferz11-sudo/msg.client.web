import { describe, it, expect } from 'vitest'
import {
  generateRSAKeyPair,
  importRSAPublicKey,
  rsaEncrypt,
  rsaDecrypt,
  generateAESKey,
  exportAESKey,
  importAESKey,
  aesEncrypt,
  aesDecrypt,
  storePrivateKey,
  loadPrivateKey,
  storeSharedKey,
  loadSharedKey,
} from './crypto'

describe('crypto module', () => {
  describe('RSA-OAEP', () => {
    it('generates RSA key pair', async () => {
      const { publicKeyB64, privateKey } = await generateRSAKeyPair()
      expect(publicKeyB64).toBeTruthy()
      expect(typeof publicKeyB64).toBe('string')
      expect(privateKey).toBeDefined()
    })

    it('encrypts and decrypts with RSA', async () => {
      const { publicKeyB64, privateKey } = await generateRSAKeyPair()
      const publicKey = await importRSAPublicKey(publicKeyB64)
      const plaintext = new TextEncoder().encode('hello rsa')
      const encrypted = await rsaEncrypt(publicKey, plaintext.buffer)
      expect(encrypted).toBeTruthy()
      expect(encrypted).not.toBe('hello rsa')

      const decrypted = await rsaDecrypt(privateKey, encrypted)
      expect(new TextDecoder().decode(decrypted)).toBe('hello rsa')
    })
  })

  describe('AES-GCM', () => {
    it('generates AES key', async () => {
      const key = await generateAESKey()
      expect(key).toBeDefined()
      const exported = await exportAESKey(key)
      expect(exported).toBeTruthy()
    })

    it('exports and imports AES key', async () => {
      const key = await generateAESKey()
      const exported = await exportAESKey(key)
      const imported = await importAESKey(exported)
      expect(imported).toBeDefined()
    })

    it('encrypts and decrypts text with AES', async () => {
      const key = await generateAESKey()
      const plaintext = 'Hello, E2EE! 🔒'
      const encrypted = await aesEncrypt(key, plaintext)
      expect(encrypted).not.toBe(plaintext)

      const decrypted = await aesDecrypt(key, encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('different encryptions produce different ciphertexts (random IV)', async () => {
      const key = await generateAESKey()
      const enc1 = await aesEncrypt(key, 'same text')
      const enc2 = await aesEncrypt(key, 'same text')
      expect(enc1).not.toBe(enc2)
    })

    it('fails to decrypt with wrong key', async () => {
      const key1 = await generateAESKey()
      const key2 = await generateAESKey()
      const encrypted = await aesEncrypt(key1, 'secret')
      await expect(aesDecrypt(key2, encrypted)).rejects.toThrow()
    })

    it('handles empty string', async () => {
      const key = await generateAESKey()
      const encrypted = await aesEncrypt(key, '')
      const decrypted = await aesDecrypt(key, encrypted)
      expect(decrypted).toBe('')
    })

    it('handles unicode text', async () => {
      const key = await generateAESKey()
      const text = 'Привет мир! 日本語 🎉🎵'
      const encrypted = await aesEncrypt(key, text)
      const decrypted = await aesDecrypt(key, encrypted)
      expect(decrypted).toBe(text)
    })
  })

  describe('localStorage key storage', () => {
    it('stores and loads private key', async () => {
      const { privateKey } = await generateRSAKeyPair()
      await storePrivateKey('chat-1', privateKey)
      const loaded = await loadPrivateKey('chat-1')
      expect(loaded).not.toBeNull()
    })

    it('returns null for missing private key', async () => {
      const loaded = await loadPrivateKey('nonexistent')
      expect(loaded).toBeNull()
    })

    it('stores and loads shared AES key', async () => {
      const key = await generateAESKey()
      await storeSharedKey('chat-2', key)
      const loaded = await loadSharedKey('chat-2')
      expect(loaded).not.toBeNull()
    })

    it('returns null for missing shared key', async () => {
      const loaded = await loadSharedKey('nonexistent')
      expect(loaded).toBeNull()
    })
  })
})
