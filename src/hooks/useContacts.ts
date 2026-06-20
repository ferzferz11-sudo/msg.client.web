// ============================================
// useContacts — Contacts Hook
// ============================================

import { useState, useCallback, useEffect } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'
import type { User } from '@/shared/types'

export interface Contact {
  id: string
  username: string
  email: string
  avatarUrl: string
  bio: string
  status: string
  isOnline: boolean
  createdAt: string
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const addError = useErrorStore((s) => s.addError)

  const loadContacts = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await grpcClient.getContacts()
      setContacts(result)
    } catch (err) {
      console.error('Failed to load contacts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadAllUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const users = await grpcClient.getAllUsers()
      setAllUsers(users)
    } catch (err) {
      console.error('Failed to load all users:', err)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  const searchUsers = useCallback(async (query: string): Promise<User[]> => {
    if (!query.trim()) return allUsers
    try {
      const users = await grpcClient.getAllUsers()
      const q = query.toLowerCase()
      return users.filter(
        (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    } catch (err) {
      console.error('Failed to search users:', err)
      return []
    }
  }, [allUsers])

  const addContact = useCallback(async (userId: string, username: string) => {
    try {
      const success = await grpcClient.addContact(userId, username)
      if (success) await loadContacts()
      return success
    } catch (err) {
      addError({ message: 'Не удалось добавить контакт', type: 'network' })
      return false
    }
  }, [loadContacts, addError])

  const removeContact = useCallback(async (userId: string) => {
    try {
      const success = await grpcClient.removeContact(userId)
      if (success) await loadContacts()
      return success
    } catch (err) {
      addError({ message: 'Не удалось удалить контакт', type: 'network' })
      return false
    }
  }, [loadContacts, addError])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  return {
    contacts,
    allUsers,
    isLoading,
    isLoadingUsers,
    loadContacts,
    loadAllUsers,
    searchUsers,
    addContact,
    removeContact,
  }
}
