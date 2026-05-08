import { useState, useCallback, useEffect, useRef } from 'react'
import type { PictureVO, UserVO } from '../types/api'
import { formatDate, formatFileSize } from '../utils/format'
import { userApi } from '../api/user'
import { CustomImageCropper } from './CustomImageCropper'

interface PictureDetailModalProps {
  /** 是否打开弹窗 */
  open: boolean
  /** 图片详情数据 */
  detailPicture: PictureVO | null
  /** 是否正在加载 */
  detailLoading?: boolean
  /** 当前登录用户 */
  currentUser?: UserVO | null
  /** 关闭回调 */
  onClose: () => void
  /** 编辑回调 */
  onEdit?: (picture: PictureVO) => void
  /** 下载回调 */
  onDownload?: (picture: PictureVO) => void
  /** AI 扩图回调 */
  onAIOutPainting?: (picture: PictureVO) => void
  /** 删除回调 */
  onDelete?: (picture: PictureVO) => void
}

/**
 * 图片详情弹窗 - 商业级重构版
 * 
 * 设计理念：
 * - 极简 SaaS 风格：左右分栏布局，信息层级清晰
 * - 品牌色体系：#1890ff 品牌蓝 + 极简白
 * - 精致交互：平滑动画、微妙的阴影和渐变
 * 
 * @example
 * ```tsx
 * <PictureDetailModal
 *   open={detailOpen}
 *   picture={currentPicture}
 *   onClose={() => setDetailOpen(false)}
 *   onAIOutPainting={handleAIOutPainting}
 * />
 * ```
 */
