import { useEffect, useState } from 'react'
import { pictureApi } from '../api/picture'
import { ApiError } from '../api/http'
import { PictureDetailModal } from '../components/PictureDetailModal'
import { MasonryGallery } from '../components/MasonryGallery'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ImageSearchModal } from '../components/ImageSearchModal'
import { OutPaintingDrawer } from '../components/OutPaintingDrawer'
import { useAuth } from '../context/AuthContext'
import { filterApprovedPictures, canViewPicture } from '../utils/permissions'
import type { PictureTagCategory, PictureVO } from '../types/api'

export function PublicGalleryPage() {
  const { currentUser, showLoginModal } = useAuth()
  const [keyword, setKeyword] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [publicList, setPublicList] = useState<PictureVO[]>([])
  const [loadingPublic, setLoadingPublic] = useState(false)
  const [tagCategory, setTagCategory] = useState<PictureTagCategory>({ tagList: [], categoryList: [] })
  const [current, setCurrent] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailPicture, setDetailPicture] = useState<PictureVO | null>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    buttons: import('../components/ConfirmDialog').DialogButton[]
  } | null>(null)
  const [currentDeleteId, setCurrentDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // 以图搜图状态
  const [imageSearchOpen, setImageSearchOpen] = useState(false)
  
  // AI 扩图状态
  const [outPaintingPicture, setOutPaintingPicture] = useState<PictureVO | null>(null)

  const [notLoggedIn, setNotLoggedIn] = useState(false)

  const loadPublicPictures = async (options?: { tag?: string | null, category?: string | null, page?: number }) => {
    const effectiveTag = options?.tag !== undefined ? options.tag : selectedTag
    const effectiveCategory = options?.category !== undefined ? options.category : selectedCategory
    const pageNum = options?.page !== undefined ? options.page : current
    setLoadingPublic(true)
    try {
      const page = await pictureApi.listPublic({
        current: pageNum,
        pageSize,
        searchText: keyword.trim() || undefined,
        tags: effectiveTag ? [effectiveTag] : null,
        category: effectiveCategory || undefined,
      })
      const allRecords = page.records || []
      
      // 权限控制：普通用户只能查看已审核通过的图片
      const filteredRecords = filterApprovedPictures(allRecords)
      
      setPublicList(filteredRecords)
      setTotal(page.total || 0)
      setCurrent(pageNum)
    } catch (error) {
      if (error instanceof ApiError && error.code === 40100) {
        setNotLoggedIn(true)
        showLoginModal()
        return
      }
      console.error(error)
    } finally {
      setLoadingPublic(false)
    }
  }

  const onTagClick = (tag: string) => {
    const next = selectedTag === tag ? null : tag
    setSelectedTag(next)
    setCurrent(1)
    // 直接使用 next 值加载数据，确保点击一次就能生效
    loadPublicPictures({ tag: next, category: selectedCategory, page: 1 })
  }

  const onCategoryClick = (category: string) => {
    const next = selectedCategory === category ? null : category
    setSelectedCategory(next)
    setCurrent(1)
    // 直接使用 next 值加载数据，确保点击一次就能生效
    loadPublicPictures({ tag: selectedTag, category: next, page: 1 })
  }

  const onPageChange = (page: number) => {
    if (page === current) return
    loadPublicPictures({ page })
  }

  const loadTagCategory = async () => {
    try {
      const data = await pictureApi.getTagCategory()
      setTagCategory(data)
    } catch (error) {
      if (error instanceof ApiError && error.code === 40100) {
        setNotLoggedIn(true)
        showLoginModal()
        return
      }
      console.error(error)
    }
  }

  useEffect(() => {
    void loadPublicPictures()
    void loadTagCategory()
  }, [])

  useEffect(() => {
    if (currentUser && notLoggedIn) {
      setNotLoggedIn(false)
      void loadPublicPictures()
      void loadTagCategory()
    }
  }, [currentUser])

  const openPictureDetail = async (preview: PictureVO) => {
    // 权限检查：确保用户有权限查看此图片
    if (!canViewPicture(currentUser, preview)) {
      alert('无权查看此图片，该图片尚未通过审核。')
      return
    }
    
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
      console.error(error)
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

  /**
   * 处理图片下载
   */
  const handleDownload = async (picture: PictureVO) => {
    try {
      const blob = await pictureApi.download(picture.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = picture.name || `picture-${picture.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败，请稍后重试')
    }
  }

  /**
   * 打开删除确认弹窗
   */
  const openDeleteConfirm = (picture: PictureVO) => {
    const pictureId = picture.id
    
    setConfirmDialog({
      title: '确定要删除这张图片吗？',
      message: '删除后将无法找回，请谨慎操作。',
      buttons: [
        {
          label: '取消',
          variant: 'secondary',
          onClick: () => {
            setConfirmDialog(null)
            setCurrentDeleteId(null)
          }
        },
        {
          label: '确定删除',
          variant: 'danger',
          onClick: async () => {
            if (!pictureId) {
              console.error('图片 ID 为空')
              return
            }
            
            console.log('准备删除图片，ID:', pictureId)
            setDeleting(true)
            try {
              console.log('调用删除接口，参数:', { id: pictureId })
              const result = await pictureApi.delete(pictureId)
              console.log('删除结果:', result)
              setPublicList(publicList.filter(p => p.id !== pictureId))
              setConfirmDialog(null)
              setCurrentDeleteId(null)
              // 显示成功提示
              const toast = document.createElement('div')
              toast.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #10b981;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                z-index: 10000;
                font-size: 0.95rem;
                font-weight: 500;
                animation: toast-in 0.3s ease;
              `
              toast.textContent = '删除成功！'
              document.body.appendChild(toast)
              setTimeout(() => {
                toast.remove()
              }, 3000)
            } catch (error) {
              console.error('删除失败:', error)
              const errorMessage = (error as Error).message || '删除失败，请稍后重试'
              alert(errorMessage)
            } finally {
              setDeleting(false)
            }
          }
        }
      ]
    })
  }

  /**
   * 处理图片删除（已废弃，使用 openDeleteConfirm 替代）
   */
  const handleDelete = (picture: PictureVO) => {
    openDeleteConfirm(picture)
  }

  /**
   * 处理 AI 扩图
   */
  const handleAIOutPainting = (picture: PictureVO) => {
    setOutPaintingPicture(picture)
  }

  return (
    <section>
      <style>{`
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>

      {/* 颜色选择器已删除 */}

      <style>{`
        .search-bar-modern {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border-radius: 16px;
          padding: 8px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .search-bar-modern:focus-within {
          border-color: #93c5fd;
          box-shadow: 0 4px 20px rgba(59,130,246,0.1);
        }
        .search-input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 8px;
        }
        .search-input-wrap svg {
          flex-shrink: 0;
          color: #94a3b8;
        }
        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.9375rem;
          padding: 10px 0;
          background: transparent;
          color: #1f2937;
        }
        .search-input::placeholder {
          color: #9ca3af;
        }
        .search-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 22px;
          border: none;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          white-space: nowrap;
        }
        .search-btn--primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #fff;
          box-shadow: 0 2px 8px rgba(59,130,246,0.3);
        }
        .search-btn--primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(59,130,246,0.4);
        }
        .search-btn--image {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          padding: 10px 14px;
          box-shadow: 0 2px 8px rgba(102,126,234,0.3);
        }
        .search-btn--image:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(102,126,234,0.4);
        }
      `}</style>

      <div className="search-bar-modern">
        <div className="search-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            value={keyword}
            placeholder="输入关键字检索素材"
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setCurrent(1)
                void loadPublicPictures({ page: 1 })
              }
            }}
          />
        </div>
        <button
          type="button"
          className="search-btn search-btn--image"
          onClick={() => setImageSearchOpen(true)}
          title="以图搜图"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </button>
        <button
          type="button"
          className="search-btn search-btn--primary"
          onClick={() => {
            setCurrent(1)
            void loadPublicPictures({ page: 1 })
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          搜索
        </button>
      </div>
      <div className="card tag-wrap">
        <strong>分类：</strong>
        {tagCategory.categoryList.map((category) => (
          <button
            key={category}
            type="button"
            className={`tag tag-btn${selectedCategory === category ? ' active' : ''}`}
            onClick={() => onCategoryClick(category)}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="card tag-wrap">
        <strong>标签：</strong>
        {tagCategory.tagList.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`tag tag-btn${selectedTag === tag ? ' active' : ''}`}
            onClick={() => onTagClick(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      
      {/* 瀑布流图片展示 */}
      {notLoggedIn && !loadingPublic && publicList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: '#9ca3af'
        }}>
          <svg
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
            style={{ opacity: 0.4, marginBottom: '16px' }}
          >
            <path d="M12 15v2m0 0v2m0-2h2m-2 0H10m-1-8a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontSize: '1.1rem', margin: '0 0 8px', color: '#374151' }}>需要登录才能查看图片</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: '0 0 24px' }}>登录后即可浏览公开素材库</p>
          <button
            type="button"
            onClick={showLoginModal}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            立即登录
          </button>
        </div>
      ) : (
        <MasonryGallery
          pictures={publicList}
          loading={loadingPublic}
          onPictureClick={() => {}}
          onPictureDetail={(picture) => void openPictureDetail(picture)}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onAIOutPainting={handleAIOutPainting}
        />
      )}

      {publicList.length > 0 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', padding: '16px' }}>
          <button
            type="button"
            onClick={() => onPageChange(current - 1)}
            disabled={current === 1}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: current === 1 ? '#f3f4f6' : '#ffffff',
              color: current === 1 ? '#9ca3af' : '#374151',
              cursor: current === 1 ? 'not-allowed' : 'pointer',
              opacity: current === 1 ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (current !== 1) {
                e.currentTarget.style.backgroundColor = '#eff6ff'
                e.currentTarget.style.borderColor = '#93c5fd'
              }
            }}
            onMouseLeave={(e) => {
              if (current !== 1) {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }
            }}
          >
            上一页
          </button>
          <span style={{ fontSize: '0.95rem', color: '#6b7280' }}>
            第 {current} 页 / 共 {Math.ceil(total / pageSize)} 页（{total} 条记录）
          </span>
          <button
            type="button"
            onClick={() => onPageChange(current + 1)}
            disabled={current >= Math.ceil(total / pageSize)}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: current >= Math.ceil(total / pageSize) ? '#f3f4f6' : '#ffffff',
              color: current >= Math.ceil(total / pageSize) ? '#9ca3af' : '#374151',
              cursor: current >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer',
              opacity: current >= Math.ceil(total / pageSize) ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (current < Math.ceil(total / pageSize)) {
                e.currentTarget.style.backgroundColor = '#eff6ff'
                e.currentTarget.style.borderColor = '#93c5fd'
              }
            }}
            onMouseLeave={(e) => {
              if (current < Math.ceil(total / pageSize)) {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }
            }}
          >
            下一页
          </button>
        </div>
      )}

      <PictureDetailModal
        open={detailOpen}
        detailPicture={detailPicture}
        detailLoading={detailLoading}
        onClose={closePictureDetail}
      />

      {/* 删除确认弹窗 */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          buttons={confirmDialog.buttons}
          visible={!!confirmDialog}
          onClose={() => {
            setConfirmDialog(null)
            setCurrentDeleteId(null)
          }}
        />
      )}

      {/* 以图搜图弹窗 */}
      <ImageSearchModal
        open={imageSearchOpen}
        onClose={() => setImageSearchOpen(false)}
      />

      {/* AI 扩图抽屉 */}
      {outPaintingPicture && (
        <OutPaintingDrawer
          open={!!outPaintingPicture}
          onClose={() => setOutPaintingPicture(null)}
          picture={outPaintingPicture}
        />
      )}
    </section>
  )
}