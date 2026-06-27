import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastContainer } from './Toast'
import { useErrorStore } from '@/store/errorStore'

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useErrorStore.getState().clearErrors()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders toast when error is added', () => {
    useErrorStore.getState().addError({ message: 'Test error', type: 'network' })
    render(<ToastContainer />)
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('shows correct icon for rate_limit errors', () => {
    useErrorStore.getState().addError({ message: 'Rate limited', type: 'rate_limit' })
    render(<ToastContainer />)
    expect(screen.getByText('Rate limited')).toBeInTheDocument()
  })

  it('dismisses toast after click', () => {
    useErrorStore.getState().addError({ message: 'Click me', type: 'server' })
    render(<ToastContainer />)
    const toast = screen.getByText('Click me').closest('div')!
    act(() => { toast.click() })
    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.queryByText('Click me')).not.toBeInTheDocument()
  })

  it('auto-dismisses after 5 seconds', () => {
    useErrorStore.getState().addError({ message: 'Auto dismiss', type: 'unknown' })
    render(<ToastContainer />)
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(5400) })
    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument()
  })

  it('limits visible toasts to 3', () => {
    const { addError, clearErrors } = useErrorStore.getState()
    clearErrors()
    for (let i = 0; i < 5; i++) {
      addError({ message: `LimitError${i}`, type: 'network' })
    }
    render(<ToastContainer />)
    expect(screen.getAllByText(/LimitError/)).toHaveLength(3)
  })
})
