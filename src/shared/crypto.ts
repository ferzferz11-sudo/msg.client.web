// ============================================
// E2EE Crypto — RSA-OAEP + AES-GCM for Secret Chats
// ============================================

const RSA_KEY_PARAMS: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

const AES_KEY_PARAMS: AesKeyGenParams = {
  name: 'AES-GCM',
  length: 256,
}

function bufToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuf(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function generateRSAKeyPair(): Promise<{ publicKeyB64: string; privateKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(RSA_KEY_PARAMS, true, ['encrypt', 'decrypt'])
  const spki = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  return { publicKeyB64: bufToBase64(spki), privateKey: keyPair.privateKey }
}

export async function importRSAPublicKey(b64Spki: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', base64ToBuf(b64Spki), RSA_KEY_PARAMS, false, ['encrypt'])
}

export async function importRSAPrivateKey(b64Pkcs8: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', base64ToBuf(b64Pkcs8), RSA_KEY_PARAMS, false, ['decrypt'])
}

export async function rsaEncrypt(publicKey: CryptoKey, data: ArrayBuffer): Promise<string> {
  return bufToBase64(await crypto.subtle.encrypt('RSA-OAEP', publicKey, data))
}

export async function rsaDecrypt(privateKey: CryptoKey, b64: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.decrypt('RSA-OAEP', privateKey, base64ToBuf(b64)))
}

export async function generateAESKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES_KEY_PARAMS, true, ['encrypt', 'decrypt'])
}

export async function exportAESKey(key: CryptoKey): Promise<string> {
  return bufToBase64(await crypto.subtle.exportKey('raw', key))
}

export async function importAESKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', base64ToBuf(b64), AES_KEY_PARAMS, false, ['encrypt', 'decrypt'])
}

export async function aesEncrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return bufToBase64(combined.buffer)
}

export async function aesDecrypt(key: CryptoKey, b64: string): Promise<string> {
  const combined = new Uint8Array(base64ToBuf(b64))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

const P = 'e2ee_'

export function storePrivateKey(chatId: string, key: CryptoKey): Promise<void> {
  return crypto.subtle.exportKey('pkcs8', key).then((buf) => {
    localStorage.setItem(`${P}pk_${chatId}`, bufToBase64(buf))
  })
}

export async function loadPrivateKey(chatId: string): Promise<CryptoKey | null> {
  const b = localStorage.getItem(`${P}pk_${chatId}`)
  if (!b) return null
  return importRSAPrivateKey(b)
}

export function storeSharedKey(chatId: string, key: CryptoKey): Promise<void> {
  return crypto.subtle.exportKey('raw', key).then((buf) => {
    localStorage.setItem(`${P}sk_${chatId}`, bufToBase64(buf))
  })
}

export async function loadSharedKey(chatId: string): Promise<CryptoKey | null> {
  const b = localStorage.getItem(`${P}sk_${chatId}`)
  if (!b) return null
  return importAESKey(b)
}

export async function createEncryptedAESKey(aesKeyB64: string, peerPublicKeyB64: string): Promise<string> {
  const peerPub = await importRSAPublicKey(peerPublicKeyB64)
  return rsaEncrypt(peerPub, base64ToBuf(aesKeyB64))
}

export async function decryptEncryptedAESKey(encryptedB64: string, myPrivateKey: CryptoKey): Promise<CryptoKey> {
  const raw = await rsaDecrypt(myPrivateKey, encryptedB64)
  return importAESKey(bufToBase64(raw.buffer as ArrayBuffer))
}
