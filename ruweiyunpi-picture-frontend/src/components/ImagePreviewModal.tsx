import { useState, useEffect, useCallback } from 'react'
import type { PictureVO } from '../types/api'

interface ImagePreviewModalProps {
  /** 是否打开预览 */
  open: boolean
  /** 当前预览的图片 */
  picture: PictureVO | null
  /** 图片列表（用于导航） */
  pictures?: PictureVO[]
  /** 当前图片索引 */
  currentIndex?: number
  /** 关闭回调 */
  onClose: () => void
  /** 导航回调 */
  onNavigate?: (index: number) => void
  /** 下载回调 */
  onDownload?: (picture: PictureVO) => void
  /** AI 扩图回调 */
  onAIOutPainting?: (picture: PictureVO) => void
}

/**
 * 高清大图预览组件 - 渐进式加载优化版
 * 
 * 核心技术：
 * 1. 分级加载：列表使用缩略图，预览使用原图
 * 2. 渐进式加载：先显示模糊缩略图占位，再加载高清原图
 * 3. Loading 状态：精致的旋转进度条
 * 4. 内存管理：自动清理图片对象
 * 
 * @example
 * ```tsx
 * <ImagePreviewModal
 *   open={previewOpen}
 *   picture={currentPicture}
 *   pictures={allPictures}
 *   currentIndex={currentIndex}
 *   onClose={() => setPreviewOpen(false)}
 *   onNavigate={setcurrentIndex}
 * />
 * ```
 */
