import { describe, it, expect } from 'vitest'
import { t, detectLang } from './index'

describe('i18n', () => {
  it('returns Russian text by default', () => {
    expect(t('loginTitle', 'ru')).toBe('Вход')
  })

  it('returns English text', () => {
    expect(t('loginTitle', 'en')).toBe('Sign In')
  })

  it('falls back to key if translation missing', () => {
    expect(t('nonexistent_key', 'ru')).toBe('nonexistent_key')
  })

  it('handles replacements', () => {
    const result = t('replyTo', 'ru', { user: 'John' })
    expect(result).toBe('Ответ: John')
  })

  it('handles number replacements', () => {
    const result = t('retry', 'en', { attempt: 2 })
    expect(result).toBe('Retrying... (2/3)')
  })
})

describe('detectLang', () => {
  it('detects Russian language', () => {
    const original = navigator.language
    Object.defineProperty(navigator, 'language', { value: 'ru-RU', configurable: true })
    expect(detectLang()).toBe('ru')
    Object.defineProperty(navigator, 'language', { value: original, configurable: true })
  })

  it('defaults to English for non-Russian', () => {
    const original = navigator.language
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
    expect(detectLang()).toBe('en')
    Object.defineProperty(navigator, 'language', { value: original, configurable: true })
  })
})
