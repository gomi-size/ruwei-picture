import { useState, useCallback, useMemo, useEffect } from 'react'
import type { PictureVO } from '../types/api'
import { pictureApi } from '../api/picture'

/**
 * 瀑布流图片展示组件 - 精致优化版
 * 
 * 设计理念：
 * - 极简主义：去除生硬边框，保持界面呼吸感
 * - 流畅动画：所有交互都配备平滑过渡效果
 * - 性能优先：懒加载 + 占位防抖动 + 主色调背景
 * 
 * 核心特性：
 * 1. 纯 CSS Column 实现响应式瀑布流
 * 2. 列表使用 thumbnailUrl（缩略图）+ 懒加载
 * 3. 大图预览使用 webpUrl（WebP 高清）
 * 4. dominantColor 主色调背景占位
 * 5. aspectRatio 防抖动占位
 * 6. 渐变遮罩 + 精致 Hover 效果
 * 7. 全屏 Lightbox 预览
 */

interface MasonryGalleryProps {
  /** 图片列表数据 */
  pictures: PictureVO[]
  /** 是否正在加载 */
  loading: boolean
  /** 点击图片回调（预览） */
  onPictureClick: (picture: PictureVO, index: number) => void
  /** 点击查看图片详情回调 */
  onPictureDetail?: (picture: PictureVO) => void
  /** 点击下载回调 */
  onDownload?: (picture: PictureVO) => void
  /** 点击删除回调 */
  onDelete?: (picture: PictureVO) => void
  /** 点击 AI 扩图回调 */
  onAIOutPainting?: (picture: PictureVO) => void
  /** 每列最小宽度（默认 300px） */
  columnMinWidth?: number
  /** 列间距（默认 16px） */
  gap?: number
}

/**
 * 获取图片宽高比
 * 优先级：aspectRatio > picScale > picWidth/picHeight > 默认值 1.5
 * 
 * @param picture 图片对象
 * @returns 宽高比（width/height）
 */
const getAspectRatio = (picture: PictureVO): number => {
  // 1. 优先使用 aspectRatio 字段
  if (picture.aspectRatio && picture.aspectRatio > 0) {
    return picture.aspectRatio
  }
  
  // 2. 使用 picScale 字段
  if (picture.picScale && picture.picScale > 0) {
    return picture.picScale
  }
  
  // 3. 使用宽高计算
  if (picture.picWidth && picture.picHeight && picture.picWidth > 0) {
    return picture.picWidth / picture.picHeight
  }
  
  // 4. 默认比例
  return 1.5
}

/**
 * 获取图片 URL 策略
 * - 列表展示：使用 thumbnailUrl（缩略图）
 * - 大图预览：使用 webpUrl（WebP 高清）或 url（原图）
 * 
 * @param picture 图片对象
 * @returns { thumbnail: 缩略图地址，large: 高清大图地址 }
 */
const getImageUrls = (picture: PictureVO) => {
  return {
    // 缩略图：用于列表展示，减少初始加载流量
    thumbnail: picture.thumbnailUrl || picture.url,
    // 高清大图：优先使用 WebP 格式（更小体积、更高画质），其次使用原图
    large: picture.webpUrl || picture.url,
  }
}

/**
 * 获取主色调背景
 * 优先使用 dominantColor，否则使用默认灰色
 * 
 * @param picture 图片对象
 * @returns Hex 颜色值
 */
const getDominantColor = (picture: PictureVO): string => {
  return picture.picColor || picture.dominantColor || '#f3f4f6'
}

/**
 * 骨架屏卡片组件
 * 用于数据加载时的占位显示
 */
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-image" />
    </div>
  )
}

/**
 * 图片卡片组件
 * 负责展示单张图片，包含：
 * - 缩略图懒加载
 * - 主色调背景占位
 * - 精致的 Hover 遮罩效果
 * - 下载/收藏操作按钮
 */