export function ImagePreviewModal({
  open,
  picture,
  pictures = [],
  currentIndex = 0,
  onClose,
  onNavigate,
  onDownload,
  onAIOutPainting,
}: ImagePreviewModalProps) {
  // 图片加载状态
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  // 获取图片 URL 策略
  const thumbnailUrl = picture?.thumbnailUrl || picture?.url
  const originalUrl = picture?.url

  // 重置状态
  const resetState = useCallback(() => {
    setImageLoaded(false)
    setImageLoading(false)
    setImageError(false)
  }, [])

  // 监听图片切换
  useEffect(() => {
    if (!open || !picture) {
      resetState()
      return
    }

    // 重置状态并开始加载
    setImageLoading(true)
    setImageLoaded(false)
    setImageError(false)

    // 预加载高清原图
    const img = new Image()
    img.src = originalUrl || ''
    
    img.onload = () => {
      setImageLoaded(true)
      setImageLoading(false)
    }
    
    img.onerror = () => {
      setImageError(true)
      setImageLoading(false)
    }

    // 清理函数：释放内存
    return () => {
      img.onload = null
      img.onerror = null
      // 清除 src 释放内存
      img.src = ''
    }
  }, [open, picture, originalUrl, resetState])

  // 预加载下一张图片
  useEffect(() => {
    if (!open || !pictures || pictures.length === 0) return

    const nextIndex = (currentIndex + 1) % pictures.length
    const nextPicture = pictures[nextIndex]
    const nextOriginalUrl = nextPicture?.url

    if (nextOriginalUrl) {
      const preloadImg = new Image()
      preloadImg.src = nextOriginalUrl
      // 静默预加载，不处理错误
      preloadImg.onload = () => {
        preloadImg.src = ''
      }
    }
  }, [open, currentIndex, pictures])

  // 键盘事件监听
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && onNavigate) {
        onNavigate(currentIndex > 0 ? currentIndex - 1 : pictures.length - 1)
      } else if (e.key === 'ArrowRight' && onNavigate) {
        onNavigate(currentIndex < pictures.length - 1 ? currentIndex + 1 : 0)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, onNavigate, currentIndex, pictures.length])

  // 阻止滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || !picture) {
    return null
  }

  const title = picture.title || picture.name || `图片 #${picture.id}`
  const hasNavigation = pictures.length > 1

  return (
    <>
      <style>{`
        /* ========== 预览容器 ========== */
        .image-preview-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.96);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: preview-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes preview-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .image-preview-content {
          position: relative;
          max-width: 95vw;
          max-height: 95vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ========== 图片容器 ========== */
        .image-preview-wrapper {
          position: relative;
          max-width: 100%;
          max-height: 85vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* 渐进式加载：模糊背景 */
        .image-preview-blur {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: blur(20px);
          opacity: 1;
          transition: opacity 0.5s ease;
        }

        .image-preview-blur.hidden {
          opacity: 0;
        }

        /* 高清原图 */
        .image-preview-original {
          position: relative;
          max-width: 100%;
          max-height: 85vh;
          object-fit: contain;
          opacity: 0;
          transition: opacity 0.5s ease;
          border-radius: 4px;
        }

        .image-preview-original.loaded {
          opacity: 1;
        }

        /* ========== Loading 进度条 ========== */
        .image-preview-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top-color: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          animation: spinner-rotate 0.8s linear infinite;
        }

        @keyframes spinner-rotate {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* ========== 错误提示 ========== */
        .image-preview-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.8);
        }

        .error-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-icon svg {
          color: #ef4444;
        }

        /* ========== 控制按钮 ========== */
        .image-preview-close {
          position: absolute;
          top: -56px;
          right: 0;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }

        .image-preview-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.08);
        }

        .image-preview-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }

        .image-preview-nav:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-50%) scale(1.08);
        }

        .image-preview-nav:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .image-preview-prev {
          left: -64px;
        }

        .image-preview-next {
          right: -64px;
        }

        /* ========== 图片信息 ========== */
        .image-preview-info {
          margin-top: 24px;
          text-align: center;
          color: white;
          max-width: 800px;
        }

        .image-preview-title {
          font-size: 1.3rem;
          font-weight: 600;
          margin: 0 0 12px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .image-preview-description {
          font-size: 0.95rem;
          opacity: 0.9;
          margin: 0 0 16px;
          line-height: 1.6;
        }

        .image-preview-meta {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 0.85rem;
          opacity: 0.75;
          flex-wrap: wrap;
        }

        .image-preview-meta-item {
          background: rgba(255, 255, 255, 0.15);
          padding: 5px 14px;
          border-radius: 6px;
          backdrop-filter: blur(8px);
        }

        /* ========== 操作按钮 ========== */
        .image-preview-actions {
          margin-top: 20px;
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .image-preview-action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .image-preview-action-btn--primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .image-preview-action-btn--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .image-preview-action-btn--secondary {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .image-preview-action-btn--secondary:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.3);
        }

        /* ========== 计数器 ========== */
        .image-preview-counter {
          position: absolute;
          bottom: -56px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-size: 0.95rem;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          padding: 6px 20px;
          border-radius: 20px;
        }

        /* ========== 响应式 ========== */
        @media (max-width: 768px) {
          .image-preview-close {
            top: 12px;
            right: 12px;
          }
          .image-preview-prev {
            left: 12px;
          }
          .image-preview-next {
            right: 12px;
          }
          .image-preview-counter {
            bottom: 12px;
          }
          .image-preview-nav {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>

      {/* 预览容器 */}
      <div className="image-preview-overlay" onClick={onClose}>
        <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
          {/* 关闭按钮 */}
          <button
            type="button"
            className="image-preview-close"
            onClick={onClose}
            title="关闭 (Esc)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* 导航按钮 */}
          {hasNavigation && onNavigate && (
            <>
              <button
                type="button"
                className="image-preview-nav image-preview-prev"
                onClick={() => onNavigate(currentIndex > 0 ? currentIndex - 1 : pictures.length - 1)}
                title="上一张 (←)"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button
                type="button"
                className="image-preview-nav image-preview-next"
                onClick={() => onNavigate(currentIndex < pictures.length - 1 ? currentIndex + 1 : 0)}
                title="下一张 (→)"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </>
          )}

          {/* 图片展示区域 */}
          <div className="image-preview-wrapper">
            {/* 模糊缩略图占位（渐进式加载） */}
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={title}
                className={`image-preview-blur${imageLoaded ? ' hidden' : ''}`}
              />
            )}

            {/* 高清原图 */}
            <img
              src={originalUrl}
              alt={title}
              className={`image-preview-original${imageLoaded ? ' loaded' : ''}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageLoading(false)
                setImageError(true)
              }}
            />

            {/* Loading 状态 */}
            {!imageLoaded && !imageError && (
              <div className="image-preview-loading">
                <div className="loading-spinner" />
                <span className="loading-text">
                  {imageLoading ? '正在加载高清图片...' : '准备中...'}
                </span>
              </div>
            )}

            {/* 错误状态 */}
            {imageError && (
              <div className="image-preview-error">
                <div className="error-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
                <span>图片加载失败</span>
              </div>
            )}
          </div>

          {/* 图片信息 */}
          <div className="image-preview-info">
            <h3 className="image-preview-title">{title}</h3>
            {picture.introduction && (
              <p className="image-preview-description">{picture.introduction}</p>
            )}
            <div className="image-preview-meta">
              {picture.picWidth && picture.picHeight && (
                <span className="image-preview-meta-item">
                  {picture.picWidth} × {picture.picHeight}
                </span>
              )}
              {picture.picFormat && (
                <span className="image-preview-meta-item">{picture.picFormat}</span>
              )}
              {picture.picSize && (
                <span className="image-preview-meta-item">
                  {(picture.picSize / 1024).toFixed(2)} KB
                </span>
              )}
              {picture.category && (
                <span className="image-preview-meta-item">{picture.category}</span>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          {(onDownload || onAIOutPainting) && (
            <div className="image-preview-actions">
              {onAIOutPainting && (
                <button
                  type="button"
                  className="image-preview-action-btn image-preview-action-btn--primary"
                  onClick={() => onAIOutPainting(picture)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  AI 扩图
                </button>
              )}
              {onDownload && (
                <button
                  type="button"
                  className="image-preview-action-btn image-preview-action-btn--secondary"
                  onClick={() => onDownload(picture)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  下载图片
                </button>
              )}
            </div>
          )}

          {/* 图片计数器 */}
          {hasNavigation && (
            <div className="image-preview-counter">
              {currentIndex + 1} / {pictures.length}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
