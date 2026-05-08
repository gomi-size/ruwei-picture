import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export function AdminOnly({ children }: { children: ReactNode }) {
  const { authReady, currentUser, isAdmin } = useAuth()

  if (!authReady) {
    return <p className="page-hint">加载中…</p>
  }
  if (!currentUser) {
    return (
      <div className="card access-card">
        <h2>需要登录</h2>
        <p>请使用右上角「登录」后，以管理员账号访问此页面。</p>
      </div>
    )
  }
  if (!isAdmin) {
    return (
      <div className="card access-card">
        <h2>权限不足</h2>
        <p>此功能仅限管理员。当前账号：{currentUser.userName || currentUser.userAccount}</p>
      </div>
    )
  }
  return <>{children}</>
}
