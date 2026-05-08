import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { spaceApi, spaceUserApi } from '../api/space'
import { Popconfirm } from '../components/Popconfirm'
import { useAuth } from '../context/AuthContext'
import type { SpaceUserVO, SpaceVO } from '../types/api'

export function TeamSpacePage() {
  const { spaceId } = useParams<{ spaceId: string }>()
  const { currentUser } = useAuth()
  const [space, setSpace] = useState<SpaceVO | null>(null)
  const [members, setMembers] = useState<SpaceUserVO[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [membersLoading, setMembersLoading] = useState(false)
  const [memberId, setMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('viewer')
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')
  const [errorPopup, setErrorPopup] = useState<string | null>(null)

  const PERMISSION_NAME_MAP: Record<string, string> = {
    'spaceUser:manage': '空间成员管理权限',
    'picture:view': '图片查看权限',
    'picture:upload': '图片上传权限',
    'picture:edit': '图片编辑权限',
    'picture:delete': '图片删除权限',
  }

  const translateError = (msg: string): string => {
    let result = msg
    for (const [key, value] of Object.entries(PERMISSION_NAME_MAP)) {
      result = result.replace(key, value)
    }
    return result
  }

  const loadSpace = useCallback(async () => {
    if (!spaceId) return
    setLoading(true)
    setLoadError('')
    try {
      console.log('[TeamSpace] 加载空间, spaceId:', spaceId)
      const data = await spaceApi.getById(spaceId)
      console.log('[TeamSpace] 空间数据:', data)
      setSpace(data)
    } catch (err) {
      const msg = (err as Error).message || '未知错误'
      console.error('[TeamSpace] 加载空间详情失败:', msg, err)
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  const loadMembers = useCallback(async () => {
    if (!spaceId) return
    setMembersLoading(true)
    try {
      const list = await spaceUserApi.list({ spaceId })
      setMembers(list || [])
    } catch (err) {
      console.error('加载成员列表失败:', err)
    } finally {
      setMembersLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    loadSpace()
    loadMembers()
  }, [loadSpace, loadMembers])

  const onAddMember = async () => {
    if (!spaceId || !memberId.trim()) {
      setMessage('请输入成员 ID')
      return
    }
    setAdding(true)
    setMessage('')
    try {
      await spaceUserApi.add({ userId: memberId.trim(), spaceId, spaceRole: selectedRole })
      setMessage('添加成员成功')
      setMemberId('')
      await loadMembers()
    } catch (err) {
      setErrorPopup(translateError((err as Error).message))
    } finally {
      setAdding(false)
    }
  }

  const onRoleChange = async (id: string, newRole: string) => {
    try {
      await spaceUserApi.edit({ id, spaceRole: newRole })
      setMessage('角色修改成功')
      await loadMembers()
    } catch (err) {
      setErrorPopup(translateError((err as Error).message))
    }
  }

  const onRemoveMember = async (id: string) => {
    try {
      await spaceUserApi.delete(id)
      setMessage('移除成员成功')
      await loadMembers()
    } catch (err) {
      setErrorPopup(translateError((err as Error).message))
    }
  }

  const roleOptions = [
    { value: 'admin', label: '管理员' },
    { value: 'editor', label: '编辑者' },
    { value: 'viewer', label: '浏览者' },
  ]

  const roleLabel = (role: string) => {
    const r = roleOptions.find((o) => o.value === role)
    return r ? r.label : role
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  return (
    <div className="team-space-page">
      {loading ? (
        <div className="my-teams-loading">
          <div className="my-teams-spinner"></div>
          <p>加载空间信息...</p>
        </div>
      ) : !space ? (
        <div className="my-teams-empty">
          <h2>空间加载失败</h2>
          {loadError && <p style={{ color: '#ef4444', marginBottom: '16px' }}>错误: {loadError}</p>}
          <p>请确认已登录且有访问权限</p>
          <Link to="/my-teams" className="my-teams-create-btn">返回团队列表</Link>
        </div>
      ) : (
        <>
          {/* 空间头部信息 */}
          <div className="team-space-header">
            <div className="team-space-header-top">
              <div className="team-space-header-left">
                <div className="team-space-avatar">
                  {(space.spaceName || '团').charAt(0)}
                </div>
                <div>
                  <h1 className="team-space-name">{space.spaceName || '未命名空间'}</h1>
                  <div className="team-space-meta">
                    <span className="team-space-badge">团队空间</span>
                    <span>成员 {members.length} 人</span>
                    <span>ID: {space.id}</span>
                  </div>
                </div>
              </div>
              <div className="team-space-header-actions">
                <Link to={`/my-teams`} className="team-space-btn team-space-btn--secondary">
                  返回列表
                </Link>
                <Link to={`/spaces/${space.id}/pictures/view`} className="team-space-btn team-space-btn--primary">
                  素材库
                </Link>
              </div>
            </div>
          </div>

          {message && (
            <div className={`team-space-message ${message.includes('成功') ? 'team-space-message--success' : 'team-space-message--error'}`}>
              {message}
            </div>
          )}

          {/* 添加成员 */}
          <div className="team-space-card">
            <h3 className="team-space-card-title">添加成员</h3>
            <div className="team-space-add-row">
              <input
                type="text"
                placeholder="请输入用户 ID"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onAddMember() }}
                className="team-space-input"
              />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="team-space-role-select team-space-role--admin"
              >
                {roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="team-space-btn team-space-btn--primary"
                onClick={onAddMember}
                disabled={adding || !memberId.trim()}
              >
                {adding ? '添加中...' : '添加成员'}
              </button>
            </div>
          </div>

          {/* 成员列表 */}
          <div className="team-space-card">
            <div className="team-space-card-header">
              <h3 className="team-space-card-title">
                成员列表 <span className="team-space-count">({members.length} 人)</span>
              </h3>
              {membersLoading && <span className="team-space-loading-tag">加载中...</span>}
            </div>

            {members.length === 0 ? (
              <div className="team-space-empty-list">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <p>暂无成员</p>
                <p className="team-space-sub-text">添加成员开始协作</p>
              </div>
            ) : (
              <div className="team-space-table-wrap">
                <table className="team-space-table">
                  <thead>
                    <tr>
                      <th>用户信息</th>
                      <th>空间角色</th>
                      <th>加入时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="team-space-member">
                            <img
                              src={m.user?.userAvatar || `https://ui-avatars.com/api/?name=${m.user?.userName || 'U'}&background=3b82f6&color=fff`}
                              alt=""
                              className="team-space-member-avatar"
                            />
                            <div>
                              <div className="team-space-member-name">{m.user?.userName || '用户' + m.userId}</div>
                              <div className="team-space-member-id">ID: {m.userId}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            value={m.spaceRole}
                            onChange={(e) => onRoleChange(m.id, e.target.value)}
                            className={`team-space-role-select team-space-role--${m.spaceRole}`}
                          >
                            {roleOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="team-space-date">{formatDate(m.createTime)}</td>
                        <td>
                          <Popconfirm
                            title="确定要移除该成员吗？"
                            description="此操作不可逆。"
                            confirmText="确定移除"
                            cancelText="取消"
                            onConfirm={() => onRemoveMember(m.id)}
                          >
                            <button type="button" className="team-space-remove-btn">
                              移除
                            </button>
                          </Popconfirm>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 错误弹窗 */}
      {errorPopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setErrorPopup(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              width: '420px',
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
              操作失败
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.5' }}>
              {errorPopup}
            </p>
            <button
              type="button"
              onClick={() => setErrorPopup(null)}
              style={{
                padding: '8px 32px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6' }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
