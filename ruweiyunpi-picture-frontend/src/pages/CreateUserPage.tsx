import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '../api/user'
import { AdminOnly } from '../components/AdminOnly'
import { ImageGallerySelector } from '../components/ImageGallerySelector'
import type { UserAddRequest } from '../types/api'

interface Toast {
  type: 'success' | 'error' | 'info'
  message: string
}

export function CreateUserPage() {
  return (
    <AdminOnly>
      <CreateUserInner />
    </AdminOnly>
  )
}

function CreateUserInner() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [showImageSelector, setShowImageSelector] = useState(false)
  
  const [formData, setFormData] = useState<UserAddRequest>({
    userName: '',
    userAccount: '',
    userPassword: '',
    checkPassword: '',
    userProfile: '',
    userAvatar: '',
    userRole: 'user',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // 账号验证
    if (!formData.userAccount || formData.userAccount.trim() === '') {
      newErrors.userAccount = '账号不能为空'
    } else if (formData.userAccount.length < 4) {
      newErrors.userAccount = '账号长度至少 4 位'
    }

    // 昵称验证
    if (!formData.userName || formData.userName.trim() === '') {
      newErrors.userName = '昵称不能为空'
    }

    // 密码验证
    if (!formData.userPassword) {
      newErrors.userPassword = '密码不能为空'
    } else if (formData.userPassword.length < 8) {
      newErrors.userPassword = '密码长度至少 8 位'
    }

    // 确认密码验证
    if (!formData.checkPassword) {
      newErrors.checkPassword = '请确认密码'
    } else if (formData.userPassword !== formData.checkPassword) {
      newErrors.checkPassword = '两次输入的密码不一致'
    }

    // 角色验证
    if (!formData.userRole) {
      newErrors.userRole = '请选择角色'
    } else if (!['user', 'admin'].includes(formData.userRole)) {
      newErrors.userRole = '角色类型不合法'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // 清除对应字段的错误
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
      setToast({ type: 'error', message: '请检查表单填写是否正确' })
      return
    }

    setLoading(true)
    try {
      // 准备提交数据（不包含 checkPassword）
      const submitData: UserAddRequest = {
        userName: formData.userName?.trim(),
        userAccount: formData.userAccount.trim(),
        userProfile: formData.userProfile?.trim(),
        userAvatar: formData.userAvatar?.trim(),
        userRole: formData.userRole,
      }

      const userId = await userApi.add(submitData)
      
      setToast({ 
        type: 'success', 
        message: `用户创建成功！ID: ${userId}` 
      })
      
      // 清空表单
      setFormData({
        userName: '',
        userAccount: '',
        userPassword: '',
        checkPassword: '',
        userProfile: '',
        userAvatar: '',
        userRole: 'user',
      })
      setErrors({})
      
      // 3 秒后自动返回列表页
      setTimeout(() => {
        navigate('/user/manage')
      }, 3000)
    } catch (error: any) {
      const errorMsg = error?.message || '创建用户失败，请稍后重试'
      setToast({ type: 'error', message: errorMsg })
    } finally {
      setLoading(false)
    }
  }

  const handleBackToList = () => {
    navigate('/user/manage')
  }

  const handleContinueCreate = () => {
    setFormData({
      userName: '',
      userAccount: '',
      userPassword: '',
      checkPassword: '',
      userProfile: '',
      userAvatar: '',
      userRole: 'user',
    })
    setErrors({})
    setToast(null)
  }

  const handleImageSelect = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, userAvatar: imageUrl }))
  }

  return (
    <section className="create-page">
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

      {/* 图片选择器 */}
      <ImageGallerySelector
        open={showImageSelector}
        onClose={() => setShowImageSelector(false)}
        onSelect={handleImageSelect}
        initialValue={formData.userAvatar}
      />

      {/* 头部区域 */}
      <div className="create-hero">
        <p className="create-eyebrow">管理员功能</p>
        <h1 className="create-title">创建新用户</h1>
        <p className="create-lead">
          填写以下表单以创建新用户账户。新用户的初始密码将设置为表单中指定的密码。
        </p>
      </div>

      {/* 表单区域 */}
      <form onSubmit={handleSubmit}>
        <div className="create-grid">
          {/* 左侧：基本信息 */}
          <div className="create-panel">
            <div className="create-panel-head">
              <div className="create-panel-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div>
                <h3 className="create-panel-title">基本信息</h3>
                <p className="create-panel-desc">填写用户的账户和昵称</p>
              </div>
            </div>

            <div className="create-field">
              <label className="create-field-label">
                账号 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="userAccount"
                className="create-input"
                placeholder="请输入用户账号（至少 4 位）"
                value={formData.userAccount}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.userAccount && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                  {errors.userAccount}
                </p>
              )}
            </div>

            <div className="create-field">
              <label className="create-field-label">
                昵称 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="userName"
                className="create-input"
                placeholder="请输入用户昵称"
                value={formData.userName}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.userName && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                  {errors.userName}
                </p>
              )}
            </div>

            <div className="create-field">
              <label className="create-field-label">角色 <span style={{ color: '#dc2626' }}>*</span></label>
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
          </div>

          {/* 右侧：密码信息 */}
          <div className="create-panel create-panel--accent">
            <div className="create-panel-head">
              <div className="create-panel-icon create-panel-icon--accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div>
                <h3 className="create-panel-title">密码设置</h3>
                <p className="create-panel-desc">设置用户的登录密码</p>
              </div>
            </div>

            <div className="create-field">
              <label className="create-field-label">
                密码 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                name="userPassword"
                className="create-input"
                placeholder="请输入密码（至少 8 位）"
                value={formData.userPassword}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.userPassword && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                  {errors.userPassword}
                </p>
              )}
            </div>

            <div className="create-field">
              <label className="create-field-label">
                确认密码 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                name="checkPassword"
                className="create-input"
                placeholder="请再次输入密码"
                value={formData.checkPassword}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.checkPassword && (
                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                  {errors.checkPassword}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 可选信息 */}
        <div className="create-panel">
          <div className="create-panel-head">
            <div className="create-panel-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div>
              <h3 className="create-panel-title">可选信息</h3>
              <p className="create-panel-desc">完善用户的额外信息（可选）</p>
            </div>
          </div>

          <div className="create-field">
            <label className="create-field-label">头像 URL</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="url"
                name="userAvatar"
                className="create-input"
                placeholder="请输入头像图片链接或从图库选择"
                value={formData.userAvatar}
                onChange={handleChange}
                disabled={loading}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="tag-btn"
                onClick={() => setShowImageSelector(true)}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                从图库选择
              </button>
            </div>
            {formData.userAvatar && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={formData.userAvatar}
                  alt="avatar preview"
                  style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <span className="page-muted" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {formData.userAvatar}
                </span>
              </div>
            )}
          </div>

          <div className="create-field">
            <label className="create-field-label">个人简介</label>
            <textarea
              name="userProfile"
              className="create-input"
              placeholder="请输入用户简介"
              value={formData.userProfile}
              onChange={handleChange}
              disabled={loading}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="create-footer">
          <button
            type="button"
            className="create-footer-cta"
            onClick={handleBackToList}
            disabled={loading}
          >
            返回列表
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="create-btn create-btn--secondary"
              onClick={handleContinueCreate}
              disabled={loading}
            >
              继续创建
            </button>
            <button
              type="submit"
              className="create-btn create-btn--primary"
              disabled={loading}
            >
              {loading ? '创建中…' : '创建用户'}
            </button>
          </div>
        </div>
      </form>

      {/* 功能说明 */}
      <ul className="create-features">
        <li>
          <span className="create-feature-dot"></span>
          <span>账号长度至少 4 位，请确保唯一性</span>
        </li>
        <li>
          <span className="create-feature-dot"></span>
          <span>密码长度至少 8 位，系统会自动加密存储</span>
        </li>
        <li>
          <span className="create-feature-dot"></span>
          <span>创建成功后可继续创建或返回列表</span>
        </li>
      </ul>
    </section>
  )
}
