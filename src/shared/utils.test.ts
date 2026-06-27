import { describe, it, expect } from 'vitest'
import { isMobile } from './utils'

describe('isMobile', () => {
  it('returns true for small viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
    expect(isMobile()).toBe(true)
  })

  it('returns false for large viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    expect(isMobile()).toBe(false)
  })

  it('returns false at exactly 768px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true })
    expect(isMobile()).toBe(false)
  })
})
