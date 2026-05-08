import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { userApi } from '../api/user'
import { pictureApi } from '../api/picture'
import { useAuth } from '../context/AuthContext'
import { GraphicCaptcha, type GraphicCaptchaRef } from '../components/GraphicCaptcha'

type NavState = { isActive: boolean }

function navClass({ isActive }: NavState) {
  return isActive ? 'nav-link active' : 'nav-link'
}

export function MainLayout() {
  const navigate = useNavigate()
  const { currentUser, setCurrentUser, logout, loginModalVisible, hideLoginModal } = useAuth()

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ userAccount: '', userPassword: '', checkPassword: '' })
  const [authMessage, setAuthMessage] = useState('')
  const [authPopoverOpen, setAuthPopoverOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState({ userName: '', userAvatar: '', userProfile: '' })
  const [profileMessage, setProfileMessage] = useState('')
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [createUserForm, setCreateUserForm] = useState({ userName: '', userAccount: '', userRole: 'user' })
  const [createUserMessage, setCreateUserMessage] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [userPictures, setUserPictures] = useState<any[]>([])
  const [loadingPictures, setLoadingPictures] = useState(false)
  const [profileSearchText, setProfileSearchText] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [tagCategory, setTagCategory] = useState<{ tagList: string[]; categoryList: string[] }>({ tagList: [], categoryList: [] })
  const authAnchorRef = useRef<HTMLDivElement>(null)
  const authModalRef = useRef<HTMLDivElement>(null)
  const captchaRef = useRef<GraphicCaptchaRef>(null)

  const resetAuthForm = () => {
    setAuthForm({ userAccount: '', userPassword: '', checkPassword: '' })
    setAuthMessage('')
    captchaRef.current?.refresh()
  }

  const onLogin = async () => {
    try {
      const captcha = captchaRef.current
      const user = await userApi.login({
        userAccount: authForm.userAccount,
        userPassword: authForm.userPassword,
        captchaKey: captcha?.captchaKey,
        captchaCode: captcha?.captchaCode,
      })
      if (user.token) {
        localStorage.setItem('satoken', user.token)
      }
      setCurrentUser(user)
      setAuthMessage('登录成功')
      setAuthPopoverOpen(false)
      hideLoginModal()
    } catch (error) {
      const msg = (error as Error).message || '登录失败'
      setAuthMessage(msg)
      if (msg.includes('验证码')) {
        captchaRef.current?.refresh()
      }
    }
  }

  const onRegister = async () => {
    try {
      const captcha = captchaRef.current
      await userApi.register({
        userAccount: authForm.userAccount,
        userPassword: authForm.userPassword,
        checkPassword: authForm.checkPassword,
        captchaKey: captcha?.captchaKey,
        captchaCode: captcha?.captchaCode,
      })
      setAuthMessage('注册成功，请登录')
      setAuthMode('login')
    } catch (error) {
      const msg = (error as Error).message || '注册失败'
      setAuthMessage(msg)
      if (msg.includes('验证码')) {
        captchaRef.current?.refresh()
      }
    }
  }

  const onCreateUser = async () => {
    if (!createUserForm.userAccount.trim() || !createUserForm.userName.trim()) {
      setCreateUserMessage('账号和昵称不能为空')
      return
    }
    setCreatingUser(true)
    try {
      const id = await userApi.add({
        userAccount: createUserForm.userAccount.trim(),
        userName: createUserForm.userName.trim(),
        userRole: createUserForm.userRole,
      })
      setCreateUserMessage(`创建成功！新用户 ID: ${id}，默认密码: 123456789`)
      setCreateUserForm({ userName: '', userAccount: '', userRole: 'user' })
    } catch (error) {
      setCreateUserMessage((error as Error).message || '创建失败')
    } finally {
      setCreatingUser(false)
    }
  }

  const onLogout = async () => {
    await logout()
    resetAuthForm()
    setAuthPopoverOpen(false)
    navigate('/', { replace: true })
  }

  const loadUserPictures = async () => {
    setLoadingPictures(true)
    try {
      const picturesPage = await pictureApi.listPublic({ 
        current: 1, 
        pageSize: 20,
        searchText: profileSearchText.trim() || undefined,
        tags: selectedTag ? [selectedTag] : undefined,
        category: selectedCategory || undefined,
      })
      setUserPictures(picturesPage.records || [])
    } catch (error) {
      console.error('加载图片失败:', error)
    } finally {
      setLoadingPictures(false)
    }
  }

  const onUpdateProfile = async () => {
    try {
      const result = await userApi.update({
        id: currentUser?.id,
        userName: profileForm.userName,
        userAvatar: profileForm.userAvatar,
        userProfile: profileForm.userProfile
      })
      if (result) {
        setProfileMessage('更新成功')
        // 更新当前用户信息
        const updatedUser = await userApi.current()
        setCurrentUser(updatedUser)
        // 关闭模态框
        setTimeout(() => {
          setShowProfileModal(false)
        }, 1000)
      }
    } catch (error) {
      setProfileMessage('更新失败: ' + (error as Error).message)
    }
  }

  useEffect(() => {
    if (showProfileModal && currentUser) {
      // 初始化表单数据
      setProfileForm({
        userName: currentUser.userName || '',
        userAvatar: currentUser.userAvatar || '',
        userProfile: currentUser.userProfile || ''
      })
      // 重置筛选条件
      setProfileSearchText('')
      setSelectedTag(null)
      setSelectedCategory(null)
      // 加载分类和标签
      const loadTagCategory = async () => {
        try {
          const data = await pictureApi.getTagCategory()
          setTagCategory(data)
        } catch (error) {
          console.error('加载分类和标签失败:', error)
        }
      }
      void loadTagCategory()
      // 加载用户图片
      void loadUserPictures()
    }
  }, [showProfileModal, currentUser])

  useEffect(() => {
    if (!authPopoverOpen) {
      return
    }
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const anchor = authAnchorRef.current
      const modal = authModalRef.current
      if (anchor && !anchor.contains(e.target as Node) && modal && !modal.contains(e.target as Node)) {
        setAuthPopoverOpen(false)
        hideLoginModal()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [authPopoverOpen])

  useEffect(() => {
    if (loginModalVisible) {
      setAuthPopoverOpen(true)
      setAuthMode('login')
      resetAuthForm()
    }
  }, [loginModalVisible])

  useEffect(() => {
    if (!authPopoverOpen) {
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAuthPopoverOpen(false)
        hideLoginModal()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [authPopoverOpen])

  return (
    <div className="page">
      {/* 通透吸顶 Header */}
      <header className="modern-header">
        <div className="modern-header-content">
          {/* 左侧：Logo + 标题 */}
          <div className="modern-header-brand">
            <svg className="modern-header-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="10" fill="url(#logo-gradient)"/>
              <path d="M20 10L28 14V26L20 30L12 26V14L20 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 14V26" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6"/>
                  <stop offset="1" stopColor="#8B5CF6"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="modern-header-title-group">
              <h1 className="modern-header-title">云批智能图库</h1>
              <span className="modern-header-divider">·</span>
              <p className="modern-header-subtitle">云端批量智能管理</p>
            </div>
          </div>

          {/* 中间：导航 */}
          <nav className="modern-header-nav" aria-label="主导航">
            <NavLink to="/" end className={({ isActive }) => `modern-nav-link${isActive ? ' active' : ''}`}>
              公开素材库
            </NavLink>
            <NavLink to="/pictures/create" className={({ isActive }) => `modern-nav-link${isActive ? ' active' : ''}`}>
              创建图片
            </NavLink>
            <NavLink to="/pictures/manage" className={({ isActive }) => `modern-nav-link${isActive ? ' active' : ''}`}>
              图片管理
            </NavLink>
            <NavLink to="/spaces" className={({ isActive }) => `modern-nav-link${isActive ? ' active' : ''}`}>
              空间管理
            </NavLink>
            {currentUser && (
              <NavLink to="/my-teams" className={({ isActive }) => `modern-nav-link${isActive ? ' active' : ''}`}>
                我的团队
              </NavLink>
            )}
          </nav>

          {/* 右侧：用户中心 */}
          <div className="modern-header-auth">
            {currentUser ? (
              <div className="user-menu-anchor" ref={authAnchorRef}>
                <button
                  type="button"
                  className="user-menu-trigger"
                  onClick={() => setAuthPopoverOpen(!authPopoverOpen)}
                >
                  {currentUser.userAvatar ? (
                    <img 
                      src={currentUser.userAvatar} 
                      alt={currentUser.userName || '用户'} 
                      className="user-avatar-img"
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {(currentUser.userName || currentUser.userAccount || '用').charAt(0)}
                    </div>
                  )}
                  <span className="user-menu-text">{currentUser.userName || currentUser.userAccount || '未登录'}</span>
                  <svg className="user-menu-arrow" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
                
                {authPopoverOpen && (
                  <div className="modern-user-menu">
                    <div className="modern-user-menu-header">
                      <div className="modern-user-menu-avatar">
                        {currentUser.userAvatar ? (
                          <img src={currentUser.userAvatar} alt="头像" />
                        ) : (
                          <div className="user-avatar-placeholder">
                            {(currentUser.userName || '用').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="modern-user-menu-info">
                        <div className="modern-user-menu-name">{currentUser.userName || currentUser.userAccount}</div>
                        <div className="modern-user-menu-account">{currentUser.userAccount}</div>
                        <div className="modern-user-menu-id">ID: {String(currentUser.id)}</div>
                      </div>
                    </div>
                    <div className="modern-user-menu-divider"></div>
                    {currentUser.userRole === 'admin' && (
                      <button 
                        type="button" 
                        className="modern-user-menu-item" 
                        onClick={() => { setShowCreateUserModal(true); setAuthPopoverOpen(false) }}
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
                        </svg>
                        创建用户
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="modern-user-menu-item" 
                      onClick={() => setShowProfileModal(true)}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                      </svg>
                      个人设置
                    </button>
                    <button 
                      type="button" 
                      className="modern-user-menu-item modern-user-menu-item-danger" 
                      onClick={() => void onLogout()}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414 0L4 7.414V14h10V7.414zM14 6l-4 4-4-4h8z" clipRule="evenodd"/>
                      </svg>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-menu-anchor" ref={authAnchorRef}>
                <button
                  type="button"
                  className="modern-login-btn"
                  onClick={() => {
                    setAuthPopoverOpen(true)
                    setAuthMode('login')
                    resetAuthForm()
                  }}
                >
                  登录
                </button>
                
                {authPopoverOpen && createPortal(
                  <div className="auth-modal-overlay" onClick={() => { setAuthPopoverOpen(false); hideLoginModal() }}>
                    <div className="modern-auth-modal" ref={authModalRef} onClick={(e) => e.stopPropagation()}>
                      <div className="modern-auth-popover-title">{authMode === 'login' ? '欢迎回来' : '创建账号'}</div>
                      <div className="modern-auth-fields">
                        <input
                          placeholder="账号"
                          autoComplete="username"
                          value={authForm.userAccount}
                          onChange={(e) => {
                            const val = e.target.value
                            setAuthForm(prev => ({
                              ...prev,
                              userAccount: val,
                              userPassword: val ? prev.userPassword : '',
                            }))
                          }}
                        />
                        <input
                          type="password"
                          placeholder="密码"
                          autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                          value={authForm.userPassword}
                          onChange={(e) => setAuthForm({ ...authForm, userPassword: e.target.value })}
                        />
                        {authMode === 'register' && (
                          <input
                            type="password"
                            placeholder="确认密码"
                            autoComplete="new-password"
                            value={authForm.checkPassword}
                            onChange={(e) => setAuthForm({ ...authForm, checkPassword: e.target.value })}
                          />
                        )}
                        <GraphicCaptcha ref={captchaRef} onCodeChange={() => {}} />
                        <button 
                          type="button" 
                          className="modern-auth-submit"
                          onClick={() => void (authMode === 'login' ? onLogin() : onRegister())}
                        >
                          {authMode === 'login' ? '登录' : '注册'}
                        </button>
                      </div>
                      <div className="modern-auth-footer">
                        {authMode === 'login' ? (
                          <button
                            type="button"
                            className="modern-auth-switch"
                            onClick={() => {
                              setAuthMode('register')
                              resetAuthForm()
                            }}
                          >
                            没有账号？<span>去注册</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="modern-auth-switch"
                            onClick={() => {
                              setAuthMode('login')
                              resetAuthForm()
                            }}
                          >
                            已有账号？<span>去登录</span>
                          </button>
                        )}
                      </div>
                      {authMessage && (
                        <p className="modern-auth-message">{authMessage}</p>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 个人设置模态框 */}
      {showProfileModal && (
        <div className="detail-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="detail-panel card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="detail-panel-header">
              <h2>个人设置</h2>
              <button className="detail-close" onClick={() => setShowProfileModal(false)}>
                关闭
              </button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <div className="create-field" style={{ marginBottom: '8px' }}>
                <label className="create-field-label" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>用户 ID</label>
                <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: '#374151' }}>
                  {String(currentUser.id)}
                </span>
              </div>
              <div className="create-field">
                <label className="create-field-label">用户名</label>
                <input 
                  type="text" 
                  className="create-input" 
                  value={profileForm.userName} 
                  onChange={(e) => setProfileForm({ ...profileForm, userName: e.target.value })}
                />
              </div>
              <div className="create-field">
                <label className="create-field-label">个人简介</label>
                <input 
                  type="text" 
                  className="create-input" 
                  value={profileForm.userProfile} 
                  onChange={(e) => setProfileForm({ ...profileForm, userProfile: e.target.value })}
                />
              </div>
              <div className="create-field">
                <label className="create-field-label">选择头像</label>
                <div style={{ marginBottom: '12px' }}>
                  <img 
                    src={profileForm.userAvatar || `https://ui-avatars.com/api/?name=${profileForm.userName || 'User'}&background=2563eb&color=fff`} 
                    alt="当前头像" 
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                </div>

                {/* 关键词搜索 */}
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="create-input"
                    placeholder="输入关键字检索图片"
                    value={profileSearchText}
                    onChange={(e) => setProfileSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void loadUserPictures()
                      }
                    }}
                  />
                </div>

                {/* 分类筛选 */}
                {tagCategory.categoryList.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <label className="create-field-label" style={{ marginBottom: '6px' }}>分类</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {tagCategory.categoryList.map((category) => (
                        <button 
                          key={category} 
                          type="button" 
                          className={`tag-btn ${selectedCategory === category ? 'active' : ''}`}
                          onClick={() => {
                            const next = selectedCategory === category ? null : category
                            setSelectedCategory(next)
                          }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 标签筛选 */}
                <div style={{ marginBottom: '12px' }}>
                  <label className="create-field-label" style={{ marginBottom: '6px' }}>标签</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      className={`tag-btn ${selectedTag === null ? 'active' : ''}`}
                      onClick={() => setSelectedTag(null)}
                    >
                      全部
                    </button>
                    {tagCategory.tagList.map((tag) => (
                      <button 
                        key={tag} 
                        type="button" 
                        className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
                        onClick={() => {
                          const next = selectedTag === tag ? null : tag
                          setSelectedTag(next)
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 搜索按钮 */}
                <div style={{ marginBottom: '12px' }}>
                  <button 
                    type="button"
                    className="create-btn"
                    onClick={() => void loadUserPictures()}
                  >
                    搜索
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', maxHeight: '300px', overflowY: 'auto', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  {loadingPictures ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
                      <p>加载中...</p>
                    </div>
                  ) : userPictures.length > 0 ? (
                    userPictures.map((pic) => (
                      <div 
                        key={pic.id} 
                        style={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          padding: '8px',
                          borderRadius: '8px',
                          border: profileForm.userAvatar === pic.url ? '2px solid #2563eb' : '2px solid transparent',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => setProfileForm({ ...profileForm, userAvatar: pic.url })}
                      >
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          borderRadius: '8px', 
                          overflow: 'hidden',
                          marginBottom: '6px'
                        }}>
                          <img src={pic.url} alt={pic.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%' }}>
                          {pic.name || `图片 #${pic.id}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                      <p>暂无图片</p>
                    </div>
                  )}
                </div>
              </div>
              {profileMessage && (
                <p style={{ marginTop: '16px', color: profileMessage.includes('成功') ? '#10b981' : '#ef4444' }}>
                  {profileMessage}
                </p>
              )}
              <button 
                className="create-btn create-btn--primary" 
                onClick={() => void onUpdateProfile()}
                style={{ marginTop: '20px' }}
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateUserModal && (
        <div className="detail-overlay" onClick={() => setShowCreateUserModal(false)}>
          <div className="detail-panel card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="detail-panel-header">
              <h2>创建用户</h2>
              <button className="detail-close" onClick={() => setShowCreateUserModal(false)}>
                关闭
              </button>
            </div>
            <div style={{ padding: '8px 0' }}>
              <div className="create-field">
                <label className="create-field-label">账号</label>
                <input 
                  type="text" 
                  className="create-input" 
                  placeholder="请输入用户账号（至少 4 位）"
                  value={createUserForm.userAccount} 
                  onChange={(e) => setCreateUserForm({ ...createUserForm, userAccount: e.target.value })}
                />
              </div>
              <div className="create-field">
                <label className="create-field-label">昵称</label>
                <input 
                  type="text" 
                  className="create-input" 
                  placeholder="请输入用户昵称"
                  value={createUserForm.userName} 
                  onChange={(e) => setCreateUserForm({ ...createUserForm, userName: e.target.value })}
                />
              </div>
              <div className="create-field">
                <label className="create-field-label">角色</label>
                <select 
                  className="create-input" 
                  value={createUserForm.userRole}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, userRole: e.target.value })}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '12px 0 0' }}>
                默认密码：<code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>123456789</code>
              </p>
              {createUserMessage && (
                <p style={{ 
                  marginTop: '16px', 
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  background: createUserMessage.includes('成功') ? '#ecfdf5' : '#fef2f2',
                  color: createUserMessage.includes('成功') ? '#065f46' : '#991b1b',
                  border: `1px solid ${createUserMessage.includes('成功') ? '#a7f3d0' : '#fecaca'}`
                }}>
                  {createUserMessage}
                </p>
              )}
              <button 
                className="create-btn create-btn--primary" 
                onClick={() => void onCreateUser()}
                disabled={creatingUser}
                style={{ marginTop: '20px' }}
              >
                {creatingUser ? '创建中…' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="main-layout-body">
        <main className="main-outlet">
          <Outlet />
        </main>
      </div>
    </div>
  )
}