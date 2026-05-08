import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { pictureApi } from '../api/picture'
import { spaceApi } from '../api/space'
import { useAuth } from '../context/AuthContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AuthTag, hasAnyPermission } from '../components/AuthTag'
import { PictureEditor } from '../components/PictureEditor'
import type { DialogButton } from '../components/ConfirmDialog'
import type { PictureVO, SpaceVO } from '../types/api'

/**
 * 空间图片管理页面 - 现代化重构版
 * 设计灵感：Google Photos / iCloud 相册
 * 核心改进：
 * 1. CSS Grid 响应式网格布局（替代单列大卡片）
 * 2. 固定比例缩略图（4:3），object-fit: cover 防止变形
 * 3. Hover 悬浮遮罩，精致的图标按钮
 * 4. 顶部紧凑布局，上传按钮移至右上角
 * 5. 极简主义设计，去除生硬边框和浓重阴影
 */
export function SpacePicturePage() {
  return <SpacePictureInner />
}

function SpacePictureInner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [space, setSpace] = useState<SpaceVO | null>(null)
  const [pictures, setPictures] = useState<PictureVO[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [uploading, setUploading] = useState<boolean>(false)
  const [editingPicture, setEditingPicture] = useState<PictureVO | null>(null)
  const [collabEditing, setCollabEditing] = useState<PictureVO | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    introduction: '',
    category: '',
    tags: [] as string[]
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    buttons: DialogButton[]
  } | null>(null)

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  const loadSpace = useCallback(async () => {
    if (!id) {
      console.error('URL 中没有空间 ID')
      showToast('error', '空间 ID 无效')
      return
    }
    
    console.log('空间 ID:', id)
    
    try {
      const spaceDetail = await spaceApi.getById(id)
      console.log('空间详情:', spaceDetail)
      // 验证空间是否存在
      if (!spaceDetail || !spaceDetail.id) {
        showToast('error', '空间不存在或已被删除')
        setSpace(null)
        return
      }
      // 权限检查：后端已通过 permissionList 返回当前用户在该空间的权限
      if (!spaceDetail.permissionList || spaceDetail.permissionList.length === 0) {
        showToast('error', '无权访问此空间')
        setSpace(null)
        return
      }
      setSpace(spaceDetail)
      await loadPictures(spaceDetail)
    } catch (error) {
      console.error('加载空间详情失败:', error, 'ID:', id)
      showToast('error', '空间不存在或已被删除')
      setSpace(null)
    }
  }, [id, currentUser])

  const loadPictures = useCallback(async (currentSpace?: typeof space) => {
    if (!id) return
    // 使用传入的 space 或者当前的 space 状态
    const spaceToUse = currentSpace || space
    // 如果 space 为 null，说明空间不存在或加载失败，不应该继续请求图片列表
    if (!spaceToUse) {
      console.warn('空间信息未加载，跳过图片列表请求')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const picturesPage = await pictureApi.listPictureByPage({
        current: 1,
        pageSize: 100,
        spaceId: id  // 直接使用字符串 ID，避免雪花算法精度丢失
      })
      setPictures(picturesPage.records || [])
    } catch (error) {
      console.error('加载图片列表失败:', error)
      showToast('error', '加载图片列表失败')
    } finally {
      setLoading(false)
    }
  }, [id, space])

  const loadTagsAndCategories = useCallback(async () => {
    try {
      const tagCategory = await pictureApi.getTagCategory()
      setCategories(tagCategory.categoryList || [])
      setTags(tagCategory.tagList || [])
    } catch (error) {
      console.error('加载分类和标签失败:', error)
    }
  }, [])

  useEffect(() => {
    if (currentUser && id) {
      void loadSpace()
      void loadTagsAndCategories()
    }
  }, [loadSpace, loadTagsAndCategories, currentUser, id])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      // 选择文件后自动上传，直接传递文件避免状态异步问题
      void handleUpload(file)
    }
  }

  const handleUpload = async (fileToUpload: File) => {
    if (!fileToUpload) {
      showToast('error', '请选择要上传的图片')
      return
    }

    if (!space) {
      showToast('error', '空间信息加载失败')
      return
    }

    // 使用文件名作为图片名称
    const picName = fileToUpload.name.substring(0, fileToUpload.name.lastIndexOf('.')) || fileToUpload.name

    console.log('[SpacePicture] 准备上传图片:')
    console.log('  - 文件名:', fileToUpload.name)
    console.log('  - 文件大小:', fileToUpload.size, 'bytes')
    console.log('  - 空间对象:', space)
    console.log('  - 空间 ID:', space.id, '(类型:', typeof space.id, ')')
    console.log('  - 图片名称:', picName)
    console.log('  - 完整上传参数:', { file: fileToUpload.name, picName, spaceId: space.id })
    
    setUploading(true)
    try {
      await pictureApi.upload({
        file: fileToUpload,
        picName: picName,
        spaceId: space.id
      })
      showToast('success', '图片上传成功！')
      setSelectedFile(null)
      setPreviewUrl('')
      await loadPictures()
    } catch (error) {
      console.error('上传图片失败:', error)
      showToast('error', '上传图片失败：' + (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const onEditPicture = (picture: PictureVO) => {
    setEditingPicture(picture)
    setEditForm({
      name: picture.name || '',
      introduction: picture.introduction || '',
      category: picture.category || '',
      tags: Array.isArray(picture.tags) ? picture.tags : []
    })
  }

  const onSavePicture = async () => {
    if (!editingPicture) return

    try {
      await pictureApi.edit({
        id: editingPicture.id,
        name: editForm.name,
        introduction: editForm.introduction,
        category: editForm.category,
        tags: editForm.tags
      })
      showToast('success', '图片更新成功！')
      setEditingPicture(null)
      await loadPictures()
    } catch (error) {
      console.error('更新图片失败:', error)
      showToast('error', '更新图片失败：' + (error as Error).message)
    }
  }

  const onDeletePicture = (id: string) => {
    setConfirmDialog({
      title: '删除图片',
      message: '确定要删除这张图片吗？此操作不可恢复。',
      buttons: [
        { label: '取消', onClick: () => {}, variant: 'secondary' },
        {
          label: '删除',
          variant: 'danger',
          onClick: async () => {
            try {
              await pictureApi.delete(id)
              showToast('success', '图片删除成功！')
              await loadPictures()
            } catch (error) {
              console.error('删除图片失败:', error)
              showToast('error', '删除图片失败：' + (error as Error).message)
            }
          }
        }
      ]
    })
  }

  const onDownloadPicture = (pictureId: string, picName?: string) => {
    setConfirmDialog({
      title: '下载图片',
      message: `确定要下载${picName ? `"${picName}"` : '这张图片'}吗？`,
      buttons: [
        { label: '取消', onClick: () => {}, variant: 'secondary' },
        {
          label: '确认下载',
          variant: 'primary',
          onClick: async () => {
            try {
              const blob = await pictureApi.download(pictureId)
              const url = window.URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = picName ? `${picName}.jpg` : `picture_${pictureId}.jpg`
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

  // 打开文件选择对话框
  const triggerFileInput = () => {
    const fileInput = document.getElementById('space-picture-upload')
    if (fileInput) {
      fileInput.click()
    }
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
    <section className="space-picture-page-modern">
      {/* 全局样式定义 */}
      <style>{`
        .space-picture-page-modern {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          background: #f9fafb;
          min-height: 100vh;
        }

        /* ========== 顶部区域 ========== */
        .space-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding: 20px 24px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .space-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          color: #6b7280;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .back-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .space-title-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .space-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .space-stats {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .upload-btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .upload-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .upload-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ========== 网格布局 ========== */
        .picture-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          padding: 4px;
        }

        @media (max-width: 1600px) {
          .picture-grid {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          }
        }

        @media (max-width: 1200px) {
          .picture-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .picture-grid {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
          }
        }

        /* ========== 图片卡片 ========== */
        .picture-card {
          position: relative;
          aspect-ratio: 4 / 3;
          border-radius: 12px;
          overflow: hidden;
          background: #f3f4f6;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .picture-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .picture-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .picture-card:hover .picture-card-image {
          transform: scale(1.05);
        }

        /* ========== Hover 遮罩层 ========== */
        .picture-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 50%,
            rgba(0, 0, 0, 0.75) 100%
          );
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          opacity: 0;
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .picture-card:hover .picture-card-overlay {
          opacity: 1;
        }

        .picture-card-overlay-top {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .picture-card-overlay-bottom {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.08);
        }

        .icon-btn.edit-btn:hover {
          background: rgba(59, 130, 246, 0.5);
        }

        .icon-btn.delete-btn:hover {
          background: rgba(239, 68, 68, 0.5);
        }

        .icon-btn.download-btn:hover {
          background: rgba(16, 185, 129, 0.5);
        }

        .picture-title {
          color: white;
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .picture-category-badge {
          display: inline-block;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 6px;
          width: fit-content;
        }

        /* ========== 空状态 ========== */
        .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .empty-state-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px;
        }

        .empty-state-desc {
          font-size: 0.95rem;
          color: #6b7280;
          margin: 0;
        }

        /* ========== Toast 提示 ========== */
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
          background: #10b981;
        }

        .toast--error {
          background: #ef4444;
        }

        .toast--info {
          background: #3b82f6;
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

        /* ========== 隐藏的文件输入 ========== */
        .hidden-file-input {
          display: none;
        }

        /* ========== 加载状态 ========== */
        .loading-state {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 80px 20px;
          color: #6b7280;
          font-size: 1rem;
        }

        /* ========== 编辑面板 ========== */
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

        .detail-panel {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 560px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .detail-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .detail-panel-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .detail-close {
          padding: 8px 16px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          color: #6b7280;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .detail-close:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .create-field {
          margin-bottom: 24px;
        }

        .create-field-label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
        }

        .create-input {
          width: 100%;
          padding: 12px 14px;
          font-size: 0.95rem;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #ffffff;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .create-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .tag-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .tag-btn {
          padding: 6px 14px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.85rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tag-btn.active {
          background: #eff6ff;
          border-color: #3b82f6;
          color: #1d4ed8;
          font-weight: 600;
        }

        .tag-btn:hover:not(.active) {
          background: #e5e7eb;
        }
      `}</style>

      {/* Toast 提示 */}
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

      {!space && loading ? (
        <div className="loading-state">加载中…</div>
      ) : !space ? (
        <div className="card access-card">
          <h2>空间不存在</h2>
          <p>该空间可能已被删除或您无权访问。</p>
          <button 
            type="button" 
            onClick={() => navigate('/spaces')}
            className="create-btn create-btn--primary"
            style={{ marginTop: '16px' }}
          >
            返回空间列表
          </button>
        </div>
      ) : (
        <>
          {/* 顶部区域 */}
          <div className="space-header">
            <div className="space-header-left">
              <button 
                type="button" 
                onClick={() => navigate('/spaces')}
                className="back-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                返回
              </button>
              <div className="space-title-section">
                <h1 className="space-title">
                  {space?.spaceName || `空间 #${space?.id}`}
                </h1>
                <p className="space-stats">
                  共 {pictures.length} 张图片
                </p>
              </div>
            </div>

            {/* 右侧操作按钮 */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* 成员管理按钮 - 仅团队空间且需要 space_user_manage 权限 */}
              {space?.spaceType === 1 && (
                <AuthTag permission="space_user_manage" space={space}>
                  <button
                    type="button"
                    className="create-btn"
                    onClick={() => navigate(`/my-teams/${space?.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb'
                    e.currentTarget.style.borderColor = '#d1d5db'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                  成员管理
                </button>
              </AuthTag>
              )}

              {/* 上传按钮 - 需要 picture_upload 权限 */}
              <AuthTag permission="picture_upload" space={space}>
                <button 
                  type="button" 
                  className="upload-btn-primary"
                  onClick={triggerFileInput}
                  disabled={uploading}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 16 12 12 8 16"></polyline>
                    <line x1="12" y1="12" x2="12" y2="21"></line>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                    <polyline points="16 16 12 12 8 16"></polyline>
                  </svg>
                  {uploading ? '上传中…' : '上传图片'}
                </button>
              </AuthTag>
            </div>

            {/* 隐藏的文件输入 */}
            <input
              id="space-picture-upload"
              type="file"
              accept="image/*"
              className="hidden-file-input"
              onChange={onFileChange}
              disabled={uploading}
            />
          </div>

          {/* 图片列表区域 */}
          {loading ? (
            <div className="loading-state">加载中…</div>
          ) : pictures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#9ca3af">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <h3 className="empty-state-title">暂无图片</h3>
              <p className="empty-state-desc">点击右上角"上传图片"添加第一张图片</p>
            </div>
          ) : (
            <div className="picture-grid">
              {pictures.map((pic) => (
                <div key={pic.id} className="picture-card">
                  {/* 图片 */}
                  <img 
                    src={pic.url} 
                    alt={pic.name || '图片'} 
                    className="picture-card-image"
                    loading="lazy"
                  />
                  
                  {/* Hover 遮罩层 */}
                  <div className="picture-card-overlay">
                    {/* 顶部：操作按钮 - 根据权限动态显示 */}
                    {hasAnyPermission(space, ['picture_edit', 'picture_delete', 'picture_download']) && (
                      <div className="picture-card-overlay-top">
                        {/* 下载按钮 - 需要 picture_download 权限 */}
                        <AuthTag permission="picture_download" space={space}>
                          <button
                            type="button"
                            className="icon-btn download-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDownloadPicture(pic.id, pic.name)
                            }}
                            title="下载"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </button>
                        </AuthTag>

                        {/* 编辑按钮 - 始终可见 */}
                        <button
                          type="button"
                          className="icon-btn edit-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditPicture(pic)
                          }}
                          title="编辑信息"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>

                        {/* 协作编辑按钮 - 仅团队空间显示 */}
                        {space?.spaceType === 1 && (
                          <button
                            type="button"
                            className="icon-btn edit-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCollabEditing(pic)
                            }}
                            title="协作编辑"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                          </button>
                        )}

                        {/* 删除按钮 - 需要 picture_delete 权限 */}
                        <AuthTag permission="picture_delete" space={space}>
                          <button
                            type="button"
                            className="icon-btn delete-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeletePicture(pic.id)
                            }}
                            title="删除"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </AuthTag>
                      </div>
                    )}

                    {/* 底部：标题和分类 */}
                    <div className="picture-card-overlay-bottom">
                      <h4 className="picture-title">
                        {pic.name || '未命名'}
                      </h4>
                      {pic.category && (
                        <span className="picture-category-badge">
                          {pic.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 编辑面板 */}
      {editingPicture && (
        <div className="detail-overlay" onClick={() => setEditingPicture(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-header">
              <h2>编辑图片</h2>
              <button className="detail-close" onClick={() => setEditingPicture(null)}>
                取消
              </button>
            </div>

            <div className="create-field">
              <label className="create-field-label">图片名称 <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text" 
                className="create-input" 
                value={editForm.name} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="请输入图片名称"
              />
            </div>

            <div className="create-field">
              <label className="create-field-label">简介</label>
              <textarea
                className="create-input"
                value={editForm.introduction}
                onChange={(e) => setEditForm({ ...editForm, introduction: e.target.value })}
                placeholder="请输入图片简介（可选）"
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="create-field">
                <label className="create-field-label">分类</label>
                <select
                  className="create-input"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                >
                  <option value="">请选择分类</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="create-field">
                <label className="create-field-label">标签</label>
                <div className="tag-wrap">
                  {tags.slice(0, 6).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-btn ${editForm.tags.includes(tag) ? 'active' : ''}`}
                      onClick={() => setEditForm(prev => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter(t => t !== tag)
                          : [...prev.tags, tag]
                      }))}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                className="create-btn create-btn--primary" 
                onClick={onSavePicture}
                style={{ flex: 1 }}
              >
                保存修改
              </button>
              <button 
                className="create-btn" 
                onClick={() => setEditingPicture(null)}
                style={{ flex: 1 }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          buttons={confirmDialog.buttons}
          visible={!!confirmDialog}
          onClose={() => setConfirmDialog(null)}
        />
      )}

      {/* 协作编辑 */}
      {collabEditing && (
        <PictureEditor
          picture={collabEditing}
          spaceId={id || ''}
          currentUserId={currentUser?.id}
          onClose={() => setCollabEditing(null)}
        />
      )}
    </section>
  )
}
