import { useCallback, useEffect, useState } from 'react'
import { pictureApi } from '../api/picture'
import { spaceApi } from '../api/space'
import type { PictureVO, SpaceVO } from '../types/api'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (imageUrl: string) => void
  initialValue?: string
}

type TabType = 'public' | 'space'

export function ImageGallerySelector({ open, onClose, onSelect, initialValue }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('public')
  const [publicPictures, setPublicPictures] = useState<PictureVO[]>([])
  const [spacePictures, setSpacePictures] = useState<PictureVO[]>([])
  const [spaces, setSpaces] = useState<SpaceVO[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | string>('')
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedImage, setSelectedImage] = useState<PictureVO | null>(null)
  const [previewImage, setPreviewImage] = useState<PictureVO | null>(null)

  // 加载公共图库
  const loadPublicPictures = useCallback(async () => {
    if (activeTab !== 'public') return
    setLoading(true)
    try {
      const page = await pictureApi.listPublic({
        current: 1,
        pageSize: 20,
        searchText: searchText || undefined,
      })
      setPublicPictures(page.records || [])
    } catch (error) {
      console.error('Failed to load public pictures:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, searchText])

  // 加载用户空间列表
  const loadSpaces = useCallback(async () => {
    setLoading(true)
    try {
      const page = await spaceApi.listByPageVO({
        current: 1,
        pageSize: 50,
      })
      const spaceList = page.records || []
      setSpaces(spaceList)
      if (spaceList.length > 0 && !selectedSpaceId) {
        setSelectedSpaceId(spaceList[0].id)
      }
    } catch (error) {
      console.error('Failed to load spaces:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedSpaceId])

  // 加载空间图片
  const loadSpacePictures = useCallback(async () => {
    if (activeTab !== 'space' || !selectedSpaceId) return
    setLoading(true)
    try {
      const page = await pictureApi.listPictureByPage({
        current: 1,
        pageSize: 20,
        searchText: searchText || undefined,
        spaceId: selectedSpaceId,  // 直接使用字符串 ID，避免雪花算法精度丢失
      })
      setSpacePictures(page.records || [])
    } catch (error) {
      console.error('Failed to load space pictures:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedSpaceId, searchText])

  useEffect(() => {
    if (open) {
      if (activeTab === 'public') {
        void loadPublicPictures()
      } else {
        void loadSpaces()
      }
    }
  }, [open, activeTab, loadPublicPictures, loadSpaces])

  useEffect(() => {
    if (activeTab === 'space') {
      void loadSpacePictures()
    }
  }, [activeTab, selectedSpaceId, searchText, loadSpacePictures])

  useEffect(() => {
    if (!open) {
      setPublicPictures([])
      setSpacePictures([])
      setSpaces([])
      setSearchText('')
      setSelectedImage(null)
      setPreviewImage(null)
    }
  }, [open])

  const handleSelectImage = (picture: PictureVO) => {
    setSelectedImage(picture)
  }

  const handlePreview = (picture: PictureVO) => {
    setPreviewImage(picture)
  }

  const handleConfirm = () => {
    if (selectedImage) {
      onSelect(selectedImage.url)
      onClose()
    }
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSearchText('')
    setSelectedImage(null)
  }

  if (!open) return null

  const currentPictures = activeTab === 'public' ? publicPictures : spacePictures

  return (
    <>
      <div className="detail-overlay" role="presentation" onClick={onClose}>
        <div
          className="detail-panel card"
          style={{ width: 'min(900px, 100%)', maxHeight: 'min(85vh, 800px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-gallery-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="detail-panel-header">
            <h2 id="image-gallery-title">选择图片</h2>
            <button type="button" className="detail-close" onClick={onClose}>
              关闭
            </button>
          </div>

          {/* 标签页切换 */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
            <button
              type="button"
              className={`tag-btn ${activeTab === 'public' ? 'active' : ''}`}
              onClick={() => handleTabChange('public')}
            >
              公共图库
            </button>
            <button
              type="button"
              className={`tag-btn ${activeTab === 'space' ? 'active' : ''}`}
              onClick={() => handleTabChange('space')}
            >
              我的空间
            </button>
          </div>

          {/* 搜索框 */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="create-input"
              placeholder={activeTab === 'public' ? '搜索公共图片...' : '搜索空间图片...'}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* 空间选择器（仅在我的空间标签页显示） */}
          {activeTab === 'space' && (
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>
                选择空间：
              </label>
              <select
                className="create-input"
                value={selectedSpaceId}
                onChange={(e) => setSelectedSpaceId(e.target.value)}
                style={{ cursor: 'pointer', flex: 1 }}
              >
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.spaceName || `空间 #${space.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 图片网格 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
            gap: '16px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '8px'
          }}>
            {loading ? (
              <p className="page-muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                加载中...
              </p>
            ) : currentPictures.length === 0 ? (
              <p className="page-muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                {activeTab === 'public' ? '暂无公共图片' : '该空间暂无图片'}
              </p>
            ) : (
              currentPictures.map((picture) => (
                <div
                  key={picture.id}
                  style={{
                    border: selectedImage?.id === picture.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: selectedImage?.id === picture.id ? '#eff6ff' : '#ffffff',
                  }}
                  onClick={() => handleSelectImage(picture)}
                  onDoubleClick={() => {
                    handleSelectImage(picture)
                    handleConfirm()
                  }}
                >
                  <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                    <img
                      src={picture.thumbnailUrl || picture.url}
                      alt={picture.name || 'picture'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                    <button
                      type="button"
                      className="tag-btn"
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        padding: '6px 10px',
                        fontSize: '0.8rem',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreview(picture)
                      }}
                    >
                      预览
                    </button>
                  </div>
                  <div style={{ padding: '10px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {picture.name || `图片 #${picture.id}`}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                      {picture.category || '未分类'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 已选图片信息和确认按钮 */}
          <div style={{ 
            marginTop: '20px', 
            paddingTop: '16px', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center' }}>
              {selectedImage ? (
                <>
                  <img
                    src={selectedImage.thumbnailUrl || selectedImage.url}
                    alt="selected"
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 500, color: '#111827' }}>
                      {selectedImage.name || `图片 #${selectedImage.id}`}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', wordBreak: 'break-all' }}>
                      {selectedImage.url}
                    </p>
                  </div>
                </>
              ) : (
                <p className="page-muted">请从上方选择一张图片</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="create-footer-cta"
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="button"
                className="create-btn create-btn--primary"
                onClick={handleConfirm}
                disabled={!selectedImage}
                style={{ opacity: selectedImage ? 1 : 0.5, cursor: selectedImage ? 'pointer' : 'not-allowed' }}
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 预览弹窗 */}
      {previewImage && (
        <div className="detail-overlay" role="presentation" onClick={() => setPreviewImage(null)}>
          <div
            className="detail-panel card"
            style={{ width: 'min(800px, 95%)' }}
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="detail-panel-header">
              <h2>图片预览</h2>
              <button type="button" className="detail-close" onClick={() => setPreviewImage(null)}>
                关闭
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <img
                src={previewImage.url}
                alt={previewImage.name || 'preview'}
                style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '10px' }}
              />
              <div style={{ marginTop: '16px', textAlign: 'left' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>
                  {previewImage.name || `图片 #${previewImage.id}`}
                </h3>
                <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#6b7280' }}>
                  {previewImage.introduction || '暂无简介'}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {previewImage.tags?.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
