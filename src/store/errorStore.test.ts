import { describe, it, expect, beforeEach } from 'vitest'
import { useErrorStore } from './errorStore'

describe('errorStore', () => {
  beforeEach(() => {
    useErrorStore.getState().clearErrors()
  })

  it('adds an error with id, timestamp, and dismissed=false', () => {
    const { addError } = useErrorStore.getState()
    addError({ message: 'Test error', type: 'network' })
    const state = useErrorStore.getState()
    expect(state.errors).toHaveLength(1)
    expect(state.errors[0].message).toBe('Test error')
    expect(state.errors[0].type).toBe('network')
    expect(state.errors[0].id).toMatch(/^err-/)
    expect(state.errors[0].timestamp).toBeGreaterThan(0)
    expect(state.errors[0].dismissed).toBe(false)
  })

  it('limits to 5 errors max', () => {
    const { addError } = useErrorStore.getState()
    for (let i = 0; i < 7; i++) {
      addError({ message: `Error ${i}`, type: 'network' })
    }
    const state = useErrorStore.getState()
    expect(state.errors).toHaveLength(5)
  })

  it('dismisses an error', () => {
    const { addError } = useErrorStore.getState()
    addError({ message: 'Dismiss me', type: 'server' })
    const { errors } = useErrorStore.getState()
    const errId = errors[0].id
    useErrorStore.getState().dismissError(errId)
    const state = useErrorStore.getState()
    expect(state.errors[0].dismissed).toBe(true)
  })

  it('clears all errors', () => {
    const { addError } = useErrorStore.getState()
    addError({ message: 'Error 1', type: 'auth' })
    addError({ message: 'Error 2', type: 'rate_limit' })
    useErrorStore.getState().clearErrors()
    const state = useErrorStore.getState()
    expect(state.errors).toHaveLength(0)
  })

  it('sets offline status', () => {
    useErrorStore.getState().setOffline(true)
    expect(useErrorStore.getState().isOffline).toBe(true)
    useErrorStore.getState().setOffline(false)
    expect(useErrorStore.getState().isOffline).toBe(false)
  })
})
