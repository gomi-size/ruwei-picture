import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { spaceApi } from '../api/space'
import { useAuth } from '../context/AuthContext'
import { Popconfirm } from '../components/Popconfirm'
import type { SpaceVO, SpaceLevel } from '../types/api'

export function SpaceManagePage() {
  return (
    <SpaceManageInner />
  )
}

function SpaceManageInner() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [spaces, setSpaces] = useState<SpaceVO[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [spaceLevels, setSpaceLevels] = useState<SpaceLevel[]>([])
  const [selectedSpace, setSelectedSpace] = useState<SpaceVO | null>(null)
  const [editingSpace, setEditingSpace] = useState<SpaceVO | null>(null)
  const [addingSpace, setAddingSpace] = useState<boolean>(false)
  const [addForm, setAddForm] = useState({
    spaceName: '',
    spaceLevel: 0,
    spaceType: 0
  })
  const [editForm, setEditForm] = useState({
    spaceName: '',
    spaceLevel: 0,
    spaceType: 0,
    maxSize: 0,
    maxCount: 0
  })
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const loadSpaces = useCallback(async () => {
    setLoading(true)
    try {
      let spacesPage
      // 管理员查看所有空间，普通用户只查看自己的空间
      if (currentUser?.userRole === 'admin') {
        spacesPage = await spaceApi.listByPage({ 
          current: 1, 
          pageSize: 100
        })
      } else {
        spacesPage = await spaceApi.listByPageVO({ 
          current: 1, 
          pageSize: 100,
          userId: currentUser?.id
        })
      }
      setSpaces(spacesPage.records || [])
    } catch (error) {
      console.error('加载空间列表失败:', error)
      showToast('error', '加载空间列表失败：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  const hasPrivateSpace = spaces.some(s => (s.spaceType ?? 0) === 0)
  const hasTeamSpace = spaces.some(s => (s.spaceType ?? 0) === 1)
  const canAddSpace = currentUser?.userRole === 'admin' || !hasPrivateSpace || !hasTeamSpace

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  const loadSpaceLevels = useCallback(async () => {
    try {
      const levels = await spaceApi.listLevel()
      setSpaceLevels(levels || [])
    } catch (error) {
      console.error('加载空间级别失败:', error)
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      void loadSpaces()
      void loadSpaceLevels()
    }
  }, [loadSpaces, loadSpaceLevels, currentUser])

  const onAddSpace = async () => {
    if (!addForm.spaceName.trim()) {
      showToast('error', '请输入空间名称')
      return
    }
    
    try {
      await spaceApi.add({
        spaceName: addForm.spaceName.trim(),
        spaceLevel: addForm.spaceLevel,
        spaceType: addForm.spaceType
      })
      setAddingSpace(false)
      setAddForm({ spaceName: '', spaceLevel: 0, spaceType: 0 })
      showToast('success', '空间创建成功！')
      await loadSpaces()
    } catch (error) {
      console.error('添加空间失败:', error)
      showToast('error', '添加空间失败：' + (error as Error).message)
    }
  }

  const onDeleteSpace = async (id: number | string) => {
    try {
      await spaceApi.delete(id)
      showToast('success', '空间删除成功！')
      await loadSpaces()
    } catch (error) {
      console.error('删除空间失败:', error)
      showToast('error', '删除空间失败：' + (error as Error).message)
    }
  }

  const onEditSpace = async (id: number | string) => {
    try {
      const spaceDetail = await spaceApi.getById(id)
      setEditingSpace(spaceDetail)
      setEditForm({
        spaceName: spaceDetail.spaceName || '',
        spaceLevel: spaceDetail.spaceLevel || 0,
        spaceType: spaceDetail.spaceType ?? 0,
        maxSize: spaceDetail.maxSize || 0,
        maxCount: spaceDetail.maxCount || 0
      })
    } catch (error) {
      console.error('获取空间详情失败:', error)
      showToast('error', '获取空间详情失败：' + (error as Error).message)
    }
  }

  const onSaveSpace = async () => {
    if (!editingSpace) return

    const isAdmin = currentUser?.userRole === 'admin'

    try {
      if (isAdmin) {
        await spaceApi.update({
          id: editingSpace.id,
          spaceName: editForm.spaceName,
          spaceLevel: editForm.spaceLevel,
          spaceType: editForm.spaceType,
          maxSize: editForm.maxSize,
          maxCount: editForm.maxCount
        })
      } else {
        await spaceApi.edit({
          id: editingSpace.id,
          spaceName: editForm.spaceName,
          spaceType: editForm.spaceType
        })
      }
      setEditingSpace(null)
      showToast('success', '空间更新成功！')
      await loadSpaces()
    } catch (error) {
      console.error('更新空间失败:', error)
      showToast('error', '更新空间失败：' + (error as Error).message)
    }
  }

  const formatSize = (bytes: number | null | undefined) => {
    const num = Number(bytes ?? 0)
    if (!Number.isFinite(num) || num === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(num) / Math.log(k))
    return Math.round(num / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getLevelText = (value: number | null | undefined) => {
    if (value == null) return '未知'
    const level = spaceLevels.find(l => l.value === value)
    return level ? level.text : `级别 ${value}`
  }

  if (loading) {
    return <p className="page-hint">加载中…</p>
  }

  if (!currentUser) {
    return (
      <div className="card access-card">
        <h2>需要登录</h2>
        <p>请使用右上角登录后访问此页面。</p>
      </div>
    )
  }

  return (
    <section className="space-manage-page">
      {toast && (
        <div className={`toast toast--${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '❌'}
            {toast.type === 'info' && 'ℹ️'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>
            {currentUser?.userRole === 'admin' ? '空间管理（管理员视图）' : '我的空间'}
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
              共 {spaces.length} 个空间
            </p>
            <button
              type="button"
              className="create-btn create-btn--primary"
              onClick={() => navigate('/spaces/analyze')}
              style={{
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
              }}
            >
              空间分析
            </button>
            {/* 普通用户可以每类各创建一个空间 */}
            <button 
              type="button" 
              className="create-btn create-btn--primary"
              onClick={() => {
                const nextType = hasPrivateSpace ? 1 : 0
                setAddForm({ spaceName: '', spaceLevel: 0, spaceType: nextType })
                setAddingSpace(true)
              }}
              disabled={!canAddSpace}
              style={{ 
                padding: '10px 20px',
                fontSize: '0.9rem',
                fontWeight: '600',
                opacity: canAddSpace ? 1 : 0.6,
                cursor: canAddSpace ? 'pointer' : 'not-allowed'
              }}
              title={
                currentUser?.userRole === 'admin' 
                  ? '创建新空间' 
                  : hasPrivateSpace && hasTeamSpace 
                    ? '私有空间和团队空间各限一个，已达上限' 
                    : '创建新空间'
              }
            >
              + 添加空间
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="page-hint">加载中…</p>
        ) : spaces.length === 0 ? (
          <p className="page-muted">暂无空间数据</p>
        ) : (
          <div className="space-list">
            {spaces.map((space) => {
              const isTeam = (space.spaceType ?? 0) === 1
              return (
              <div 
                key={space.id} 
                className="space-item card" 
                style={{ 
                  marginBottom: '16px', 
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                  borderLeft: `4px solid ${isTeam ? '#8b5cf6' : '#3b82f6'}`,
                  borderRadius: '12px',
                  background: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {space.spaceName || `空间 #${space.id}`}
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: isTeam ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        color: isTeam ? '#7c3aed' : '#2563eb',
                        whiteSpace: 'nowrap'
                      }}>
                        {isTeam ? '团队空间' : '私有空间'}
                      </span>
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>空间级别</span>
                        <span style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '500' }}>
                          {getLevelText(space.spaceLevel)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>容量限制</span>
                        <span style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '500' }}>
                          {formatSize(space.maxSize)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>数量限制</span>
                        <span style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '500' }}>
                          {space.maxCount || 0} 张
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>已用容量</span>
                        <span style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '500' }}>
                          {formatSize(space.totalSize ?? 0)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>已存数量</span>
                        <span style={{ fontSize: '0.95rem', color: '#111827', fontWeight: '500' }}>
                          {space.totalCount ?? 0} 张
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>创建时间</span>
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                          {space.createTime ? new Date(space.createTime).toLocaleString() : '—'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      <span>创建用户：{space.user?.userName || space.user?.userAccount || `用户 ID ${space.userId}`}</span>
                      {space.editTime && (
                        <span style={{ marginLeft: '16px' }}>
                          最后编辑：{new Date(space.editTime).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="row-actions" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(currentUser?.userRole === 'admin' || currentUser?.id === space.userId) && (
                      <>
                        <button 
                          type="button" 
                          onClick={() => {
                            console.log('点击分析数据，空间 ID:', space.id)
                            navigate(`/spaces/analyze?spaceId=${space.id}`)
                          }}
                          style={{ 
                            backgroundColor: '#eff6ff', 
                            color: '#1d4ed8', 
                            borderColor: '#bfdbfe',
                            padding: '8px 16px',
                            transition: 'all 0.2s ease',
                            fontWeight: '600'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#dbeafe'
                            e.currentTarget.style.borderColor = '#93c5fd'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff'
                            e.currentTarget.style.borderColor = '#bfdbfe'
                          }}
                        >
                          数据分析
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            console.log('点击管理图片，空间 ID:', space.id)
                            navigate(`/spaces/${space.id}/pictures/view`)
                          }}
                          style={{ 
                            backgroundColor: '#f0fdf4', 
                            color: '#166534', 
                            borderColor: '#bbf7d0',
                            padding: '8px 16px',
                            transition: 'all 0.2s ease',
                            fontWeight: '600'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#dcfce7'
                            e.currentTarget.style.borderColor = '#86efac'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0fdf4'
                            e.currentTarget.style.borderColor = '#bbf7d0'
                          }}
                        >
                          管理图片
                        </button>
                        <button 
                          type="button" 
                          onClick={() => onEditSpace(space.id)}
                          style={{ 
                            backgroundColor: '#eff6ff', 
                            color: '#1d4ed8', 
                            borderColor: '#bfdbfe',
                            padding: '8px 16px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#dbeafe'
                            e.currentTarget.style.borderColor = '#93c5fd'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff'
                            e.currentTarget.style.borderColor = '#bfdbfe'
                          }}
                        >
                          编辑
                        </button>
                        <Popconfirm
                          title="确定要执行删除操作吗？"
                          description="此操作不可逆。"
                          confirmText="确定删除"
                          cancelText="取消"
                          onConfirm={() => onDeleteSpace(space.id)}
                        >
                          <button 
                            type="button" 
                            style={{ 
                              backgroundColor: '#fef2f2', 
                              color: '#dc2626', 
                              borderColor: '#fecaca',
                              padding: '8px 16px',
                              transition: 'all 0.2s ease',
                              minWidth: '60px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fee2e2'
                              e.currentTarget.style.borderColor = '#fca5a5'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef2f2'
                              e.currentTarget.style.borderColor = '#fecaca'
                            }}
                          >
                            删除
                          </button>
                        </Popconfirm>
                      </>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {addingSpace && (
        <div className="detail-overlay" onClick={() => setAddingSpace(false)}>
          <div className="detail-panel card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-header">
              <h2>添加空间</h2>
              <button className="detail-close" onClick={() => setAddingSpace(false)}>
                关闭
              </button>
            </div>

            <div style={{ 
              padding: '12px 16px', 
              marginBottom: '20px',
              background: '#eff6ff', 
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              color: '#1d4ed8',
              fontSize: '0.9rem'
            }}>
              <strong>提示：</strong> 私有空间和团队空间各限一个，请谨慎填写。
            </div>

            <div className="create-field">
              <label className="create-field-label">空间名称</label>
              <input 
                type="text" 
                className="create-input" 
                value={addForm.spaceName} 
                onChange={(e) => setAddForm({ ...addForm, spaceName: e.target.value })}
                placeholder="请输入空间名称（留空则自动生成）"
                autoFocus
              />
            </div>

            <div className="create-field">
              <label className="create-field-label">空间级别</label>
              <select 
                className="create-input" 
                value={addForm.spaceLevel}
                onChange={(e) => setAddForm({ ...addForm, spaceLevel: Number(e.target.value) })}
                style={{ width: '100%', padding: '12px 14px', fontSize: '0.95rem', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#ffffff' }}
              >
                {spaceLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.text}（{level.maxCount} 张 / {formatSize(level.maxSize)}）
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                提示：非管理员只能创建普通版空间
              </p>
            </div>

            <div className="create-field">
              <label className="create-field-label">空间类型</label>
              <select 
                className="create-input" 
                value={addForm.spaceType}
                onChange={(e) => setAddForm({ ...addForm, spaceType: Number(e.target.value) })}
                disabled={currentUser?.userRole !== 'admin' && hasPrivateSpace && hasTeamSpace}
                style={{ width: '100%', padding: '12px 14px', fontSize: '0.95rem', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#ffffff' }}
              >
                {currentUser?.userRole === 'admin' || !hasPrivateSpace ? (
                  <option value={0}>私有空间（仅自己使用）</option>
                ) : null}
                {currentUser?.userRole === 'admin' || !hasTeamSpace ? (
                  <option value={1}>团队空间（可协作管理）</option>
                ) : null}
              </select>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                私有空间：个人专属空间，仅自己可访问<br/>
                团队空间：可邀请成员协作，共同管理图片
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                className="create-btn create-btn--primary" 
                onClick={onAddSpace}
                style={{ flex: 1 }}
              >
                确认添加
              </button>
              <button 
                className="create-btn" 
                onClick={() => setAddingSpace(false)}
                style={{ flex: 1 }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSpace && (
        <div className="detail-overlay" onClick={() => setEditingSpace(null)}>
          <div className="detail-panel card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-header">
              <h2>编辑空间</h2>
              <button className="detail-close" onClick={() => setEditingSpace(null)}>
                关闭
              </button>
            </div>

            <div className="create-field">
              <label className="create-field-label">空间名称</label>
              <input 
                type="text" 
                className="create-input" 
                value={editForm.spaceName} 
                onChange={(e) => setEditForm({ ...editForm, spaceName: e.target.value })}
                placeholder="请输入空间名称"
              />
            </div>

            <div className="create-field">
              <label className="create-field-label">空间类型</label>
              <select 
                className="create-input" 
                value={editForm.spaceType}
                onChange={(e) => setEditForm({ ...editForm, spaceType: Number(e.target.value) })}
                style={{ width: '100%', padding: '12px 14px', fontSize: '0.95rem', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#ffffff' }}
              >
                <option value={0}>私有空间（仅自己使用）</option>
                <option value={1}>团队空间（可协作管理）</option>
              </select>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                私有空间：个人专属空间，仅自己可访问<br/>
                团队空间：可邀请成员协作，共同管理图片
              </p>
            </div>

            {currentUser?.userRole === 'admin' && (
              <>
                <div className="create-field">
                  <label className="create-field-label">空间级别</label>
                  <select 
                    className="create-input" 
                    value={editForm.spaceLevel}
                    onChange={(e) => {
                      const selectedLevel = Number(e.target.value)
                      const level = spaceLevels.find(l => l.value === selectedLevel)
                      setEditForm({ 
                        ...editForm, 
                        spaceLevel: selectedLevel,
                        maxSize: level?.maxSize || 0,
                        maxCount: level?.maxCount || 0
                      })
                    }}
                    style={{ width: '100%', padding: '12px 14px', fontSize: '0.95rem', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#ffffff' }}
                  >
                    {spaceLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.text}（{level.maxCount} 张 / {formatSize(level.maxSize)}）
                      </option>
                    ))}
                  </select>
                </div>

                <div className="create-field">
                  <label className="create-field-label">最大容量（MB）</label>
                  <input 
                    type="number" 
                    className="create-input" 
                    value={editForm.maxSize ? Math.round(editForm.maxSize / 1024 / 1024) : 0} 
                    onChange={(e) => setEditForm({ ...editForm, maxSize: Number(e.target.value) * 1024 * 1024 })}
                    placeholder="请输入最大容量（MB）"
                  />
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                    当前值：{formatSize(editForm.maxSize)}
                  </p>
                </div>

                <div className="create-field">
                  <label className="create-field-label">最大图片数量</label>
                  <input 
                    type="number" 
                    className="create-input" 
                    value={editForm.maxCount || 0} 
                    onChange={(e) => setEditForm({ ...editForm, maxCount: Number(e.target.value) })}
                    placeholder="请输入最大图片数量"
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                className="create-btn create-btn--primary" 
                onClick={onSaveSpace}
                style={{ flex: 1 }}
              >
                保存修改
              </button>
              <button 
                className="create-btn" 
                onClick={() => setEditingSpace(null)}
                style={{ flex: 1 }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
