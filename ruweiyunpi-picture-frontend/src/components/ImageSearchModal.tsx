import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pictureApi } from '../api/picture'
import type { PictureVO } from '../types/api'

interface ImageSearchModalProps {
  open: boolean
  onClose: () => void
  onSearchComplete?: (pictures: PictureVO[]) => void
}

export function ImageSearchModal({ open, onClose, onSearchComplete }: ImageSearchModalProps) {
  const navigate = useNavigate()
  const [selectedPicture, setSelectedPicture] = useState<PictureVO | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [searching, setSearching] = useState<boolean>(false)
  const [databasePictures, setDatabasePictures] = useState<PictureVO[]>([])
  const [loadingDatabase, setLoadingDatabase] = useState<boolean>(false)
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  // 加载公开数据库图片
  useEffect(() => {
    if (open) {
      loadDatabasePictures(1)
    }
  }, [open])

  const loadDatabasePictures = async (page: number = 1) => {
    setLoadingDatabase(true)
    try {
      const result = await pictureApi.listPublic({
        current: page,
        pageSize
      })
      setDatabasePictures(result.records || [])
      setTotal(result.total || 0)
      setCurrentPage(page)
    } catch (error) {
      console.error('加载公开数据库失败:', error)
    } finally {
      setLoadingDatabase(false)
    }
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > Math.ceil(total / pageSize)) return
    loadDatabasePictures(page)
  }

  // 处理文件选择
  const handleSelectDatabasePicture = (picture: PictureVO) => {
    setSelectedPicture(picture)
    setPreviewUrl(picture.thumbnailUrl || picture.url)
  }

  // 搜索数据库图片
  const handleSearchDatabase = () => {
    if (!searchKeyword.trim()) {
      loadDatabasePictures(1)
      return
    }
    
    // 使用后端搜索 API 进行关键字搜索
    loadDatabasePicturesWithSearch(1)
  }

  const loadDatabasePicturesWithSearch = async (page: number = 1) => {
    setLoadingDatabase(true)
    try {
      const result = await pictureApi.listPublic({
        current: page,
        pageSize,
        searchText: searchKeyword.trim() || undefined
      })
      setDatabasePictures(result.records || [])
      setTotal(result.total || 0)
      setCurrentPage(page)
    } catch (error) {
      console.error('搜索公开数据库失败:', error)
    } finally {
      setLoadingDatabase(false)
    }
  }

  // 执行搜索
  const handleSearch = async () => {
    if (!selectedPicture) {
      alert('请先从公共素材库中选择图片')
      return
    }

    setSearching(true)
    try {
      const result = await pictureApi.searchByPicture({ pictureId: selectedPicture.id })
      const pictures = result || []
      
      if (pictures.length === 0) {
        alert('未找到相似图片')
        onSearchComplete?.([])
        handleClose()
      } else {
        // 跳转到搜索结果页，传递 ImageSearchResult 格式的数据
        navigate('/picture/search-results', {
          state: {
            pictures: pictures.map((item: any, index: number) => ({
              id: index, // 使用序号作为临时 ID
              thumbUrl: item.thumbUrl,
              fromUrl: item.fromUrl,
              name: `相似图片 #${index + 1}`
            })),
            originalImageUrl: selectedPicture.thumbnailUrl || selectedPicture.url,
            searchPictureId: selectedPicture.id,
            searchPictureName: selectedPicture.name
          }
        })
        handleClose()
      }
    } catch (error) {
      console.error('以图搜图失败:', error)
      const errorMessage = (error as Error).message
      if (errorMessage.includes('404')) {
        showToast('图片太模糊，无法识别', 'error')
      } else if (errorMessage.includes('500')) {
        showToast('识图服务超时，请稍后重试', 'error')
      } else {
        showToast('搜索失败：' + errorMessage, 'error')
      }
    } finally {
      setSearching(false)
    }
  }

  // 关闭弹窗
  const handleClose = () => {
    setSelectedPicture(null)
    setPreviewUrl('')
    setSearching(false)
    onClose()
  }

  // 显示轻提示
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 100000;
      font-size: 0.95rem;
      font-weight: 500;
      animation: toast-in 0.3s ease;
    `
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  if (!open) {
    return null
  }

  return (
    <>
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

        .image-search-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 99999;
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

        .image-search-modal {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .image-search-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .image-search-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .image-search-close {
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

        .image-search-close:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .image-search-dropzone {
          border: 2px dashed #e5e7eb;
          border-radius: 12px;
          padding: 32px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: #f9fafb;
        }

        .image-search-dropzone.drag-over {
          border-color: #667eea;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
        }

        .image-search-dropzone:hover {
          border-color: #667eea;
          background: #f3f4f6;
        }

        .image-search-dropzone.has-file {
          border-color: #10b981;
          background: #ecfdf5;
          border-style: solid;
        }

        .image-search-dropzone-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .image-search-dropzone-text {
          font-size: 0.95rem;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .image-search-dropzone-hint {
          font-size: 0.85rem;
          color: #9ca3af;
        }

        .image-search-preview {
          margin-top: 20px;
          border-radius: 12px;
          overflow: hidden;
          background: #f9fafb;
          padding: 16px;
        }

        .image-search-preview img {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          display: block;
          margin: 0 auto;
        }

        .image-search-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .image-search-btn {
          flex: 1;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .image-search-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .image-search-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .image-search-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .image-search-btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .image-search-btn-secondary:hover {
          background: #e5e7eb;
        }

        .image-search-loading {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          z-index: 10;
          border-radius: 16px;
        }

        .image-search-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .image-search-loading-text {
          font-size: 0.95rem;
          color: #6b7280;
          font-weight: 500;
        }

        .hidden-file-input {
          display: none;
        }
      `}</style>

      <div className="image-search-overlay" onClick={handleClose}>
        <div className="image-search-modal" onClick={(e) => e.stopPropagation()}>
          <div className="image-search-header">
            <h3 className="image-search-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              以图搜图
            </h3>
            <button className="image-search-close" onClick={handleClose}>
              取消
            </button>
          </div>

          <div style={{ position: 'relative' }}>
              {/* Loading 遮罩 */}
              {searching && (
                <div className="image-search-loading">
                  <div className="image-search-spinner"></div>
                  <div className="image-search-loading-text">正在通过 AI 识别相似图片...</div>
                </div>
              )}

              {/* 公共素材库选择模式 */}
              <div>
                {/* 搜索框 */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginBottom: '16px' 
                }}>
                  <input
                    type="text"
                    placeholder="搜索图片..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchDatabase()
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#667eea'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (searchKeyword.trim()) {
                        loadDatabasePicturesWithSearch(1)
                      } else {
                        loadDatabasePictures(1)
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    搜索
                  </button>
                </div>

                {/* 图片列表 */}
                {loadingDatabase ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#9ca3af'
                  }}>
                    加载中...
                  </div>
                ) : databasePictures.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#9ca3af'
                  }}>
                    暂无图片
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '4px'
                  }}>
                    {databasePictures.map((pic) => (
                      <div
                        key={pic.id}
                        onClick={() => handleSelectDatabasePicture(pic)}
                        style={{
                          position: 'relative',
                          aspectRatio: '4/3',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: selectedPicture?.id === pic.id ? '3px solid #667eea' : '2px solid transparent',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                      >
                        <img
                          src={pic.thumbnailUrl || pic.url}
                          alt={pic.name || '图片'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        {selectedPicture?.id === pic.id && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '24px',
                            height: '24px',
                            background: '#667eea',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 分页控件 */}
                {databasePictures.length > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '16px',
                    padding: '12px 0'
                  }}>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        backgroundColor: currentPage === 1 ? '#f3f4f6' : '#ffffff',
                        color: currentPage === 1 ? '#9ca3af' : '#374151',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        fontSize: '0.85rem'
                      }}
                    >
                      上一页
                    </button>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      第 {currentPage} 页 / 共 {Math.ceil(total / pageSize)} 页（{total} 条记录）
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(total / pageSize)}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        backgroundColor: currentPage >= Math.ceil(total / pageSize) ? '#f3f4f6' : '#ffffff',
                        color: currentPage >= Math.ceil(total / pageSize) ? '#9ca3af' : '#374151',
                        cursor: currentPage >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer',
                        opacity: currentPage >= Math.ceil(total / pageSize) ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        fontSize: '0.85rem'
                      }}
                    >
                      下一页
                    </button>
                  </div>
                )}

                {/* 操作按钮 */}
                {selectedPicture && (
                  <div className="image-search-actions">
                    <button
                      type="button"
                      className="image-search-btn image-search-btn-secondary"
                      onClick={() => {
                        setSelectedPicture(null)
                        setPreviewUrl('')
                      }}
                      disabled={searching}
                    >
                      重新选择
                    </button>
                    <button
                      type="button"
                      className="image-search-btn image-search-btn-primary"
                      onClick={handleSearch}
                      disabled={searching}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      {searching ? '搜索中...' : '开始搜索'}
                    </button>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </>
  )
}
