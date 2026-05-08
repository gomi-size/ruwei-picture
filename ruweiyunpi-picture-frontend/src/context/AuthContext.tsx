import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { userApi } from '../api/user'
import type { LoginUserVO } from '../types/api'

type AuthContextValue = {
  currentUser: LoginUserVO | null
  authReady: boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  setCurrentUser: (u: LoginUserVO | null) => void
  loginModalVisible: boolean
  showLoginModal: () => void
  hideLoginModal: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<LoginUserVO | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loginModalVisible, setLoginModalVisible] = useState(false)

  const showLoginModal = useCallback(() => setLoginModalVisible(true), [])
  const hideLoginModal = useCallback(() => setLoginModalVisible(false), [])

  const refreshUser = useCallback(async () => {
    try {
      const u = await userApi.current()
      setCurrentUser(u)
    } catch {
      setCurrentUser(null)
    } finally {
      setAuthReady(true)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const logout = useCallback(async () => {
    await userApi.logout()
    localStorage.removeItem('satoken')
    setCurrentUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      authReady,
      isAdmin: currentUser?.userRole === 'admin',
      refreshUser,
      logout,
      setCurrentUser,
      loginModalVisible,
      showLoginModal,
      hideLoginModal,
    }),
    [currentUser, authReady, refreshUser, logout, loginModalVisible, showLoginModal, hideLoginModal],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
