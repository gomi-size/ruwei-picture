import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { spaceUserApi } from '../api/space'
import { spaceApi } from '../api/space'
import { Popconfirm } from '../components/Popconfirm'
import type { SpaceUserVO, SpaceVO } from '../types/api'

export function SpaceMemberManagePage() {
  const { spaceId } = useParams<{ spaceId: string }>()
  const [space, setSpace] = useState<SpaceVO | null>(null)
  const [members, setMembers] = useState<SpaceUserVO[]>([])
  const [loading, setLoading] = useState(false)
  const [memberId, setMemberId] = useState('')
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')
  const [editingMember, setEditingMember] = useState<SpaceUserVO | null>(null)
  const [editingRole, setEditingRole] = useState('')
  const [editSaving, setEditSaving] = useState(false)
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

  // 加载空间详情
  const loadSpaceDetail = useCallback(async () => {
    if (!spaceId) return
    try {
      const spaceData = await spaceApi.getById(spaceId)
      setSpace(spaceData)
    } catch (error) {
      console.error('加载空间详情失败:', error)
      setMessage('加载空间详情失败')
    }
  }, [spaceId])

  // 加载成员列表
  const loadMembers = useCallback(async () => {
    if (!spaceId) return
    setLoading(true)
    try {
      const memberList = await spaceUserApi.list({ spaceId })
      setMembers(memberList || [])
    } catch (error) {
      console.error('加载成员列表失败:', error)
      setMessage('加载成员列表失败')
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  // 添加成员
  const handleAddMember = async () => {
    if (!spaceId || !memberId.trim()) {
      setMessage('请输入成员 ID')
      return
    }

    setAdding(true)
    setMessage('')
    try {
      await spaceUserApi.add({
        userId: memberId.trim(),
        spaceId,
        spaceRole: 'member'
      })
      setMessage('添加成员成功')
      setMemberId('')
      await loadMembers()
    } catch (error) {
      setErrorPopup(translateError((error as Error).message))
    } finally {
      setAdding(false)
    }
  }

  // 打开编辑角色弹窗
  const handleOpenEdit = (member: SpaceUserVO) => {
    setEditingMember(member)
    setEditingRole(member.spaceRole)
    setMessage('')
  }

  // 关闭编辑角色弹窗
  const handleCloseEdit = () => {
    setEditingMember(null)
    setEditingRole('')
  }

  // 保存角色修改
  const handleSaveRole = async () => {
    if (!editingMember || !editingRole) return
    setEditSaving(true)
    try {
      await spaceUserApi.edit({
        id: editingMember.id,
        spaceRole: editingRole
      })
      setMessage('角色修改成功')
      handleCloseEdit()
      await loadMembers()
    } catch (error) {
      setErrorPopup(translateError((error as Error).message))
    } finally {
      setEditSaving(false)
    }
  }

  // 移除成员
  const handleRemoveMember = async (id: string) => {
    try {
      await spaceUserApi.delete(id)
      setMessage('移除成员成功')
      await loadMembers()
    } catch (error) {
      setErrorPopup(translateError((error as Error).message))
    }
  }

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  // 角色文本映射
  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: '管理员',
      editor: '编辑者',
      member: '普通成员'
    }
    return roleMap[role] || role
  }

  useEffect(() => {
    loadSpaceDetail()
    loadMembers()
  }, [loadSpaceDetail, loadMembers])

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: '600' }}>
          {space?.spaceName || '空间'} - 成员管理
        </h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          管理空间成员和角色权限
        </p>
      </div>

      {/* 消息提示 */}
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: message.includes('成功') ? '#ecfdf5' : '#fef2f2',
          color: message.includes('成功') ? '#065f46' : '#991b1b',
          border: `1px solid ${message.includes('成功') ? '#a7f3d0' : '#fecaca'}`
        }}>
          {message}
        </div>
      )}

      {/* 添加成员表单 */}
      <div style={{
        padding: '20px',
        marginBottom: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: '600' }}>
          添加成员
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="请输入成员 ID"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddMember()
              }
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            type="button"
            onClick={handleAddMember}
            disabled={adding || !memberId.trim()}
            style={{
              padding: '10px 24px',
              backgroundColor: adding || !memberId.trim() ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: adding || !memberId.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {adding ? '添加中...' : '添加成员'}
          </button>
        </div>
      </div>

      {/* 成员列表表格 */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
            成员列表 ({members.length} 人)
          </h3>
          {loading && (
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>加载中...</span>
          )}
        </div>

        {members.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.5 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p style={{ margin: '0 0 4px 0' }}>暂无成员</p>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>添加成员以开始协作</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>用户信息</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>空间角色</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>加入时间</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} style={{
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  >
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={member.user?.userAvatar || `https://ui-avatars.com/api/?name=${member.user?.userName || 'User'}&background=3b82f6&color=fff`}
                          alt={member.user?.userName || '用户'}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827' }}>
                            {member.user?.userName || '用户' + member.userId}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            ID: {member.userId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        backgroundColor: member.spaceRole === 'admin' ? '#dbeafe' : member.spaceRole === 'editor' ? '#fef3c7' : '#f3f4f6',
                        color: member.spaceRole === 'admin' ? '#1e40af' : member.spaceRole === 'editor' ? '#92400e' : '#374151',
                        fontWeight: '500'
                      }}>
                        {getRoleText(member.spaceRole)}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid #f3f4f6',
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      {formatDate(member.createTime)}
                    </td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(member)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#dbeafe'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff'
                          }}
                        >
                          编辑
                        </button>
                        <Popconfirm
                          title={`确定要移除成员 ${member.user?.userName || member.userId} 吗？`}
                          description="移除后将无法访问此空间。"
                          confirmText="确定移除"
                          cancelText="取消"
                          onConfirm={() => handleRemoveMember(member.id)}
                        >
                          <button
                            type="button"
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fee2e2'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef2f2'
                            }}
                          >
                            移除
                          </button>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 编辑角色弹窗 */}
      {editingMember && (
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
          onClick={handleCloseEdit}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              width: '400px',
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              transform: editingMember ? 'scale(1)' : 'scale(0.95)',
              transition: 'transform 0.2s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.125rem', fontWeight: '600' }}>
                编辑成员角色
              </h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                {editingMember.user?.userName || '用户' + editingMember.userId}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                空间角色
              </label>
              <select
                value={editingRole}
                onChange={(e) => setEditingRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="admin">管理员</option>
                <option value="editor">编辑者</option>
                <option value="member">普通成员</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={editSaving}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: editSaving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!editSaving) e.currentTarget.style.backgroundColor = '#e5e7eb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={editSaving}
                style={{
                  padding: '8px 20px',
                  backgroundColor: editSaving ? '#93c5fd' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: editSaving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!editSaving) e.currentTarget.style.backgroundColor = '#2563eb'
                }}
                onMouseLeave={(e) => {
                  if (!editSaving) e.currentTarget.style.backgroundColor = '#3b82f6'
                }}
              >
                {editSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6'
              }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
