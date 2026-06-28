import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { AdminPanel } from './AdminPanel'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'

vi.mock('@/shared/api/grpcClient', () => ({
  grpcClient: {
    getAdminUserList: vi.fn(),
    getAdminUserSessions: vi.fn().mockResolvedValue({ sessions: [] }),
  },
}))

describe('AdminPanel', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useErrorStore.getState().clearErrors()
    ;(grpcClient.getAdminUserList as any).mockResolvedValue({
      users: [
        {
          username: 'alice', email: 'alice@test.com', userId: 'u1',
          avatarUrl: '', fullAvatarUrl: '', isSuperAdmin: true,
          lastClientVersion: '1.0', lastSeenAt: new Date().toISOString(),
          isOnline: true, lastMessageText: 'Hi', lastMessageTime: '', chatCount: 10,
        },
        {
          username: 'bob', email: 'bob@test.com', userId: 'u2',
          avatarUrl: '', fullAvatarUrl: '', isSuperAdmin: false,
          lastClientVersion: '0.9', lastSeenAt: new Date(Date.now() - 86400000).toISOString(),
          isOnline: false, lastMessageText: '', lastMessageTime: '', chatCount: 3,
        },
      ],
      nextCursor: '',
      hasMore: false,
    })
  })

  it('renders and loads users', async () => {
    await act(async () => {
      render(<AdminPanel onBack={mockOnBack} />)
    })
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(grpcClient.getAdminUserList).toHaveBeenCalled()
  })

  it('shows ADMIN badge for superAdmin', async () => {
    await act(async () => {
      render(<AdminPanel onBack={mockOnBack} />)
    })
    await waitFor(() => {
      expect(screen.getByText('ADMIN')).toBeInTheDocument()
    })
  })

  it('shows user count', async () => {
    await act(async () => {
      render(<AdminPanel onBack={mockOnBack} />)
    })
    await waitFor(() => {
      expect(screen.getByText('2 пользователей')).toBeInTheDocument()
    })
  })

  it('opens user profile modal on click', async () => {
    await act(async () => {
      render(<AdminPanel onBack={mockOnBack} />)
    })
    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument()
    })
    await act(async () => {
      screen.getByText('alice').click()
    })
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('Закрыть')).toBeInTheDocument()
  })

  it('search input renders', async () => {
    await act(async () => {
      render(<AdminPanel onBack={mockOnBack} />)
    })
    expect(screen.getByPlaceholderText('Поиск по имени или email...')).toBeInTheDocument()
  })

  it('shows empty state when no users', async () => {
    ;(grpcClient.getAdminUserList as any).mockResolvedValue({
      users: [], nextCursor: '', hasMore: false,
    })
    await act(async () => {
      render(<AdminPanel onBack={mockOnBack} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Нет результатов')).toBeInTheDocument()
    })
  })
})
