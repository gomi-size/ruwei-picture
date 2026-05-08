import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pictureApi } from '../api/picture'
import { useAuth } from '../context/AuthContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Popconfirm } from '../components/Popconfirm'
import { canManagePictures } from '../utils/permissions'
import type { DialogButton } from '../components/ConfirmDialog'
import type { PictureVO } from '../types/api'

export function PictureManagePage() {
  return (
    <PictureManageInner />
  )
}

interface Toast {
  type: 'success' | 'error' | 'info'
  message: string
}

function PictureManageInner() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const isUserAdmin = currentUser ? canManagePictures(currentUser) : false
  const [activeTab, setActiveTab] = useState<'my' | 'review'>(isUserAdmin ? 'review' : 'my')
  const [userPictures, setUserPictures] = useState<PictureVO[]>([])
  const [reviewPictures, setReviewPictures] = useState<PictureVO[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [selectedPicture, setSelectedPicture] = useState<PictureVO | null>(null)
  const [editingPicture, setEditingPicture] = useState<PictureVO | null>(null)
  const [editingLoading, setEditingLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    introduction: '',
    tags: [] as string[],
    category: ''
  })
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    buttons: DialogButton[]
  } | null>(null)
  const [userPicturesCurrent, setUserPicturesCurrent] = useState(1)
  const [userPicturesHasMore, setUserPicturesHasMore] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const userPicturesPageSize = 20

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'my') {
        console.log('查询我的图片，userId:', currentUser?.id)
        const picturesPage = await pictureApi.listPictureByPageAdmin({ 
          current: 1, 
          pageSize: userPicturesPageSize,
          userId: currentUser?.id
        })
        console.log('我的图片查询结果:', picturesPage)
        console.log('第一条数据的tags:', picturesPage.records?.[0]?.tags)
        console.log('tags类型:', typeof picturesPage.records?.[0]?.tags, Array.isArray(picturesPage.records?.[0]?.tags))
        
        // 处理tags字段：如果是JSON字符串，转换为数组
        const processedRecords = (picturesPage.records || []).map(pic => {
          if (pic.tags && typeof pic.tags === 'string') {
            try {
              return { ...pic, tags: JSON.parse(pic.tags as any) }
            } catch (e) {
              console.error('解析tags失败:', e)
              return { ...pic, tags: [] }
            }
          }
          return pic
        })
        
        setUserPictures(processedRecords)
        setUserPicturesCurrent(1)
        setUserPicturesHasMore((picturesPage.records?.length || 0) >= userPicturesPageSize)
      } else if (activeTab === 'review') {
        console.log('查询待审核图片')
        const picturesPage = await pictureApi.listPictureByPageAdmin({ 
          current: 1, 
          pageSize: 100,
          reviewStatus: 0
        })
        console.log('待审核图片查询结果:', picturesPage)
        
        // 处理tags字段
        const processedRecords = (picturesPage.records || []).map(pic => {
          if (pic.tags && typeof pic.tags === 'string') {
            try {
              return { ...pic, tags: JSON.parse(pic.tags as any) }
            } catch (e) {
              console.error('解析tags失败:', e)
              return { ...pic, tags: [] }
            }
          }
          return pic
        })
        
        setReviewPictures(processedRecords)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id, activeTab])

  const loadMoreUserPictures = useCallback(async () => {
    if (loadingMore || !userPicturesHasMore || activeTab !== 'my') return
    
    setLoadingMore(true)
    try {
      const nextPage = userPicturesCurrent + 1
      const picturesPage = await pictureApi.listPictureByPageAdmin({ 
        current: nextPage, 
        pageSize: userPicturesPageSize,
        userId: currentUser?.id
      })
      const rawRecords = picturesPage.records || []
      
      // 处理tags字段
      const newRecords = rawRecords.map(pic => {
        if (pic.tags && typeof pic.tags === 'string') {
          try {
            return { ...pic, tags: JSON.parse(pic.tags as any) }
          } catch (e) {
            console.error('解析tags失败:', e)
            return { ...pic, tags: [] }
          }
        }
        return pic
      })
      
      setUserPictures(prev => [...prev, ...newRecords])
      setUserPicturesCurrent(nextPage)
      setUserPicturesHasMore(newRecords.length >= userPicturesPageSize)
    } catch (error) {
      console.error('加载更多图片失败:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, userPicturesHasMore, userPicturesCurrent, activeTab, currentUser?.id])

  const loadTagsAndCategories = useCallback(async () => {
    try {
      const tagCategory = await pictureApi.getTagCategory()
      setAvailableTags(tagCategory.tagList || [])
      setAvailableCategories(tagCategory.categoryList || [])
    } catch (error) {
      console.error('加载标签和分类失败:', error)
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      void loadData()
      void loadTagsAndCategories()
    }
  }, [loadData, loadTagsAndCategories, currentUser])

  useEffect(() => {
    if (activeTab !== 'my') return

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // 当滚动到距离底部 300px 时加载更多
      if (scrollTop + windowHeight >= documentHeight - 300) {
        void loadMoreUserPictures()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeTab, loadMoreUserPictures])

  useEffect(() => {
    // 切换 tab 时重置分页状态
    setUserPicturesCurrent(1)
    setUserPicturesHasMore(true)
  }, [activeTab])

  const onDeletePicture = async (id: string) => {
    try {
      await pictureApi.delete(id)
      showToast('success', '图片删除成功！')
      await loadData()
    } catch (error) {
      console.error('删除图片失败:', error)
      showToast('error', '删除图片失败：' + (error as Error).message)
    }
  }

  const onDownloadPicture = (id: string, pic: PictureVO) => {
    setConfirmDialog({
      title: '下载图片',
      message: `确定要下载${pic.name ? `"${pic.name}"` : '这张图片'}吗？`,
      buttons: [
        { label: '取消', onClick: () => {}, variant: 'secondary' },
        {
          label: '确认下载',
          variant: 'primary',
          onClick: async () => {
            try {
              const blob = await pictureApi.download(id)
              const url = window.URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = pic.name ? `${pic.name}.jpg` : `picture_${id}.jpg`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              window.URL.revokeObjectURL(url)
              showToast('success', '图片下载成功！')
            } catch (error) {
              console.error('下载图片失败:', error)
              showToast('error', '下载图片失败：' + (error as Error).message)
            }
          }
        }
      ]
    })
  }

  const onApprovePicture = (id: string, pic: PictureVO) => {
    setConfirmDialog({
      title: '审核通过',
      message: `确定要通过${pic.name ? `"${pic.name}"` : '这张图片'}的审核吗？`,
      buttons: [
        { label: '取消', onClick: () => {}, variant: 'secondary' },
        {
          label: '确认通过',
          variant: 'primary',
          onClick: async () => {
            try {
              await pictureApi.review({ id, reviewStatus: 1 })
              showToast('success', '图片审核通过！')
              await loadData()
            } catch (error) {
              console.error('审核图片失败:', error)
              showToast('error', '审核失败：' + (error as Error).message)
            }
          }
        }
      ]
    })
  }

  const onRejectPicture = (id: string, pic: PictureVO) => {
    setConfirmDialog({
      title: '审核拒绝',
      message: `确定要拒绝${pic.name ? `"${pic.name}"` : '这张图片'}吗？拒绝后将删除该图片。`,
      buttons: [
        { label: '取消', onClick: () => {}, variant: 'secondary' },
        {
          label: '确认拒绝',
          variant: 'danger',
          onClick: async () => {
            try {
              await pictureApi.review({ id, reviewStatus: 2 })
              showToast('success', '图片已拒绝并删除！')
              await loadData()
            } catch (error) {
              console.error('审核图片失败:', error)
              showToast('error', '审核失败：' + (error as Error).message)
            }
          }
        }
      ]
    })
  }

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  const onEditPicture = async (id: string) => {
    setEditingPicture(editingPicture => {
      if (editingPicture?.id === id) return editingPicture
      return null
    })
    setEditForm({ name: '', introduction: '', tags: [], category: '' })
    setEditingLoading(true)
    try {
      const pictureDetail = await pictureApi.getVoById(id)
      const tags = Array.isArray(pictureDetail.tags)
        ? pictureDetail.tags
        : typeof pictureDetail.tags === 'string'
          ? (() => { try { const p = JSON.parse(pictureDetail.tags); return Array.isArray(p) ? p : []; } catch { return []; } })()
          : []

      setEditingPicture(pictureDetail)
      setEditForm({
        name: pictureDetail.name || '',
        introduction: pictureDetail.introduction || '',
        tags,
        category: pictureDetail.category || ''
      })
    } catch (error) {
      console.error('获取图片详情失败:', error)
      setEditingPicture(null)
    } finally {
      setEditingLoading(false)
    }
  }

  const onSavePicture = async () => {
    if (!editingPicture) return
    
    try {
      const payload = {
        id: editingPicture.id,
        name: editForm.name || undefined,
        introduction: editForm.introduction || undefined,
        tags: editForm.tags.length > 0 ? editForm.tags : undefined,
        category: editForm.category || undefined
      }
      
      await pictureApi.edit(payload)
      showToast('success', '图片信息更新成功！')
    } catch (error) {
      console.error('更新图片失败:', error)
      showToast('error', '更新失败：' + (error as Error).message)
    }
    
    setEditingPicture(null)
    await loadData()
  }

  const toggleTag = (tag: string) => {
    setEditForm(prev => {
      const currentTags = prev.tags || []
      if (currentTags.includes(tag)) {
        return { ...prev, tags: currentTags.filter(t => t !== tag) }
      } else {
        return { ...prev, tags: [...currentTags, tag] }
      }
    })
  }

  const onViewPictureDetail = async (id: string) => {
    try {
      const pictureDetail = await pictureApi.getVoById(id)
      setSelectedPicture(pictureDetail)
    } catch (error) {
      console.error('获取图片详情失败:', error)
    }
  }

  if (loading) {
    return <p className="page-hint">加载中…</p>
  }

  if (!currentUser) {
    return (
      <div className="card access-card">
        <h2>需要登录</h2>
        <p>请使用右上角「登录」后访问此页面。</p>
      </div>
    )
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

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>图片管理</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className={`tag-btn ${activeTab === 'my' ? 'active' : ''}`}
              onClick={() => setActiveTab('my')}
            >
              我的图片
            </button>
            {isUserAdmin && (
              <button 
                type="button" 
                className={`tag-btn ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => setActiveTab('review')}
              >
                待审核图片
              </button>
            )}
            <button 
              type="button" 
              className="create-btn create-btn--primary"
              onClick={() => navigate('/spaces')}
            >
              空间管理
            </button>
          </div>
        </div>
        <p>图片条数（当前页）：{activeTab === 'my' ? userPictures.length : reviewPictures.length}</p>
      </div>
      <div className="card">
        {loading ? (
          <p className="page-hint">加载中…</p>
        ) : activeTab === 'my' ? (
          <>
            {userPictures.length === 0 ? (
              <p className="page-muted">
                暂无数据 {currentUser?.id ? `（当前用户 ID: ${currentUser.id}）` : '（请先登录）'}
              </p>
            ) : (
              userPictures.map((pic) => (
              <div className="picture-item card" key={pic.id} style={{ marginBottom: '16px', padding: '16px', cursor: 'pointer' }} onClick={() => onViewPictureDetail(pic.id)}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flexShrink: 0, width: '120px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    <img src={pic.thumbnailUrl || pic.url} alt={pic.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h3 style={{ margin: '0', fontSize: '1rem', fontWeight: '600' }}>
                        {pic.name || `图片 #${pic.id}`}
                      </h3>
                      {pic.reviewStatus != null && (
                        <span style={{
                          flexShrink: 0,
                          padding: '2px 10px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: pic.reviewStatus === 1 ? '#d1fae5' : pic.reviewStatus === 2 ? '#fef2f2' : '#fef3c7',
                          color: pic.reviewStatus === 1 ? '#065f46' : pic.reviewStatus === 2 ? '#991b1b' : '#92400e',
                          border: `1px solid ${pic.reviewStatus === 1 ? '#a7f3d0' : pic.reviewStatus === 2 ? '#fecaca' : '#fde68a'}`
                        }}>
                          {pic.reviewStatus === 1 ? '已通过' : pic.reviewStatus === 2 ? '已拒绝' : '待审核'}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: '#6b7280' }}>
                      {pic.introduction || '无描述'}
                    </p>
                    <div style={{ marginBottom: '8px' }}>
                      {pic.tags && Array.isArray(pic.tags) && pic.tags.length > 0 ? (
                        pic.tags.map((tag, index) => (
                          <span key={`${pic.id}-tag-${tag}-${index}`} className="tag" style={{ marginRight: '6px', marginBottom: '4px', display: 'inline-block' }}>
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>无标签</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      <span className="tag" style={{ marginRight: '6px', marginBottom: '4px', display: 'inline-block' }}>分类: {pic.category || '未分类'}</span>
                      <span style={{ marginLeft: '16px' }}>大小: {pic.picSize ? `${(pic.picSize / 1024).toFixed(2)}KB` : '未知'}</span>
                      <span style={{ marginLeft: '16px' }}>尺寸: {pic.picWidth && pic.picHeight ? `${pic.picWidth}x${pic.picHeight}` : '未知'}</span>
                      <span style={{ marginLeft: '16px' }}>格式: {pic.picFormat || '未知'}</span>
                      <div style={{ marginTop: '4px' }}>
                        <span>上传用户: {pic.userId ? `用户 ID ${pic.userId}` : '未知'}</span>
                        <span style={{ marginLeft: '16px' }}>创建时间: {new Date(pic.createTime).toLocaleString()}</span>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span>更新时间: {new Date(pic.updateTime).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="row-actions" style={{ flexShrink: 0, alignSelf: 'flex-start', display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={(e) => {
                      e.stopPropagation();
                      onDownloadPicture(pic.id, pic);
                    }} style={{ 
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      backgroundColor: '#d1fae5', 
                      color: '#065f46', 
                      borderColor: '#a7f3d0',
                      border: '1px solid',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: '8px'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#a7f3d0';
                      e.currentTarget.style.borderColor = '#6ee7b7';
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#d1fae5';
                      e.currentTarget.style.borderColor = '#a7f3d0';
                    }}>
                      下载
                    </button>
                    <button type="button" onClick={(e) => {
                      e.stopPropagation();
                      onEditPicture(pic.id);
                    }} style={{ 
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      backgroundColor: '#eff6ff', 
                      color: '#1d4ed8', 
                      borderColor: '#bfdbfe',
                      border: '1px solid',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: '8px'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#dbeafe';
                      e.currentTarget.style.borderColor = '#93c5fd';
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                      e.currentTarget.style.borderColor = '#bfdbfe';
                    }}>
                      编辑
                    </button>
                    <Popconfirm
                      title="确定要执行删除操作吗？"
                      description="此操作不可逆。"
                      confirmText="确定删除"
                      cancelText="取消"
                      onConfirm={() => onDeletePicture(pic.id)}
                    >
                      <button type="button" onClick={(e) => {
                        e.stopPropagation();
                      }} style={{ 
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        backgroundColor: '#fef2f2', 
                        color: '#dc2626', 
                        borderColor: '#fecaca',
                        border: '1px solid',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginBottom: '8px'
                      }} onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                        e.currentTarget.style.borderColor = '#fca5a5';
                      }} onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef2f2';
                        e.currentTarget.style.borderColor = '#fecaca';
                      }}>
                        删除
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              </div>
            ))
            )}
            {loadingMore && (
              <p className="page-hint" style={{ textAlign: 'center', padding: '20px' }}>加载中...</p>
            )}
            {!loadingMore && !userPicturesHasMore && userPictures.length > 0 && (
              <p className="page-muted" style={{ textAlign: 'center', padding: '20px' }}>没有更多图片了</p>
            )}
          </>
        ) : (
          reviewPictures.length === 0 ? (
            <p className="page-muted">暂无待审核图片</p>
          ) : (
            reviewPictures.map((pic) => (
              <div className="picture-item card" key={pic.id} style={{ marginBottom: '16px', padding: '16px', cursor: 'pointer' }} onClick={() => onViewPictureDetail(pic.id)}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flexShrink: 0, width: '120px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    <img src={pic.thumbnailUrl || pic.url} alt={pic.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h3 style={{ margin: '0', fontSize: '1rem', fontWeight: '600' }}>
                        {pic.name || `图片 #${pic.id}`}
                      </h3>
                      {pic.reviewStatus != null && (
                        <span style={{
                          flexShrink: 0,
                          padding: '2px 10px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: pic.reviewStatus === 1 ? '#d1fae5' : pic.reviewStatus === 2 ? '#fef2f2' : '#fef3c7',
                          color: pic.reviewStatus === 1 ? '#065f46' : pic.reviewStatus === 2 ? '#991b1b' : '#92400e',
                          border: `1px solid ${pic.reviewStatus === 1 ? '#a7f3d0' : pic.reviewStatus === 2 ? '#fecaca' : '#fde68a'}`
                        }}>
                          {pic.reviewStatus === 1 ? '已通过' : pic.reviewStatus === 2 ? '已拒绝' : '待审核'}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: '#6b7280' }}>
                      {pic.introduction || '无描述'}
                    </p>
                    <div style={{ marginBottom: '8px' }}>
                      {pic.tags && Array.isArray(pic.tags) && pic.tags.length > 0 ? (
                        pic.tags.map((tag, index) => (
                          <span key={`${pic.id}-tag-${tag}-${index}`} className="tag" style={{ marginRight: '6px', marginBottom: '4px', display: 'inline-block' }}>
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>无标签</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      <span className="tag" style={{ marginRight: '6px', marginBottom: '4px', display: 'inline-block' }}>分类: {pic.category || '未分类'}</span>
                      <span style={{ marginLeft: '16px' }}>大小: {pic.picSize ? `${(pic.picSize / 1024).toFixed(2)}KB` : '未知'}</span>
                      <span style={{ marginLeft: '16px' }}>尺寸: {pic.picWidth && pic.picHeight ? `${pic.picWidth}x${pic.picHeight}` : '未知'}</span>
                      <span style={{ marginLeft: '16px' }}>格式: {pic.picFormat || '未知'}</span>
                      <div style={{ marginTop: '4px' }}>
                        <span>上传用户: {pic.userId ? `用户 ID ${pic.userId}` : '未知'}</span>
                        <span style={{ marginLeft: '16px' }}>创建时间: {new Date(pic.createTime).toLocaleString()}</span>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span>更新时间: {new Date(pic.updateTime).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="row-actions" style={{ flexShrink: 0, alignSelf: 'flex-start', display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={(e) => {
                      e.stopPropagation();
                      onDownloadPicture(pic.id, pic);
                    }} style={{ 
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      backgroundColor: '#d1fae5', 
                      color: '#065f46', 
                      borderColor: '#a7f3d0',
                      border: '1px solid',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: '8px'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#a7f3d0';
                      e.currentTarget.style.borderColor = '#6ee7b7';
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#d1fae5';
                      e.currentTarget.style.borderColor = '#a7f3d0';
                    }}>
                      下载
                    </button>
                    <button type="button" onClick={(e) => {
                      e.stopPropagation();
                      onApprovePicture(pic.id, pic);
                    }} style={{ 
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      backgroundColor: '#d1fae5', 
                      color: '#065f46', 
                      borderColor: '#a7f3d0',
                      border: '1px solid',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: '8px'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#a7f3d0';
                      e.currentTarget.style.borderColor = '#6ee7b7';
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#d1fae5';
                      e.currentTarget.style.borderColor = '#a7f3d0';
                    }}>
                      通过
                    </button>
                    <button type="button" onClick={(e) => {
                      e.stopPropagation();
                      onRejectPicture(pic.id, pic);
                    }} style={{ 
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      backgroundColor: '#fef2f2', 
                      color: '#dc2626', 
                      borderColor: '#fecaca',
                      border: '1px solid',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: '8px'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                      e.currentTarget.style.borderColor = '#fecaca';
                    }}>
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
      {selectedPicture && (
        <div className="detail-overlay" onClick={() => setSelectedPicture(null)}>
          <div className="detail-panel card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-header">
              <h2>图片详情</h2>
              <button className="detail-close" onClick={() => setSelectedPicture(null)}>
                关闭
              </button>
            </div>
            <div className="detail-body">
              <div className="detail-image-wrap">
                <img src={selectedPicture.url} alt={selectedPicture.name} />
              </div>
              <dl className="detail-meta">
                <div>
                  <dt>图片名称</dt>
                  <dd>{selectedPicture.name || '未命名'}</dd>
                </div>
                <div>
                  <dt>描述</dt>
                  <dd>{selectedPicture.introduction || '无描述'}</dd>
                </div>
                <div>
                  <dt>标签</dt>
                  <dd>
                    {selectedPicture.tags && Array.isArray(selectedPicture.tags) && selectedPicture.tags.length > 0 ? (
                      selectedPicture.tags.map((tag, index) => (
                        <span key={`${selectedPicture.id}-tag-${tag}-${index}`} className="tag detail-tag">{tag}</span>
                      ))
                    ) : (
                      '无标签'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>分类</dt>
                  <dd><span className="tag detail-tag">{selectedPicture.category || '未分类'}</span></dd>
                </div>
                <div>
                  <dt>格式 / 尺寸</dt>
                  <dd>
                    {selectedPicture.picFormat || '—'} ·{' '}
                    {selectedPicture.picWidth != null && selectedPicture.picHeight != null
                      ? `${selectedPicture.picWidth} × ${selectedPicture.picHeight}`
                      : '—'}
                    {selectedPicture.picScale != null ? `（比例 ${selectedPicture.picScale}）` : ''}
                  </dd>
                </div>
                <div>
                  <dt>文件大小</dt>
                  <dd>{selectedPicture.picSize ? `${(selectedPicture.picSize / 1024).toFixed(2)}KB` : '—'}</dd>
                </div>
                <div>
                  <dt>审核状态</dt>
                  <dd>
                    {selectedPicture.reviewStatus != null ? (
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        backgroundColor: selectedPicture.reviewStatus === 1 ? '#d1fae5' : selectedPicture.reviewStatus === 2 ? '#fef2f2' : '#fef3c7',
                        color: selectedPicture.reviewStatus === 1 ? '#065f46' : selectedPicture.reviewStatus === 2 ? '#991b1b' : '#92400e'
                      }}>
                        {selectedPicture.reviewStatus === 1 ? '已通过' : selectedPicture.reviewStatus === 2 ? '已拒绝' : '待审核'}
                      </span>
                    ) : '未知'}
                    {selectedPicture.reviewMessage && (
                      <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#6b7280' }}>
                        ({selectedPicture.reviewMessage})
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>上传用户</dt>
                  <dd>
                    {selectedPicture.userId != null
                      ? `用户 ID ${selectedPicture.userId}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>{new Date(selectedPicture.createTime).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>更新时间</dt>
                  <dd>{new Date(selectedPicture.updateTime).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
            <div className="detail-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="create-btn" onClick={() => setSelectedPicture(null)}>
                关闭
              </button>
              <Popconfirm
                title="确定要执行删除操作吗？"
                description="此操作不可逆。"
                confirmText="确定删除"
                cancelText="取消"
                onConfirm={async () => {
                  await pictureApi.delete(selectedPicture.id)
                  setSelectedPicture(null)
                  await loadData()
                }}
              >
                <button className="create-btn" style={{ 
                  backgroundColor: '#fef2f2', 
                  color: '#dc2626', 
                  borderColor: '#fecaca',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                  e.currentTarget.style.borderColor = '#fca5a5';
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                  e.currentTarget.style.borderColor = '#fecaca';
                }}>
                  删除
                </button>
              </Popconfirm>
              <button className="create-btn create-btn--primary" onClick={() => {
                setSelectedPicture(null)
                onEditPicture(selectedPicture.id)
              }}>
                编辑
              </button>
            </div>
          </div>
        </div>
      )}
      {editingPicture && (
        <div className="detail-overlay" onClick={() => setEditingPicture(null)}>
          <div className="detail-panel card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-header">
              <h2>编辑图片</h2>
              <button className="detail-close" onClick={() => setEditingPicture(null)}>
                关闭
              </button>
            </div>
            
            {editingLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>加载中…</div>
            ) : (
              <>
            {/* 图片名称 */}
            <div className="create-field">
              <label className="create-field-label">图片名称</label>
              <input 
                type="text" 
                className="create-input" 
                placeholder="请输入图片名称"
                value={editForm.name} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            
            {/* 图片简介 */}
            <div className="create-field">
              <label className="create-field-label">简介</label>
              <textarea 
                className="create-input" 
                placeholder="请输入图片简介"
                rows={3}
                value={editForm.introduction} 
                onChange={(e) => setEditForm({ ...editForm, introduction: e.target.value })}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>
            
            {/* 图片分类 */}
            <div className="create-field">
              <label className="create-field-label">分类</label>
              <select 
                className="create-input" 
                value={editForm.category} 
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                style={{ cursor: 'pointer' }}
              >
                <option value="">请选择分类</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* 图片标签 */}
            <div className="create-field">
              <label className="create-field-label">标签</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {availableTags.map((tag) => {
                  const isSelected = editForm.tags.includes(tag)
                  return (
                    <span
                      key={tag}
                      onClick={() => {
                        setEditForm(prev => {
                          const currentTags = prev.tags || []
                          if (currentTags.includes(tag)) {
                            return { ...prev, tags: currentTags.filter(t => t !== tag) }
                          } else {
                            return { ...prev, tags: [...currentTags, tag] }
                          }
                        })
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: isSelected ? '#3b82f6' : '#f1f5f9',
                        color: isSelected ? 'white' : '#475569',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                        fontWeight: isSelected ? '600' : '500'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#e2e8f0'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#f1f5f9'
                        }
                      }}
                    >
                      {tag}
                    </span>
                  )
                })}
              </div>
              {editForm.tags.length > 0 && (
                <div style={{ marginTop: '12px', fontSize: '0.875rem', color: '#64748b' }}>
                  已选择 {editForm.tags.length} 个标签
                </div>
              )}
            </div>
            
            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                className="create-btn" 
                onClick={() => setEditingPicture(null)}
                style={{ flex: 1 }}
              >
                取消
              </button>
              <button 
                className="create-btn create-btn--primary" 
                onClick={() => void onSavePicture()}
                style={{ flex: 2 }}
              >
                保存修改
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          buttons={confirmDialog.buttons}
          visible={!!confirmDialog}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </section>
  )
}

// ========== 图片管理页面美化样式 ==========
const style = document.createElement('style')
style.textContent = `
  /* 管理页面容器 */
  .admin-layout {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    min-height: 100vh;
  }

  /* 卡片容器 */
  .admin-layout .card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(226, 232, 240, 0.6);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .admin-layout .card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: rgba(102, 126, 234, 0.2);
  }

  /* 标题样式 */
  .admin-layout h2 {
    margin: 0 0 20px;
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .admin-layout h2::before {
    content: '';
    width: 5px;
    height: 28px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 3px;
    display: inline-block;
  }

  /* 标签按钮 */
  .tag-btn {
    padding: 10px 20px;
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border: 1px solid rgba(226, 232, 240, 0.6);
    border-radius: 10px;
    color: #475569;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .tag-btn:hover {
    background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
    border-color: rgba(102, 126, 234, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .tag-btn.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: rgba(102, 126, 234, 0.8);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  /* 图片卡片 */
  .picture-item {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    border: 1px solid rgba(226, 232, 240, 0.4);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  }

  .picture-item:hover {
    border-color: rgba(102, 126, 234, 0.3);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .picture-item img {
    border-radius: 10px;
    border: 1px solid rgba(226, 232, 240, 0.4);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .picture-item:hover img {
    border-color: rgba(102, 126, 234, 0.2);
  }

  /* 标签 */
  .tag {
    display: inline-block;
    padding: 5px 12px;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    color: #1d4ed8;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    border: 1px solid rgba(59, 130, 246, 0.2);
    margin-right: 6px;
    margin-bottom: 6px;
  }

  /* 操作按钮 */
  .row-actions button {
    padding: 8px 16px;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid;
  }

  /* Toast 提示 */
  .toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 24px;
    border-radius: 12px;
    color: white;
    font-weight: 500;
    font-size: 0.95rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    animation: toast-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toast--success {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  }

  .toast--error {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  .toast--info {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }

  @keyframes toast-fade-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  /* 详情弹窗 */
  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: overlay-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes overlay-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* 访问权限卡片 */
  .access-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 16px;
    padding: 40px;
    text-align: center;
    max-width: 500px;
    margin: 60px auto;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(226, 232, 240, 0.6);
  }

  .access-card h2 {
    font-size: 1.5rem;
    color: #111827;
    margin-bottom: 12px;
  }

  .access-card p {
    color: #64748b;
    font-size: 1rem;
    line-height: 1.6;
  }

  /* 响应式 */
  @media (max-width: 768px) {
    .admin-layout {
      padding: 16px;
    }
    .admin-layout .card {
      padding: 20px;
    }
  }
`
document.head.appendChild(style)
