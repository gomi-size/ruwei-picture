import { useEffect, useState } from 'react'
import type { UserVO, UserUpdateRequest } from '../types/api'

type Props = {
  open: boolean
  user: UserVO | null
  onClose: () => void
  onSubmit: (data: UserUpdateRequest) => Promise<void>
}

export function EditUserModal({ open, user, onClose, onSubmit }: Props) {
  const [formData, setFormData] = useState<UserUpdateRequest>({
    id: 0,
    userName: '',
    userAvatar: '',
    userProfile: '',
    userRole: 'user',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user && open) {
      setFormData({
        id: user.id,
        userName: user.userName || '',
        userAvatar: user.userAvatar || '',
        userProfile: user.userProfile || '',
        userRole: user.userRole || 'user',
      })
      setErrors({})
    }
  }, [user, open])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.userName || formData.userName.trim() === '') {
      newErrors.userName = '昵称不能为空'
    }

    if (!formData.userRole || !['user', 'admin'].includes(formData.userRole)) {
      newErrors.userRole = '角色类型不合法'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!open || !user) return null

  return (
    <div className="detail-overlay" role="presentation" onClick={onClose}>
      <div
        className="detail-panel card"
        style={{ width: 'min(600px, 100%)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-panel-header">
          <h2 id="edit-user-title">编辑用户</h2>
          <button type="button" className="detail-close" onClick={onClose}>
            关闭
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {/* 账号（只读） */}
            <div className="create-field">
              <label className="create-field-label">账号</label>
              <input
                type="text"
                className="create-input"
                value={user.userAccount}
                disabled
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
              />
              <p className="page-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                账号不可修改
              </p>
            </div>

            {/* 昵称 */}
            <div className="create-field">
              <label className="create-field-label">
                昵称 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="userName"
                className="create-input"
                value={formData.userName}
                onChange={handleChange}
                disabled={loading}
                placeholder="请输入用户昵称"
              />
              {errors.userName && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                  {errors.userName}
                </p>
              )}
            </div>

            {/* 角色 */}
            <div className="create-field">
              <label className="create-field-label">
                角色 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                name="userRole"
                className="create-input"
                value={formData.userRole}
                onChange={handleChange}
                disabled={loading}
                style={{ cursor: 'pointer' }}
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
              {errors.userRole && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                  {errors.userRole}
                </p>
              )}
            </div>

            {/* 头像 URL */}
            <div className="create-field">
              <label className="create-field-label">头像 URL</label>
              <input
                type="url"
                name="userAvatar"
                className="create-input"
                value={formData.userAvatar}
                onChange={handleChange}
                disabled={loading}
                placeholder="请输入头像图片链接"
              />
              {formData.userAvatar && (
                <div style={{ marginTop: '10px' }}>
                  <img
                    src={formData.userAvatar}
                    alt="avatar preview"
                    style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* 个人简介 */}
            <div className="create-field">
              <label className="create-field-label">个人简介</label>
              <textarea
                name="userProfile"
                className="create-input"
                value={formData.userProfile}
                onChange={handleChange}
                disabled={loading}
                placeholder="请输入用户简介"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ 
            marginTop: '24px', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px' 
          }}>
            <button
              type="button"
              className="create-footer-cta"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="create-btn create-btn--primary"
              disabled={loading}
            >
              {loading ? '保存中…' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
