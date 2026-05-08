import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '../api/user'
import { AdminOnly } from '../components/AdminOnly'
import { EditUserModal } from '../components/EditUserModal'
import { formatDate } from '../utils/format'
import type { UserVO, UserUpdateRequest } from '../types/api'

interface Toast {
  type: 'success' | 'error' | 'info'
  message: string
}

export function UserManagePage() {
  return (
    <AdminOnly>
      <UserManageInner />
    </AdminOnly>
  )
}

function UserManageInner() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserVO[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  
  // 编辑相关状态
  const [editingUser, setEditingUser] = useState<UserVO | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // 删除确认相关状态
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const page = await userApi.list({ current: 1, pageSize: 50 })
      setUsers(page.records || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const handleCreateUser = () => {
    navigate('/user/create')
  }

  const handleEditUser = (user: UserVO) => {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const handleDeleteUser = (user: UserVO) => {
    setDeletingUserId(user.id)
  }

  const confirmDelete = async () => {
    if (!deletingUserId) return
    
    setLoading(true)
    try {
      await userApi.delete(deletingUserId)
      setToast({ type: 'success', message: '用户删除成功' })
      await loadUsers()
    } catch (error: any) {
      setToast({ type: 'error', message: error?.message || '删除失败，请稍后重试' })
    } finally {
      setLoading(false)
      setDeletingUserId(null)
    }
  }

  const cancelDelete = () => {
    setDeletingUserId(null)
  }

  const handleUpdateUser = async (data: UserUpdateRequest) => {
    try {
      await userApi.update(data)
      setToast({ type: 'success', message: '用户更新成功' })
      setShowEditModal(false)
      setEditingUser(null)
      await loadUsers()
    } catch (error: any) {
      setToast({ type: 'error', message: error?.message || '更新失败，请稍后重试' })
      throw error
    }
  }

  if (loading) {
    return <p className="page-hint">加载中…</p>
  }

  return (
    <section className="admin-layout">
      {/* Toast 提示 */}
      {toast && (
        <div className={`toast toast--${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}

      <div className="card table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>用户列表</h2>
          <button 
            className="tag-btn active" 
            onClick={handleCreateUser}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            创建用户
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>账号</th>
                <th>昵称</th>
                <th>角色</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="page-muted">
                    暂无用户数据
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.userAccount}</td>
                    <td>{u.userName || '—'}</td>
                    <td>{u.userRole || '—'}</td>
                    <td>{formatDate(u.createTime)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="tag-btn"
                          onClick={() => handleEditUser(u)}
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          编辑
                        </button>
                        <button
                          className="tag-btn"
                          onClick={() => handleDeleteUser(u)}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.85rem',
                            backgroundColor: '#fef2f2',
                            borderColor: '#fecaca',
                            color: '#dc2626'
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑用户模态框 */}
      <EditUserModal
        open={showEditModal}
        user={editingUser}
        onClose={() => {
          setShowEditModal(false)
          setEditingUser(null)
        }}
        onSubmit={handleUpdateUser}
      />

      {/* 删除确认对话框 */}
      {deletingUserId && (
        <div className="detail-overlay" role="presentation" onClick={cancelDelete}>
          <div
            className="detail-panel card"
            style={{ width: 'min(450px, 100%)' }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="detail-panel-header">
              <h2 id="delete-confirm-title" style={{ color: '#dc2626' }}>确认删除</h2>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ margin: 0, fontSize: '1rem', color: '#374151' }}>
                确定要删除该用户吗？
              </p>
              <p className="page-muted" style={{ margin: '12px 0 0', fontSize: '0.85rem' }}>
                此操作不可恢复，用户数据将被永久删除。
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="create-footer-cta"
                onClick={cancelDelete}
                disabled={loading}
              >
                取消
              </button>
              <button
                type="button"
                className="create-btn create-btn--primary"
                onClick={confirmDelete}
                disabled={loading}
                style={{ 
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626'
                }}
              >
                {loading ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
