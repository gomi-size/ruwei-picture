import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { PictureVO } from '../types/api'

interface ImageSearchResult {
  id: number
  thumbUrl: string
  fromUrl: string
  name?: string
}

interface LocationState {
  pictures: ImageSearchResult[]
  originalImageUrl?: string
  searchPictureId?: number
  searchPictureName?: string
}

export function SearchResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [pictures, setPictures] = useState<ImageSearchResult[]>([])
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('')
  const [searchPictureId, setSearchPictureId] = useState<number | undefined>(undefined)
  const [searchPictureName, setSearchPictureName] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 从路由 state 中获取数据
    const state = location.state as LocationState | undefined
    
    if (!state || !state.pictures || state.pictures.length === 0) {
      // 没有数据，显示空状态
      setPictures([])
      return
    }

    setPictures(state.pictures)
    setOriginalImageUrl(state.originalImageUrl || '')
    setSearchPictureId(state.searchPictureId)
    setSearchPictureName(state.searchPictureName)
  }, [location.state])

  const handleBack = () => {
    navigate(-1) // 返回上一页
  }

  const handlePictureClick = (picture: ImageSearchResult) => {
    // 跳转到源图片 URL
    if (picture.fromUrl) {
      window.open(picture.fromUrl, '_blank')
    }
  }

  const handleDownload = async (picture: ImageSearchResult) => {
    try {
      const response = await fetch(picture.thumbUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `相似图片_${picture.id + 1}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // 显示下载成功提示
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
        z-index: 100000;
        font-size: 0.95rem;
        font-weight: 500;
        animation: toast-in 0.3s ease;
      `
      toast.textContent = '下载成功！'
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.remove()
      }, 3000)
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败，请稍后重试')
    }
  }

  // 空状态：没有搜索结果
  if (pictures.length === 0) {
    return (
      <div className="search-results-empty">
        <style>{`
          .search-results-empty {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
            padding: 40px 20px;
          }

          .search-results-empty-icon {
            width: 120px;
            height: 120px;
            margin-bottom: 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 12px 36px rgba(102, 126, 234, 0.3);
          }

          .search-results-empty-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
            margin: 0 0 12px;
          }

          .search-results-empty-desc {
            font-size: 1rem;
            color: #6b7280;
            margin: 0 0 32px;
            text-align: center;
            max-width: 400px;
            line-height: 1.6;
          }

          .search-results-empty-btn {
            padding: 14px 32px;
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

          .search-results-empty-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          }
        `}</style>

        <div className="search-results-empty-icon">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h2 className="search-results-empty-title">未找到相似图片</h2>
        <p className="search-results-empty-desc">
          暂时没有找到与您搜索图片相似的作品，<br />
          您可以尝试更换其他图片进行搜索
        </p>
        <button className="search-results-empty-btn" onClick={handleBack}>
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="search-results-page">
      <style>{`
        .search-results-page {
          min-height: 100vh;
          background: #f9fafb;
          padding-bottom: 40px;
        }

        /* ========== 顶部区域 ========== */
        .search-results-header {
          background: white;
          padding: 24px 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: 32px;
        }

        .search-results-header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .search-results-header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .search-results-back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: #f3f4f6;
          border: none;
          border-radius: 10px;
          color: #6b7280;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-results-back-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .search-results-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .search-results-subtitle {
          font-size: 0.95rem;
          color: #6b7280;
          font-weight: 500;
          margin-left: 12px;
        }

        .search-results-original-section {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
          border-radius: 12px;
          border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .search-results-original-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #667eea;
          white-space: nowrap;
        }

        .search-results-original-image {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          object-fit: cover;
          border: 2px solid rgba(102, 126, 234, 0.3);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        .search-results-count {
          font-size: 0.95rem;
          color: #6b7280;
          font-weight: 500;
        }

        /* ========== 瀑布流容器 ========== */
        .search-results-gallery {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          column-count: 4;
          column-gap: 16px;
        }

        @media (max-width: 1600px) {
          .search-results-gallery {
            column-count: 3;
          }
        }

        @media (max-width: 1200px) {
          .search-results-gallery {
            column-count: 2;
          }
        }

        @media (max-width: 768px) {
          .search-results-gallery {
            column-count: 1;
          }
        }

        /* ========== 图片卡片 ========== */
        .search-result-card {
          break-inside: avoid;
          margin-bottom: 16px;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .search-result-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        .search-result-card-image {
          width: 100%;
          display: block;
          object-fit: cover;
        }

        .search-result-card-info {
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
          border-top: 1px solid rgba(102, 126, 234, 0.1);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .search-result-card-actions {
          display: flex;
          gap: 8px;
        }

        .search-result-card-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-result-card-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .search-result-card-btn.secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .search-result-card-btn.secondary:hover {
          background: #e5e7eb;
        }

        .search-result-card-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .search-result-card-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-result-card-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
      `}</style>

      {/* 顶部区域 */}
      <header className="search-results-header">
        <div className="search-results-header-content">
          <div className="search-results-header-left">
            <button className="search-results-back-btn" onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              返回
            </button>
            <h1 className="search-results-title">以图搜图结果</h1>
            {searchPictureName ? (
              <span className="search-results-subtitle">
                正在搜索与图片「{searchPictureName}」相似的内容
              </span>
            ) : searchPictureId ? (
              <span className="search-results-subtitle">
                正在搜索与图片 #{searchPictureId} 相似的内容
              </span>
            ) : null}
            <span className="search-results-count">
              找到 {pictures.length} 张相似图片
            </span>
          </div>

          {/* 原始搜索图展示 */}
          {originalImageUrl && (
            <div className="search-results-original-section">
              <span className="search-results-original-label">搜索原图</span>
              <img 
                src={originalImageUrl} 
                alt="搜索原图" 
                className="search-results-original-image"
              />
            </div>
          )}
        </div>
      </header>

      {/* 瀑布流图片展示 */}
      <div className="search-results-gallery">
        {pictures.map((picture, index) => (
          <div 
            key={picture.id} 
            className="search-result-card"
            onClick={() => handlePictureClick(picture)}
          >
            <img 
              src={picture.thumbUrl} 
              alt={picture.name || `相似图片 #${index + 1}`}
              className="search-result-card-image"
              loading="lazy"
            />
            <div className="search-result-card-info">
              <h4 className="search-result-card-title">
                {picture.name || `相似图片 #${index + 1}`}
              </h4>
              <div className="search-result-card-actions">
                <button
                  type="button"
                  className="search-result-card-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(picture)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  下载
                </button>
                <a 
                  href={picture.fromUrl}
                  className="search-result-card-btn secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(picture.fromUrl, '_blank')
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  查看原图
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
