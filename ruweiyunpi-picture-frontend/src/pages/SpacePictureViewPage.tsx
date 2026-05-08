import { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { pictureApi } from '../api/picture'
import { spaceApi } from '../api/space'
import { useAuth } from '../context/AuthContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PictureFilterBar } from '../components/PictureFilterBar'
import { PictureDetailModal } from '../components/PictureDetailModal'
import { PictureEditor } from '../components/PictureEditor'
import type { DialogButton } from '../components/ConfirmDialog'
import type { PictureVO, SpaceVO } from '../types/api'

/**
 * 空间图片查看页面 - 现代化重构版
 * 设计灵感：Google Photos / iCloud 相册
 */
export function SpacePictureViewPage() {
  return <SpacePictureViewInner />
}

function SpacePictureViewInner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [space, setSpace] = useState<SpaceVO | null>(null)
  const [pictures, setPictures] = useState<PictureVO[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [editingPicture, setEditingPicture] = useState<PictureVO | null>(null)
  const [collabEditing, setCollabEditing] = useState<PictureVO | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    introduction: '',
    category: '',
    tags: [] as string[]
  })
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    buttons: DialogButton[]
  } | null>(null)
  const [isSpaceOnly, setIsSpaceOnly] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false)
  const [uploadForm, setUploadForm] = useState({
    name: '',
    introduction: '',
    category: '',
    tags: [] as string[]
  })
  const [dragOver, setDragOver] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false)
  
  // 图片详情弹窗状态
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailPicture, setDetailPicture] = useState<PictureVO | null>(null)
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [colorSearchResults, setColorSearchResults] = useState<PictureVO[]>([])
  const [colorSearchLoading, setColorSearchLoading] = useState(false)

  // 监听文件变化，生成预览
  useEffect(() => {
    if (!uploadFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(uploadFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [uploadFile])

  const handleUpload = () => {
    // 触发文件选择
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      showToast('error', '请选择有效的图片文件（JPG、PNG、WebP 等）')
      return
    }
    setUploadFile(file)
    setShowUploadDialog(true)
    
    // 自动提取文件名（去除后缀）
    const fileName = file.name.replace(/\.[^/.]+$/, '')
    setUploadForm(prev => ({
      ...prev,
      name: fileName
    }))
  }

  // 拖拽上传处理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      showToast('error', '请拖入有效的图片文件')
      return
    }
    setUploadFile(file)
    setShowUploadDialog(true)
    
    // 自动提取文件名
    const fileName = file.name.replace(/\.[^/.]+$/, '')
    setUploadForm(prev => ({
      ...prev,
      name: fileName
    }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const confirmUpload = async () => {
    if (!uploadFile || !space) {
      showToast('error', '请先选择图片')
      return
    }
    if (!uploadForm.name.trim()) {
      showToast('error', '请输入图片名称')
      return
    }
    setUploading(true)
    try {
      console.log('[SpacePictureView] 准备上传图片:', {
        spaceId: space?.id,
        space: space,
        picName: uploadForm.name,
        fileName: uploadFile.name
      })
      
      await pictureApi.uploadByFile(uploadFile, {
        spaceId: space?.id,
        picName: uploadForm.name
      })
      
      // 上传成功：关闭上传表单弹窗
      setShowUploadDialog(false)
      setUploadFile(null)
      setDragOver(false)
      setUploadForm({
        name: '',
        introduction: '',
        category: '',
        tags: []
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // 管理员上传不需要显示成功弹窗，直接刷新列表
      if (currentUser?.userRole === 'admin') {
        void loadPictures()
      } else {
        // 普通用户显示成功反馈弹窗
        setShowSuccessDialog(true)
      }
    } catch (error) {
      console.error('上传图片失败:', error)
      showToast('error', '上传失败：' + (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const cancelUpload = () => {
    setShowUploadDialog(false)
    setUploadFile(null)
    setDragOver(false)
    setUploadForm({
      name: '',
      introduction: '',
      category: '',
      tags: []
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onFilterChange = (checked: boolean) => {
    setIsSpaceOnly(checked)
    console.log('过滤开关变化:', checked ? '仅显示本空间图片' : '显示所有图片')
    // TODO: 重新获取图片列表
    void loadPictures()
  }

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
    
    try {
      const spaceDetail = await spaceApi.getById(id)
      // 验证空间是否存在
      if (!spaceDetail || !spaceDetail.id) {
        showToast('error', '空间不存在或已被删除')
        setSpace(null)
        return
      }
      // 权限检查：管理员可以访问所有空间，普通用户需要有权限列表
      if (!spaceDetail.permissionList || spaceDetail.permissionList.length === 0) {
        // 管理员用户允许访问任何空间
        if (currentUser?.userRole !== 'admin') {
          showToast('error', '无权访问此空间')
          setSpace(null)
          return
        }
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

  // 颜色搜索
  useEffect(() => {
    if (!selectedColor || !id) {
      setColorSearchResults([])
      return
    }
    setColorSearchLoading(true)
    pictureApi.searchByColor(selectedColor, id)
      .then((results) => {
        setColorSearchResults(Array.isArray(results) ? results : [])
      })
      .catch((error) => {
        console.error('颜色搜索失败:', error)
        setColorSearchResults([])
      })
      .finally(() => {
        setColorSearchLoading(false)
      })
  }, [selectedColor, id])

  // 筛选后的图片列表
  const filteredPictures = useMemo(() => {
    let filtered = selectedColor ? colorSearchResults : pictures

    // 搜索筛选
    if (searchQuery) {
      filtered = filtered.filter(
        (pic) =>
          pic.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pic.introduction?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // 分类筛选
    if (selectedCategory) {
      filtered = filtered.filter((pic) => pic.category === selectedCategory)
    }

    // 标签筛选
    if (selectedTags.length > 0) {
      filtered = filtered.filter((pic) => {
        const picTags = Array.isArray(pic.tags) ? pic.tags : []
        return selectedTags.some((tag) => picTags.includes(tag))
      })
    }

    return filtered
  }, [pictures, colorSearchResults, searchQuery, selectedCategory, selectedTags, selectedColor])

  // 检查是否有上传权限
  const hasUploadPermission = useMemo(() => {
    if (!space?.permissionList) return false
    return space.permissionList.includes('picture:upload') || currentUser?.userRole === 'admin'
  }, [space?.permissionList, currentUser?.userRole])

  const loadCategoriesAndTags = useCallback(async () => {
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
      void loadCategoriesAndTags()
    }
  }, [loadSpace, loadCategoriesAndTags, currentUser, id])

  // 筛选回调函数
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category)
  }, [])

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color)
  }, [])

  const handleSpaceOnlyChange = useCallback((value: boolean) => {
    setIsSpaceOnly(value)
  }, [])

  const goToMemberManage = () => {
    navigate(`/my-teams/${id}`)
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

  const openPictureDetail = async (preview: PictureVO) => {
    setDetailOpen(true)
    setDetailPicture(preview)
    setDetailLoading(true)
    try {
      const vo = await pictureApi.getVoById(preview.id)
      setDetailPicture({
        ...preview,
        ...vo,
        tags: vo.tags && vo.tags.length > 0 ? vo.tags : preview.tags,
      })
    } catch (error) {
      console.error('获取图片详情失败:', error)
      setDetailPicture(preview)
    } finally {
      setDetailLoading(false)
    }
  }

  const closePictureDetail = () => {
    setDetailOpen(false)
    setDetailPicture(null)
    setDetailLoading(false)
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

  const onDeletePicture = (id: number | string) => {
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

  const onDownloadPicture = (pictureId: number | string, picName?: string) => {
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

  if (!currentUser) {
    return (
      <div className="card access-card">
        <h2>需要登录</h2>
        <p>请使用右上角登录后访问此页面。</p>
      </div>
    )
  }

  return (
    <section className="space-picture-view-modern">
      {/* 全局样式定义 */}
      <style>{`
        .space-picture-view-modern {
          max-width: 1400px;
          margin: 0 auto;
          background: #f9fafb;
          min-height: 100vh;
        }

        .switch input:checked + .switch-slider:before {
          transform: translateX(20px);
        }

        .switch input:focus + .switch-slider {
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
        }

        /* 上传按钮 */
        .upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .upload-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .upload-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .upload-btn svg {
          width: 18px;
          height: 18px;
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

        /* ========== 网格布局 ========== */
        .picture-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
          padding: 8px;
        }

        @media (max-width: 1600px) {
          .picture-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
          }
        }

        @media (max-width: 1200px) {
          .picture-grid {
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 18px;
          }
        }

        @media (max-width: 768px) {
          .picture-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 14px;
          }
        }

        /* ========== 图片卡片 ========== */
        .picture-card {
          position: relative;
          aspect-ratio: 4 / 3;
          border-radius: 20px;
          overflow: hidden;
          background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%);
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.08),
            0 1px 3px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .picture-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.16),
            0 8px 16px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(102, 126, 234, 0.1);
        }

        .picture-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          filter: brightness(1) contrast(1);
        }

        .picture-card:hover .picture-card-image {
          transform: scale(1.1);
          filter: brightness(1.05) contrast(1.05);
        }

        /* ========== Hover 遮罩层 ========== */
        .picture-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.15) 40%,
            rgba(0, 0, 0, 0.6) 85%,
            rgba(0, 0, 0, 0.85) 100%
          );
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 24px;
          opacity: 0;
          transition: opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          backdrop-filter: blur(4px);
        }

        .picture-card:hover .picture-card-overlay {
          opacity: 1;
        }

        .picture-card-overlay-top {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          transform: translateY(-12px);
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .picture-card:hover .picture-card-overlay-top {
          transform: translateY(0);
        }

        .picture-card-overlay-bottom {
          display: flex;
          flex-direction: column;
          gap: 10px;
          transform: translateY(12px);
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .picture-card:hover .picture-card-overlay-bottom {
          transform: translateY(0);
        }

        .icon-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.35);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.15) 100%);
          backdrop-filter: blur(16px);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .icon-btn:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.25) 100%);
          transform: translateY(-2px) scale(1.15);
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
          border-color: rgba(255, 255, 255, 0.6);
        }

        .icon-btn:active {
          transform: translateY(0) scale(1.05);
        }

        .icon-btn.detail-btn:hover {
          background: rgba(59, 130, 246, 0.6);
          border-color: rgba(59, 130, 246, 0.4);
        }

        .icon-btn.edit-btn:hover {
          background: rgba(59, 130, 246, 0.6);
          border-color: rgba(59, 130, 246, 0.4);
        }

        .icon-btn.delete-btn:hover {
          background: rgba(239, 68, 68, 0.6);
          border-color: rgba(239, 68, 68, 0.4);
        }

        .icon-btn.download-btn:hover {
          background: rgba(16, 185, 129, 0.6);
          border-color: rgba(16, 185, 129, 0.4);
        }

        .picture-title {
          color: white;
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.9);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: 0.5px;
        }

        .picture-category-badge {
          display: inline-block;
          padding: 5px 12px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
          backdrop-filter: blur(16px);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 8px;
          width: fit-content;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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

        /* ========== 加载动画 ========== */
        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* 页面容器 - 全屏布局 */
        .space-picture-view-page {
          min-height: 100vh;
          background: #f9fafb;
        }

        /* 页面头部区域 */
        .space-picture-header {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          gap: 16px;
        }

        .header-left {
          flex: 1;
          min-width: 0;
        }

        .space-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 4px 0;
          line-height: 1.2;
        }

        .space-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        .header-right {
          flex-shrink: 0;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .back-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #1f2937;
          transform: translateX(-2px);
        }

        .back-btn:active {
          transform: translateX(0);
        }

        .filter-bar-wrapper {
          padding: 0 24px 12px;
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

        /* ========== 上传弹窗 ========== */
        .upload-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: overlay-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .upload-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modal-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes modal-slide-in {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .upload-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          border-bottom: 1px solid #f3f4f6;
        }

        .upload-modal-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
        }

        .upload-modal-close {
          padding: 8px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .upload-modal-close:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .upload-modal-body {
          padding: 32px;
        }

        .upload-modal-footer {
          display: flex;
          gap: 12px;
          padding: 24px 32px;
          border-top: 1px solid #f3f4f6;
        }

        /* 上传区域 */
        .upload-dropzone {
          border: 2px dashed #e5e7eb;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: #fafbfc;
          margin-bottom: 24px;
        }

        .upload-dropzone:hover {
          border-color: #667eea;
          background: #f5f3ff;
        }

        .upload-dropzone.drag-over {
          border-color: #667eea;
          background: #ede9fe;
          transform: scale(1.02);
        }

        .upload-dropzone.has-file {
          border-color: #10b981;
          background: #ecfdf5;
          border-style: solid;
        }

        .upload-dropzone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .upload-dropzone-icon {
          width: 48px;
          height: 48px;
          color: #9ca3af;
        }

        .upload-dropzone.has-file .upload-dropzone-icon {
          color: #10b981;
        }

        .upload-dropzone-text {
          font-size: 0.95rem;
          color: #6b7280;
        }

        .upload-dropzone.has-file .upload-dropzone-text {
          color: #059669;
          font-weight: 600;
        }

        .upload-dropzone-hint {
          font-size: 0.85rem;
          color: #9ca3af;
          margin-top: 4px;
        }

        .upload-preview-image {
          max-width: 200px;
          max-height: 200px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        /* Switch 开关 */
        .upload-switch {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .upload-switch-label {
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
        }

        .upload-switch-hint {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 4px;
        }

        /* 按钮加载动画 */
        .btn-loading {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ========== 成功反馈弹窗 ========== */
        .success-dialog-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: overlay-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .success-dialog {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 380px;
          padding: 40px 32px 32px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: dialog-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes dialog-bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(-10px);
          }
          50% {
            transform: scale(1.02) translateY(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .success-icon-wrapper {
          width: 64px;
          height: 64px;
          margin: 0 auto 24px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
          animation: icon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes icon-pulse {
          0%, 100% {
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
          }
          50% {
            box-shadow: 0 12px 32px rgba(16, 185, 129, 0.4);
          }
        }

        .success-icon {
          width: 36px;
          height: 36px;
          color: white;
        }

        .success-title {
          margin: 0 0 12px;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .success-subtitle {
          margin: 0 0 32px;
          font-size: 0.95rem;
          color: #6b7280;
          line-height: 1.6;
        }

        .success-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .success-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .success-btn:active {
          transform: translateY(0);
        }

        /* ========== 上传占位卡片 ========== */
        .upload-placeholder-card {
          position: relative;
          aspect-ratio: 4 / 3;
          border-radius: 20px;
          overflow: hidden;
          background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%);
          border: 2px dashed #cbd5e1;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .upload-placeholder-card:hover {
          border-color: #667eea;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
          transform: translateY(-8px) scale(1.02);
          box-shadow: 
            0 20px 40px rgba(102, 126, 234, 0.15),
            0 8px 16px rgba(102, 126, 234, 0.08);
        }

        .upload-placeholder-card:hover .upload-placeholder-content svg {
          stroke: #667eea;
          transform: scale(1.15) rotate(-5deg);
        }

        .upload-placeholder-card:hover .upload-placeholder-text {
          color: #667eea;
          transform: translateY(-2px);
        }

        .upload-placeholder-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }

        .upload-placeholder-content svg {
          width: 48px;
          height: 48px;
          stroke: #9ca3af;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .upload-placeholder-text {
          font-size: 1rem;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
        <div className="space-picture-view-page">
          {/* 页面头部区域 */}
          <header className="space-picture-header">
            <div className="header-content">
              <div className="header-left">
                <h1 className="space-title">{space.spaceName || `空间 #${space.id}`}</h1>
                <p className="space-description">
                  {space.totalCount !== undefined ? `${space.totalCount} 张图片` : '暂无图片'}
                </p>
              </div>
              <div className="header-right">
                {space.spaceType === 1 && (
                  <button
                    type="button"
                    className="back-btn"
                    onClick={goToMemberManage}
                    title="成员管理"
                    style={{ marginRight: '8px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    成员管理
                  </button>
                )}
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => navigate('/spaces')}
                  title="返回空间管理"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  返回空间管理
                </button>
              </div>
            </div>
            
            {/* 筛选栏 */}
            <div className="filter-bar-wrapper">
              <PictureFilterBar
                categories={categories}
                tags={tags}
                selectedCategory={selectedCategory}
                selectedTags={selectedTags}
                searchQuery={searchQuery}
                selectedColor={selectedColor}
                isSpaceOnly={isSpaceOnly}
                hasSpaceId={true}
                showUploadButton={false}
                onSearchChange={handleSearchChange}
                onCategoryChange={handleCategoryChange}
                onTagToggle={handleTagToggle}
                onColorChange={handleColorChange}
                onSpaceOnlyChange={handleSpaceOnlyChange}
                onUpload={handleUpload}
              />
            </div>
          </header>

          {/* 图片列表区域 */}
          {loading || colorSearchLoading ? (
            <div className="loading-state">{colorSearchLoading ? '颜色搜索中…' : '加载中…'}</div>
          ) : filteredPictures.length === 0 && !hasUploadPermission ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" color="#9ca3af">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <h3 className="empty-state-title">
                {searchQuery || selectedCategory || selectedTags.length > 0 || selectedColor
                  ? '没有找到匹配的图片'
                  : '暂无图片'}
              </h3>
              <p className="empty-state-desc">
                {searchQuery || selectedCategory || selectedTags.length > 0 || selectedColor
                  ? '尝试调整筛选条件'
                  : '该空间还没有图片'}
              </p>
            </div>
          ) : (
            <div className="picture-grid">
              {/* 上传占位卡片 - 仅在用户有上传权限时显示 */}
              {hasUploadPermission && (
                <div 
                  className="picture-card upload-placeholder-card"
                  onClick={() => navigate(`/pictures/manage/upload?spaceId=${id}`)}
                >
                  <div className="upload-placeholder-content">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"></path>
                    </svg>
                    <span className="upload-placeholder-text">上传图片</span>
                  </div>
                </div>
              )}
              
              {/* 正常图片列表 */}
              {filteredPictures.map((pic) => (
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
                    {/* 顶部：操作按钮 */}
                    <div className="picture-card-overlay-top">
                      {/* 图片详情按钮 */}
                      <button
                        type="button"
                        className="icon-btn detail-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          void openPictureDetail(pic)
                        }}
                        title="查看详情"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </button>
                      
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
                    </div>

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
        </div>
      )}

      {/* 图片详情弹窗 */}
      <PictureDetailModal
        open={detailOpen}
        detailPicture={detailPicture}
        detailLoading={detailLoading}
        onClose={closePictureDetail}
      />

      {/* 协作编辑 */}
      {collabEditing && (
        <PictureEditor
          picture={collabEditing}
          spaceId={id || ''}
          currentUserId={currentUser?.id}
          onClose={() => setCollabEditing(null)}
        />
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
              <label className="create-field-label">图片名称</label>
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
                placeholder="请输入图片简介"
                rows={3}
              />
            </div>

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
                {tags.map((tag) => (
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
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                已选择：{editForm.tags.length > 0 ? editForm.tags.join(', ') : '无'}
              </p>
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

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden-file-input"
        onChange={handleFileChange}
      />

      {/* 上传弹窗 */}
      {showUploadDialog && (
        <div className="upload-modal-overlay" onClick={cancelUpload}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="upload-modal-header">
              <h2 className="upload-modal-title">上传新图片</h2>
              <button
                type="button"
                className="upload-modal-close"
                onClick={cancelUpload}
                title="关闭"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* 弹窗主体 */}
            <div className="upload-modal-body">
              {/* 拖拽上传区域 */}
              <div
                className={`upload-dropzone${dragOver ? ' drag-over' : ''}${uploadFile ? ' has-file' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-dropzone-content">
                  {uploadFile && previewUrl ? (
                    <>
                      {/* 图片预览 */}
                      <img
                        src={previewUrl}
                        alt="预览"
                        className="upload-preview-image"
                      />
                      <p className="upload-dropzone-text">
                        ✓ 已选择：{uploadFile.name}
                      </p>
                    </>
                  ) : (
                    <>
                      {/* 默认状态 */}
                      <svg className="upload-dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <div>
                        <p className="upload-dropzone-text">
                          点击或拖拽图片到此处上传
                        </p>
                        <p className="upload-dropzone-hint">
                          支持 JPG、PNG、WebP 等格式
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 图片名称输入框 */}
              <div className="create-field">
                <label className="create-field-label">
                  图片名称
                  <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  className="create-input"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="请输入图片名称"
                />
              </div>

              {/* 简介 */}
              <div className="create-field">
                <label className="create-field-label">简介</label>
                <textarea
                  className="create-input"
                  value={uploadForm.introduction}
                  onChange={(e) => setUploadForm({ ...uploadForm, introduction: e.target.value })}
                  placeholder="请输入图片简介（可选）"
                  rows={3}
                />
              </div>

              {/* 分类和标签 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="create-field">
                  <label className="create-field-label">分类</label>
                  <select
                    className="create-input"
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
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
                        className={`tag-btn ${uploadForm.tags.includes(tag) ? 'active' : ''}`}
                        onClick={() => setUploadForm(prev => ({
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
            </div>

            {/* 弹窗底部操作栏 */}
            <div className="upload-modal-footer">
              <button
                type="button"
                className="create-btn"
                onClick={cancelUpload}
                disabled={uploading}
                style={{ flex: 1 }}
              >
                取消
              </button>
              <button
                type="button"
                className="create-btn create-btn--primary"
                onClick={confirmUpload}
                disabled={uploading || !uploadFile || !uploadForm.name.trim()}
                style={{ flex: 1 }}
              >
                {uploading ? (
                  <span className="btn-loading">
                    <svg className="spin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    上传中…
                  </span>
                ) : (
                  <span className="btn-loading">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16"></polyline>
                      <line x1="12" y1="12" x2="12" y2="21"></line>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                    </svg>
                    确认上传
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成功反馈弹窗 */}
      {showSuccessDialog && (
        <div className="success-dialog-overlay" onClick={() => setShowSuccessDialog(false)}>
          <div className="success-dialog" onClick={(e) => e.stopPropagation()}>
            {/* 成功图标 */}
            <div className="success-icon-wrapper">
              <svg className="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            {/* 主提示语 */}
            <h3 className="success-title">提交成功</h3>

            {/* 副提示语 */}
            <p className="success-subtitle">
              图片已提交审核，请耐心等待
            </p>

            {/* 确认按钮 */}
            <button
              type="button"
              className="success-btn"
              onClick={() => {
                setShowSuccessDialog(false)
                void loadPictures()
              }}
            >
              知道了
            </button>
          </div>
        </div>
      )}

    </section>
  )
}