export function PictureDetailModal({
  open,
  detailPicture,
  detailLoading = false,
  currentUser,
  onClose,
  onEdit,
  onDownload,
  onAIOutPainting,
  onDelete,
}: PictureDetailModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [uploadUser, setUploadUser] = useState<UserVO | null>(null)
  const prevPictureId = useRef<string | null>(null)

  const picture = detailPicture

  // 复制文本到剪贴板
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }, [])

  // 重置图片加载状态
  useEffect(() => {
    if (open) {
      setImageLoaded(false)
      setLightboxOpen(false)
    }
  }, [open, picture?.id])

  // 获取上传用户信息
  useEffect(() => {
    if (!picture?.userId || !open) return
    if (picture.user) {
      setUploadUser(picture.user)
      return
    }
    if (picture.id === prevPictureId.current) return
    prevPictureId.current = picture.id
    setUploadUser(null)
    userApi.getUserVOById(picture.userId).then(setUploadUser).catch(() => setUploadUser(null))
  }, [picture?.id, picture?.userId, picture?.user, open])

  // 监听图片加载，添加超时机制
  useEffect(() => {
    if (!picture?.url) return
    
    // 创建一个新的 Image 对象来预加载
    const img = new Image()
    img.src = picture.url
    
    const loadTimeout = setTimeout(() => {
      // 3 秒后强制显示图片（即使 onLoad 未触发）
      setImageLoaded(true)
    }, 3000)
    
    img.onload = () => {
      clearTimeout(loadTimeout)
      setImageLoaded(true)
    }
    
    img.onerror = () => {
      clearTimeout(loadTimeout)
      // 加载失败也显示图片（让用户看到至少有个图）
      setImageLoaded(true)
    }
    
    return () => {
      clearTimeout(loadTimeout)
      img.onload = null
      img.onerror = null
    }
  }, [picture?.url])

  // 键盘事件
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, lightboxOpen])

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

  if (!open) return null
  
  // 调试：打印图片数据
  console.log('图片详情数据:', picture)

  const aspectRatioText = picture?.aspectRatio 
    ? `${picture.aspectRatio.toFixed(2)} : 1`
    : picture?.picWidth && picture?.picHeight
    ? `${picture.picWidth} : ${picture.picHeight}`
    : '—'

  return (
    <>
      {/* 样式定义 */}
      <style>{`
        /* ========== 遮罩层 ========== */
        .detail-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 9998;
          opacity: 0;
          animation: modal-overlay-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes modal-overlay-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ========== 弹窗容器 ========== */
        .detail-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.95);
          width: 92vw;
          max-width: 1600px;
          height: 90vh;
          max-height: 94vh;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          z-index: 9999;
          display: flex;
          overflow: hidden;
          opacity: 0;
          animation: modal-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
        }

        @keyframes modal-slide-in {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        /* ========== 左侧预览区 ========== */
        .detail-modal-preview {
          flex: 1;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          min-width: 0;
          min-height: 0;
          overflow: auto;
        }

        .detail-modal-image-container {
          position: relative;
          max-width: 100%;
          max-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          min-height: 0;
        }

        .detail-modal-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          opacity: 0;
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          cursor: zoom-in;
        }

        .detail-modal-image.loaded {
          opacity: 1;
        }

        /* 全屏按钮 */
        .fullscreen-btn {
          position: absolute;
          bottom: 20px;
          right: 20px;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(24, 144, 255, 0.2);
          color: #1890ff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .fullscreen-btn:hover {
          background: white;
          border-color: #1890ff;
          transform: scale(1.08);
          box-shadow: 0 6px 16px rgba(24, 144, 255, 0.2);
        }

        /* ========== 右侧信息面板 ========== */
        .detail-modal-info {
          width: 420px;
          background: white;
          display: flex;
          flex-direction: column;
          border-left: 1px solid #f0f0f0;
          flex-shrink: 0;
          min-height: 0;
        }

        /* 头部 */
        .detail-modal-header {
          padding: 24px 28px;
          border-bottom: 1px solid #f0f0f0;
          flex-shrink: 0;
        }

        .detail-modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px;
          line-height: 1.3;
        }

        .detail-modal-intro {
          font-size: 0.95rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.6;
        }

        /* 内容区 */
        .detail-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 28px;
          min-height: 0;
        }

        /* 技术规格 Grid */
        .tech-specs-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .tech-spec-item {
          padding: 16px;
          background: #fafafa;
          border-radius: 10px;
          border: 1px solid #f0f0f0;
          transition: all 0.2s ease;
        }

        .tech-spec-item:hover {
          background: #f5f5f5;
          border-color: #d9d9d9;
        }

        .tech-spec-label {
          font-size: 0.75rem;
          color: #8c8c8c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .tech-spec-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #262626;
        }

        /* 标签 */
        .format-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: #e6f7ff;
          color: #1890ff;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid #bae7ff;
        }

        .color-dot {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #262626;
        }

        .color-dot-indicator {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        /* 元数据 */
        .metadata-section {
          margin-bottom: 24px;
        }

        .metadata-item {
          margin-bottom: 16px;
        }

        .metadata-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #8c8c8c;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .category-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #fafafa;
          color: #595959;
          border-radius: 8px;
          border: 1px solid #f0f0f0;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .category-badge:hover {
          background: #f5f5f5;
          border-color: #d9d9d9;
        }

        .pill-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pill-tag {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          background: rgba(24, 144, 255, 0.08);
          color: #1890ff;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
          border: 1px solid rgba(24, 144, 255, 0.15);
          transition: all 0.2s ease;
        }

        .pill-tag:hover {
          background: rgba(24, 144, 255, 0.12);
          border-color: rgba(24, 144, 255, 0.3);
          transform: translateY(-1px);
        }

        /* 操作记录 */
        .activity-section {
          padding: 16px;
          background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
          border-radius: 10px;
          border: 1px solid #f0f0f0;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .activity-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
          flex-shrink: 0;
          overflow: hidden;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-text {
          font-size: 0.9rem;
          color: #595959;
          margin-bottom: 4px;
        }

        .activity-text strong {
          font-weight: 600;
          color: #262626;
        }

        .activity-time {
          font-size: 0.8rem;
          color: #bfbfbf;
        }

        /* ========== 底部操作栏 ========== */
        .detail-modal-footer {
          padding: 20px 28px;
          border-top: 1px solid #f0f0f0;
          flex-shrink: 0;
        }

        .action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .action-bar-left {
          display: flex;
          gap: 10px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
        }

        .action-btn--secondary {
          background: white;
          color: #595959;
          border: 1px solid #d9d9d9;
        }

        .action-btn--secondary:hover {
          border-color: #1890ff;
          color: #1890ff;
          background: #f0f5ff;
          transform: translateY(-2px);
        }

        .action-btn--danger {
          background: white;
          color: #ff4d4f;
          border: 1px solid #ffa39e;
        }

        .action-btn--danger:hover {
          background: #fff1f0;
          border-color: #ff7875;
        }

        .action-btn--primary {
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
        }

        .action-btn--primary:hover {
          background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(24, 144, 255, 0.4);
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ========== 关闭按钮 ========== */
        .modal-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid #f0f0f0;
          color: #8c8c8c;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }

        .modal-close-btn:hover {
          background: white;
          border-color: #d9d9d9;
          color: #262626;
          transform: rotate(90deg);
        }

        /* ========== 骨架屏 ========== */
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
          border-radius: 8px;
        }

        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ========== Lightbox 全屏预览 ========== */
        .detail-lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          backdrop-filter: blur(12px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: lightbox-fade-in 0.25s ease;
        }
        @keyframes lightbox-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .detail-lightbox-img {
          max-width: 95vw;
          max-height: 95vh;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .detail-lightbox-close {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          border: none;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          transition: background 0.2s;
        }
        .detail-lightbox-close:hover {
          background: rgba(255,255,255,0.22);
        }

        /* ========== 响应式 ========== */
        @media (max-width: 1024px) {
          .detail-modal {
            flex-direction: column;
            width: 95vw;
            max-height: 95vh;
          }
          .detail-modal-preview {
            flex: 1;
            min-height: 0;
          }
          .detail-modal-info {
            width: 100%;
            flex: 0 0 auto;
            max-height: 45vh;
            min-height: 0;
          }
        }
      `}</style>

      {/* 遮罩层 */}
      <div className="detail-modal-overlay" onClick={onClose} />

      {/* 弹窗容器 */}
      <div className="detail-modal">
        {/* 关闭按钮 */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          title="关闭 (Esc)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* 左侧预览区 */}
        <div className="detail-modal-preview">
          <div className="detail-modal-image-container">
            {/* 模糊占位图 */}
            {!imageLoaded && (
              <img
                src={picture?.thumbnailUrl || picture?.url}
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: 'blur(20px)',
                  borderRadius: '8px',
                }}
              />
            )}

            {/* 高清图片 */}
            <img
              src={picture?.url}
              alt={picture?.name || '图片预览'}
              className={`detail-modal-image${imageLoaded ? ' loaded' : ''}`}
              style={{
                opacity: imageLoaded ? 1 : 0,
                position: 'relative',
                zIndex: 1,
              }}
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />

            {/* 全屏按钮 */}
            <button
              type="button"
              className="fullscreen-btn"
              title="全屏查看"
              onClick={(e) => {
                e.stopPropagation()
                const img = picture?.url
                if (img) {
                  const w = window.open('')
                  w?.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>${picture?.name || '图片预览'}</title>
                        <style>
                          body { 
                            margin: 0; 
                            background: #000; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center;
                            min-height: 100vh;
                          }
                          img { 
                            max-width: 100%; 
                            max-height: 100vh; 
                            object-fit: contain;
                          }
                        </style>
                      </head>
                      <body>
                        <img src="${img}" alt="${picture?.name || '图片'}">
                      </body>
                    </html>
                  `)
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* 右侧信息面板 */}
        <div className="detail-modal-info">
          {/* 头部 */}
          <div className="detail-modal-header">
            <h2 className="detail-modal-title">
              {picture?.title || picture?.name || '未命名图片'}
            </h2>
            {picture?.introduction && (
              <p className="detail-modal-intro">{picture.introduction}</p>
            )}
          </div>

          {/* 内容区 */}
          <div className="detail-modal-content">
            {detailLoading || !picture ? (
              /* 骨架屏 */
              <div className="skeleton" style={{ height: '100%' }} />
            ) : (
              <>
                {/* 技术规格 */}
                <div className="tech-specs-grid">
                  <div className="tech-spec-item">
                    <div className="tech-spec-label">分辨率</div>
                    <div className="tech-spec-value">
                      {picture.picWidth && picture.picHeight
                        ? `${picture.picWidth} × ${picture.picHeight}`
                        : '—'}
                    </div>
                  </div>

                  <div className="tech-spec-item">
                    <div className="tech-spec-label">文件大小</div>
                    <div className="tech-spec-value">
                      {picture.picSize ? formatFileSize(picture.picSize) : '—'}
                    </div>
                  </div>

                  <div className="tech-spec-item">
                    <div className="tech-spec-label">格式</div>
                    <div className="tech-spec-value">
                      {picture.picFormat && (
                        <span className="format-tag">
                          {picture.picFormat.toUpperCase()}
                        </span>
                      ) || '—'}
                    </div>
                  </div>

                  <div className="tech-spec-item">
                    <div className="tech-spec-label">主色</div>
                    <div className="tech-spec-value">
                      {(picture.picColor || picture.dominantColor) ? (
                        <span className="color-dot">
                          <span
                            className="color-dot-indicator"
                            style={{ backgroundColor: picture.picColor || picture.dominantColor }}
                          />
                          {picture.picColor || picture.dominantColor}
                        </span>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                </div>

                {/* 元数据 */}
                <div className="metadata-section">
                  {/* 分类 - 始终显示 */}
                  <div className="metadata-item">
                    <div className="metadata-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                      </svg>
                      分类
                    </div>
                    <div className="category-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                      </svg>
                      {picture.category || '未分类'}
                    </div>
                  </div>

                  {/* 标签 - 有标签时显示 */}
                  {picture.tags && picture.tags.length > 0 && (
                    <div className="metadata-item">
                      <div className="metadata-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                          <line x1="7" y1="7" x2="7.01" y2="7"></line>
                        </svg>
                        标签
                      </div>
                      <div className="pill-tags">
                        {picture.tags.map((tag, index) => (
                          <span key={index} className="pill-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 上传者信息 */}
                {(() => {
                  const displayUser = picture.user || uploadUser
                  return (
                <div className="activity-section">
                  <div className="activity-item">
                    {displayUser?.userAvatar ? (
                      <div className="activity-avatar" style={{ background: '#f0f0f0' }}>
                        <img
                          src={displayUser.userAvatar}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div className="activity-avatar">
                        {(displayUser?.userName || '匿').charAt(0)}
                      </div>
                    )}
                    <div className="activity-content">
                      <div className="activity-text">
                        由 <strong>{displayUser?.userName || '匿名用户'}</strong> 上传
                      </div>
                      <div className="activity-time">
                        {picture.createTime ? formatDate(picture.createTime) : '未知时间'}
                      </div>
                      {displayUser?.id && (
                        <div className="activity-time" style={{ marginTop: '2px' }}>
                          ID: {String(displayUser.id)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                  )
                })()}
              </>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="detail-modal-footer">
            <div className="action-bar">
              {/* 左侧按钮 */}
              <div className="action-bar-left">
                {onEdit && picture && (
                  <button
                    type="button"
                    className="action-btn action-btn--secondary"
                    onClick={() => onEdit(picture)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    编辑
                  </button>
                )}
                {picture && picture.url && (
                  <button
                    type="button"
                    className="action-btn action-btn--secondary"
                    onClick={() => setCropperOpen(true)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                      <line x1="12" y1="2" x2="12" y2="12"></line>
                    </svg>
                    裁剪
                  </button>
                )}
                {onDelete && picture && currentUser?.userRole === 'admin' && (
                  <button
                    type="button"
                    className="action-btn action-btn--danger"
                    onClick={() => onDelete(picture)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    删除
                  </button>
                )}
              </div>

              {/* 主按钮：AI 扩图 */}
              {onAIOutPainting && picture && (
                <button
                  type="button"
                  className="action-btn action-btn--primary"
                  onClick={() => onAIOutPainting(picture)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  AI 扩图
                  <span className="ai-badge">✨ AI</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {cropperOpen && picture?.url && (
        <CustomImageCropper
          cosImageUrl={picture.url}
          onClose={() => setCropperOpen(false)}
        />
      )}

      {lightboxOpen && picture?.url && (
        <div className="detail-lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <button className="detail-lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
          <img
            className="detail-lightbox-img"
            src={picture.webpUrl || picture.url}
            alt={picture.name || '图片预览'}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
