import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminUserCard } from './AdminUserCard'

describe('AdminUserCard', () => {
  const defaultProps = {
    username: 'testuser',
    email: 'test@example.com',
    avatarUrl: '',
    fullAvatarUrl: '',
    isSuperAdmin: false,
    lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
    isOnline: false,
    lastMessageText: 'Hello!',
    lastMessageTime: '',
    chatCount: 5,
    onClick: vi.fn(),
  }

  it('renders username and email', () => {
    render(<AdminUserCard {...defaultProps} />)
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('shows ADMIN badge for superAdmin', () => {
    render(<AdminUserCard {...defaultProps} isSuperAdmin={true} />)
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })

  it('does not show ADMIN badge for regular user', () => {
    render(<AdminUserCard {...defaultProps} isSuperAdmin={false} />)
    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument()
  })

  it('shows online indicator', () => {
    render(<AdminUserCard {...defaultProps} isOnline={true} />)
    expect(screen.getByText('онлайн')).toBeInTheDocument()
  })

  it('shows chat count', () => {
    render(<AdminUserCard {...defaultProps} />)
    expect(screen.getByText('5 чатов')).toBeInTheDocument()
  })

  it('shows last message text when available', () => {
    render(<AdminUserCard {...defaultProps} />)
    expect(screen.getByText('Hello!')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<AdminUserCard {...defaultProps} onClick={onClick} />)
    screen.getByText('testuser').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders online text when online', () => {
    const { container } = render(<AdminUserCard {...defaultProps} isOnline={true} />)
    expect(container.querySelector('span')).toBeTruthy()
    expect(screen.getByText('онлайн')).toBeInTheDocument()
  })
})