interface PictureCardProps {
  picture: PictureVO
  index: number
  onClick: (index: number) => void
  onPictureDetail?: (picture: PictureVO) => void
  onDownload?: () => void
  onDelete?: () => void
  onAIOutPainting?: () => void
}

function PictureCard({ picture, index, onClick, onPictureDetail, onDownload, onDelete, onAIOutPainting }: PictureCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const aspectRatio = getAspectRatio(picture)
  const dominantColor = getDominantColor(picture)
  const { thumbnail } = getImageUrls(picture)
  const title = picture.title || picture.name || `图片 #${picture.id}`

  return (
    <div 
      className="masonry-card"
      onClick={() => onClick(index)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(index)
        }
      }}
    >
      {/* 
        图片容器
        核心技术：使用 padding-top + aspectRatio 实现占位防抖动
        原理：在图片加载前，通过百分比 padding 提前撑开容器高度
        公式：padding-top% = (height / width) * 100% = (1 / aspectRatio) * 100%
      */}
      <div 
        className="masonry-card-image-wrapper"
        style={{ 
          paddingTop: `${(1 / aspectRatio) * 100}%`,
          backgroundColor: dominantColor // 主色调背景占位
        }}
      >
        {/* 
          缩略图展示
          - 使用 thumbnailUrl 减少初始加载流量
          - loading="lazy" 实现原生懒加载
          - 加载完成后通过 opacity 渐变显示
        */}
        <img
          src={thumbnail}
          alt={title}
          className={`masonry-card-image${imageLoaded ? ' loaded' : ''}`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
        
        {/* 始终可见的分类徽章 */}
        {picture.category && (
          <span className="masonry-card-category-badge">{picture.category}</span>
        )}
        
        {/* 
          Hover 遮罩层
          - 渐变背景：从下到上，透明到半透明黑色
          - 鼠标悬停时平滑浮现
          - 展示图片标题和操作按钮
        */}
        <div className="masonry-card-overlay">
          <div className="masonry-card-overlay-content">
            {/* 左侧：图片信息 */}
            <div className="masonry-card-info">
              <span className="masonry-card-title">{title}</span>
              {picture.category && (
                <span className="masonry-card-category">{picture.category}</span>
              )}
            </div>
            
            {/* 右侧：操作按钮组 */}
            <div className="masonry-card-actions">
              {/* 图片详情按钮 - 始终显示 */}
              <button
                type="button"
                className="masonry-action-btn masonry-action-btn-detail"
                onClick={async (e) => {
                  e.stopPropagation()
                  // 调用接口获取最新图片详情
                  try {
                    const detailPicture = await pictureApi.getVoById(picture.id)
                    if (onPictureDetail) {
                      onPictureDetail(detailPicture)
                    }
                  } catch (error) {
                    console.error('获取图片详情失败:', error)
                    // 如果接口调用失败，使用当前图片数据
                    if (onPictureDetail) {
                      onPictureDetail(picture)
                    }
                  }
                }}
                title="查看详情"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>

              {/* AI 扩图按钮 - 条件显示 */}
              {onAIOutPainting && (
                <button
                  type="button"
                  className="masonry-action-btn masonry-action-btn-ai"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAIOutPainting()
                  }}
                  title="AI 扩图"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </button>
              )}
              
              {/* 下载按钮 - 条件显示 */}
              {onDownload && (
                <button
                  type="button"
                  className="masonry-action-btn masonry-action-btn-download"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDownload()
                  }}
                  title="下载图片"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
              )}
              
              {/* 删除按钮 - 条件显示 */}
              {onDelete && (
                <button
                  type="button"
                  className="masonry-action-btn masonry-action-btn-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  title="删除图片"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 大图预览组件（Lightbox）
 * 特性：
 * - 全屏黑色遮罩背景
 * - 加载高清 WebP 大图（webpUrl）
 * - 左右箭头导航切换
 * - 键盘支持（← → Esc）
 * - 图片计数显示
 * - 图片信息展示
 */
interface LightboxProps {
  pictures: PictureVO[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

function Lightbox({ pictures, currentIndex, onClose, onNavigate }: LightboxProps) {
  const currentPicture = pictures[currentIndex]
  const { large: currentLargeUrl } = getImageUrls(currentPicture)
  const title = currentPicture.title || currentPicture.name || `图片 #${currentPicture.id}`

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        onNavigate(currentIndex > 0 ? currentIndex - 1 : pictures.length - 1)
      } else if (e.key === 'ArrowRight') {
        onNavigate(currentIndex < pictures.length - 1 ? currentIndex + 1 : 0)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, pictures.length, onClose, onNavigate])

  // 预加载下一张图片的 WebP 大图
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % pictures.length
    const nextPicture = pictures[nextIndex]
    const { large: nextLargeUrl } = getImageUrls(nextPicture)
    
    const img = new Image()
    img.src = nextLargeUrl
    // 预加载不处理错误，静默失败即可
  }, [currentIndex, pictures])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button className="lightbox-close" onClick={onClose} title="关闭 (Esc)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* 上一张按钮 */}
        <button 
          className="lightbox-nav lightbox-prev"
          onClick={() => onNavigate(currentIndex > 0 ? currentIndex - 1 : pictures.length - 1)}
          title="上一张 (←)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        {/* 下一张按钮 */}
        <button 
          className="lightbox-nav lightbox-next"
          onClick={() => onNavigate(currentIndex < pictures.length - 1 ? currentIndex + 1 : 0)}
          title="下一张 (→)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        {/* 
          大图展示区域
          关键技术：使用 webpUrl 加载高清大图
          - 如果存在 webpUrl，优先使用（WebP 格式更小更清晰）
          - 否则降级使用原图 url
        */}
        {currentPicture && (
          <div className="lightbox-image-wrapper">
            <img
              src={currentLargeUrl}
              alt={title}
              className="lightbox-image"
            />
            {/* 图片信息 */}
            <div className="lightbox-info">
              <h3 className="lightbox-title">{title}</h3>
              {currentPicture.introduction && (
                <p className="lightbox-description">{currentPicture.introduction}</p>
              )}
              <div className="lightbox-meta">
                {currentPicture.picWidth && currentPicture.picHeight && (
                  <span className="lightbox-dimensions">
                    {currentPicture.picWidth} × {currentPicture.picHeight}
                  </span>
                )}
                {currentPicture.category && (
                  <span className="lightbox-category">{currentPicture.category}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 图片计数 */}
        <div className="lightbox-counter">
          {currentIndex + 1} / {pictures.length}
        </div>
      </div>
    </div>
  )
}

/**
 * 瀑布流图片展示组件主组件
 */
export function MasonryGallery({
  pictures,
  loading,
  onPictureClick,
  onPictureDetail,
  onDownload,
  onDelete,
  onAIOutPainting,
  columnMinWidth = 300,
  gap = 16,
}: MasonryGalleryProps) {
  // 当前预览的图片索引（null 表示未打开预览）
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  // 计算响应式列数（基于屏幕宽度）
  const columnCount = useMemo(() => {
    if (typeof window === 'undefined') return 4
    
    const width = window.innerWidth
    const calculatedColumns = Math.floor(width / columnMinWidth)
    return Math.max(1, Math.min(calculatedColumns, 5)) // 最多 5 列，最少 1 列
  }, [columnMinWidth])

  // 处理图片点击，打开大图预览
  const handlePictureClick = useCallback((index: number) => {
    setPreviewIndex(index)
    // 调用外部回调（如果需要）
    onPictureClick(pictures[index], index)
  }, [onPictureClick, pictures])

  // 关闭预览
  const closePreview = useCallback(() => {
    setPreviewIndex(null)
  }, [])

  // 导航到指定索引
  const navigateToIndex = useCallback((index: number) => {
    setPreviewIndex(index)
  }, [])

  return (
    <>
      {/* 组件样式定义 */}
      <style>{`
        /* ========== 瀑布流容器 ========== */
        .masonry-gallery {
          column-count: ${columnCount};
          column-gap: ${gap}px;
          padding: ${gap}px;
          background: #ffffff;
        }

        /* 响应式断点 */
        @media (max-width: 1600px) {
          .masonry-gallery { column-count: Math.min(4, ${columnCount}); }
        }
        @media (max-width: 1200px) {
          .masonry-gallery { column-count: Math.min(3, ${columnCount}); }
        }
        @media (max-width: 768px) {
          .masonry-gallery { column-count: Math.min(2, ${columnCount}); }
        }
        @media (max-width: 480px) {
          .masonry-gallery { column-count: 1; }
        }

        /* ========== 图片卡片 ========== */
        .masonry-card {
          break-inside: avoid; /* 防止卡片被分列断开 */
          margin-bottom: ${gap}px;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .masonry-card:hover {
          transform: translateY(-4px);
        }

        /* 图片容器 - 使用 padding-top 实现占位 */
        .masonry-card-image-wrapper {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
          transition: background-color 0.3s ease;
        }

        /* 图片样式 */
        .masonry-card-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .masonry-card-image.loaded {
          opacity: 1; /* 加载完成后渐入显示 */
        }

        /* ========== 始终可见的分类徽章 ========== */
        .masonry-card-category-badge {
          position: absolute;
          bottom: 10px;
          left: 10px;
          padding: 4px 10px;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          color: white;
          font-size: 0.72rem;
          font-weight: 600;
          border-radius: 6px;
          z-index: 2;
          letter-spacing: 0.3px;
          pointer-events: none;
          transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ========== Hover 遮罩层 ========== */
        .masonry-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(0, 0, 0, 0.1) 30%,
            rgba(0, 0, 0, 0.5) 70%,
            rgba(0, 0, 0, 0.75) 100%
          );
          display: flex;
          align-items: flex-end;
          opacity: 0;
          transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 24px 16px 16px;
        }

        .masonry-card:hover .masonry-card-overlay {
          opacity: 1;
        }

        /* hover 时隐藏始终可见的分类徽章，避免与遮罩层重复 */
        .masonry-card:hover .masonry-card-category-badge {
          opacity: 0;
        }

        /* 增强卡片整体的 hover 效果 */
        .masonry-card {
          will-change: transform;
        }

        .masonry-card-overlay-content {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .masonry-card-info {
          flex: 1;
          min-width: 0;
        }

        .masonry-card-title {
          color: white;
          font-size: 0.95rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
          margin-bottom: 6px;
          letter-spacing: 0.3px;
        }

        .masonry-card-category {
          color: white;
          font-size: 0.72rem;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.85) 0%, rgba(118, 75, 162, 0.85) 100%);
          padding: 3px 10px;
          border-radius: 6px;
          backdrop-filter: blur(12px);
          font-weight: 600;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          display: inline-block;
        }

        .masonry-card-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .masonry-action-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .masonry-action-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px) scale(1.08);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .masonry-action-btn:active {
          transform: translateY(0) scale(0.95);
        }

        /* 详情按钮 - 蓝色主题 */
        .masonry-action-btn-detail:hover {
          background: rgba(59, 130, 246, 0.6);
        }

        /* AI 扩图按钮 - 紫色主题 */
        .masonry-action-btn-ai:hover {
          background: rgba(139, 92, 246, 0.6);
        }

        /* 下载按钮 - 绿色主题 */
        .masonry-action-btn-download:hover {
          background: rgba(16, 185, 129, 0.6);
        }

        /* 删除按钮 - 红色主题 */
        .masonry-action-btn-delete:hover {
          background: rgba(239, 68, 68, 0.6);
        }

        /* ========== 骨架屏 ========== */
        .skeleton-card {
          break-inside: avoid;
          margin-bottom: ${gap}px;
          border-radius: 12px;
          overflow: hidden;
          background: #f9fafb;
        }

        .skeleton-image {
          width: 100%;
          padding-top: 150%; /* 3:2 比例 */
          background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e0e0e0 50%,
            #f0f0f0 75%
          );
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
          border-radius: 12px;
        }

        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ========== Lightbox 大图预览 ========== */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.96);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: lightbox-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes lightbox-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
        }

        .lightbox-close {
          position: absolute;
          top: -48px;
          right: 0;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          border: none;
          color: white;
          cursor: pointer;
          padding: 10px;
          border-radius: 50%;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }

        .lightbox-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }

        .lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          border: none;
          color: white;
          cursor: pointer;
          padding: 14px;
          border-radius: 50%;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }

        .lightbox-nav:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-50%) scale(1.08);
        }

        .lightbox-nav:active {
          transform: translateY(-50%) scale(0.95);
        }

        .lightbox-prev {
          left: -64px;
        }

        .lightbox-next {
          right: -64px;
        }

        .lightbox-image-wrapper {
          max-width: 90vw;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }

        .lightbox-image {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
          border-radius: 4px;
        }

        .lightbox-info {
          margin-top: 20px;
          text-align: center;
          color: white;
        }

        .lightbox-title {
          font-size: 1.3rem;
          margin: 0 0 10px;
          font-weight: 600;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .lightbox-description {
          font-size: 0.95rem;
          opacity: 0.9;
          margin: 0 0 16px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        .lightbox-meta {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 0.85rem;
          opacity: 0.75;
        }

        .lightbox-dimensions,
        .lightbox-category {
          background: rgba(255, 255, 255, 0.15);
          padding: 5px 14px;
          border-radius: 6px;
          backdrop-filter: blur(8px);
        }

        .lightbox-counter {
          position: absolute;
          bottom: -48px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-size: 0.95rem;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          padding: 6px 16px;
          border-radius: 20px;
        }

        /* ========== 响应式调整 ========== */
        @media (max-width: 768px) {
          .lightbox-nav {
            padding: 12px;
          }
          .lightbox-prev {
            left: 12px;
          }
          .lightbox-next {
            right: 12px;
          }
          .lightbox-close {
            top: 12px;
            right: 12px;
          }
          .lightbox-counter {
            bottom: 12px;
          }
        }

        /* ========== 空状态 ========== */
        .empty-state {
          text-align: center;
          padding: 80px 20px;
          color: #9ca3af;
        }

        .empty-state svg {
          opacity: 0.4;
          margin-bottom: 16px;
        }

        .empty-state p {
          font-size: 1.1rem;
          margin: 0 0 8px;
        }

        .empty-state .hint {
          font-size: 0.9rem;
          opacity: 0.7;
          margin-top: 8px;
        }
      `}</style>

      {/* 瀑布流容器 */}
      <div className="masonry-gallery">
        {loading ? (
          // 骨架屏加载状态
          Array.from({ length: columnCount * 3 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          // 图片列表
          pictures.map((picture, index) => (
            <PictureCard
              key={picture.id}
              picture={picture}
              index={index}
              onClick={handlePictureClick}
              onPictureDetail={onPictureDetail ? () => onPictureDetail(picture) : undefined}
              onDownload={onDownload ? () => onDownload(picture) : undefined}
              onDelete={onDelete ? () => onDelete(picture) : undefined}
              onAIOutPainting={onAIOutPainting ? () => onAIOutPainting(picture) : undefined}
            />
          ))
        )}
      </div>

      {/* 空状态提示 */}
      {!loading && pictures.length === 0 && (
        <div className="empty-state">
          <svg 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <p>暂无图片数据</p>
          <p className="hint">试试调整筛选条件或稍后再来</p>
        </div>
      )}

      {/* 大图预览 Lightbox */}
      {previewIndex !== null && (
        <Lightbox
          pictures={pictures}
          currentIndex={previewIndex}
          onClose={closePreview}
          onNavigate={navigateToIndex}
        />
      )}
    </>
  )
}
