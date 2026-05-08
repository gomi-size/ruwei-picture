import { useState, useCallback } from 'react'
import type { PictureVO, UserVO } from '../types/api'
import { formatDate, formatFileSize } from '../utils/format'

interface PictureDetailPanelProps {
  /** 是否打开面板 */
  open: boolean
  /** 图片详情数据 */
  picture: PictureVO | null
  /** 当前登录用户 */
  currentUser?: UserVO | null
  /** 关闭回调 */
  onClose: () => void
  /** 编辑回调 */
  onEdit?: (picture: PictureVO) => void
  /** 收藏回调 */
  onFavorite?: (picture: PictureVO) => void
  /** 下载回调 */
  onDownload?: (picture: PictureVO) => void
  /** 分享回调 */
  onShare?: (picture: PictureVO) => void
  /** AI 扩图回调 */
  onAIOutPainting?: (picture: PictureVO) => void
  /** 删除回调 */
  onDelete?: (picture: PictureVO) => void
}

/**
 * 图片详情侧边栏面板 - 商业美感设计
 * 
 * 设计理念：
 * - 极简主义：纯白背景 + 精致排版
 * - 信息分层：清晰的信息层级和视觉引导
 * - 商业质感：精致的阴影、圆角和过渡效果
 * - 功能完备：所有常用操作触手可及
 * 
 * @example
 * ```tsx
 * <PictureDetailPanel
 *   open={detailOpen}
 *   picture={currentPicture}
 *   currentUser={user}
 *   onClose={() => setDetailOpen(false)}
 *   onEdit={handleEdit}
 *   onDownload={handleDownload}
 * />
 * ```
 */
export function PictureDetailPanel({
  open,
  picture,
  currentUser,
  onClose,
  onEdit,
  onFavorite,
  onDownload,
  onShare,
  onAIOutPainting,
  onDelete,
}: PictureDetailPanelProps) {
  // 复制 ID 的提示状态
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  // 阻止点击事件冒泡
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (!open) {
    return null
  }

  // 计算宽高比显示文本
  const aspectRatioText = picture?.aspectRatio 
    ? `${picture.aspectRatio.toFixed(2)} : 1`
    : picture?.picWidth && picture?.picHeight
    ? `${picture.picWidth} : ${picture.picHeight}`
    : '—'

  // 判断是否已收藏（示例逻辑，实际应根据后端数据）
  const isFavorited = false

  return (
    <>
      {/* 样式定义 */}
      <style>{`
        /* ========== 遮罩层 ========== */
        .detail-panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 9998;
          opacity: 0;
          animation: overlay-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .detail-panel-overlay.open {
          opacity: 1;
        }

        @keyframes overlay-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ========== 侧边栏容器 ========== */
        .detail-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 380px;
          height: 100vh;
          background: white;
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          animation: panel-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
        }

        .detail-panel.open {
          transform: translateX(0);
        }

        @keyframes panel-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        /* ========== 头部区域 ========== */
        .detail-panel-header {
          padding: 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .detail-panel-title-section {
          flex: 1;
          min-width: 0;
        }

        .detail-panel-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px;
          line-height: 1.3;
          word-break: break-word;
        }

        .detail-panel-id {
          font-size: 0.85rem;
          color: #9ca3af;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          background: transparent;
          border: none;
          transition: all 0.2s ease;
        }

        .detail-panel-id:hover {
          background: #f9fafb;
          color: #6b7280;
        }

        .detail-panel-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: white;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .icon-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #111827;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .icon-btn--primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          color: white;
        }

        .icon-btn--primary:hover {
          background: linear-gradient(135deg, #5568d3 0%, #6a429a 100%);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        /* ========== 内容区域 ========== */
        .detail-panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        /* 骨架屏 */
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

        /* 章节标题 */
        .detail-section-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .detail-section-title::before {
          content: '';
          width: 3px;
          height: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 2px;
        }

        /* 技术参数 Grid */
        .tech-specs-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .tech-spec-item {
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          transition: all 0.2s ease;
        }

        .tech-spec-item:hover {
          background: #f3f4f6;
          border-color: #e5e7eb;
        }

        .tech-spec-label {
          font-size: 0.75rem;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tech-spec-value {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          word-break: break-word;
        }

        /* 色彩分析 */
        .color-analysis-section {
          margin-bottom: 24px;
        }

        .color-preview {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
        }

        .color-swatch {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .color-info {
          flex: 1;
          min-width: 0;
        }

        .color-label {
          font-size: 0.75rem;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .color-value {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          font-family: 'Monaco', 'Consolas', monospace;
        }

        /* 属性区 */
        .attributes-section {
          margin-bottom: 24px;
        }

        .attribute-item {
          margin-bottom: 16px;
        }

        .attribute-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .tag-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pill-tag {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #1d4ed8;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
          border: 1px solid rgba(59, 130, 246, 0.15);
          transition: all 0.2s ease;
        }

        .pill-tag:hover {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
        }

        /* 操作记录 */
        .activity-section {
          padding: 16px;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          margin-bottom: 24px;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-text {
          font-size: 0.9rem;
          color: #374151;
          margin-bottom: 4px;
        }

        .activity-text strong {
          font-weight: 600;
          color: #111827;
        }

        .activity-time {
          font-size: 0.8rem;
          color: #9ca3af;
        }

        /* ========== 底部按钮组 ========== */
        .detail-panel-footer {
          padding: 20px 24px;
          border-top: 1px solid #f1f5f9;
          flex-shrink: 0;
        }

        .button-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
        }

        .action-btn--primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .action-btn--primary:hover {
          background: linear-gradient(135deg, #5568d3 0%, #6a429a 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .action-btn--secondary {
          background: white;
          color: #475569;
          border: 1px solid #e5e7eb;
        }

        .action-btn--secondary:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #111827;
          transform: translateY(-1px);
        }

        .action-btn--danger {
          background: white;
          color: #ef4444;
          border: 1px solid #fee2e2;
        }

        .action-btn--danger:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }

        /* ========== 空状态 ========== */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #9ca3af;
          text-align: center;
        }

        .empty-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        /* ========== 响应式 ========== */
        @media (max-width: 768px) {
          .detail-panel {
            width: 100%;
          }
        }
      `}</style>

      {/* 遮罩层 */}
      <div 
        className={`detail-panel-overlay${open ? ' open' : ''}`}
        onClick={onClose}
      />

      {/* 侧边栏面板 */}
      <div className={`detail-panel${open ? ' open' : ''}`}>
        {/* 头部 */}
        <div className="detail-panel-header">
          <div className="detail-panel-title-section">
            <h2 className="detail-panel-title">
              {picture?.title || picture?.name || '未命名图片'}
            </h2>
            <button
              type="button"
              className="detail-panel-id"
              onClick={() => copyToClipboard(`#${picture?.id}`, 'id')}
              title="点击复制 ID"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              #{picture?.id}
              {copiedId === 'id' && (
                <span style={{ color: '#10b981', fontSize: '0.75rem' }}>已复制</span>
              )}
            </button>
          </div>
          
          <div className="detail-panel-actions">
            {onEdit && (
              <button
                type="button"
                className="icon-btn"
                onClick={stopPropagation}
                title="编辑"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            )}
            {onFavorite && (
              <button
                type="button"
                className={`icon-btn${isFavorited ? ' icon-btn--primary' : ''}`}
                onClick={stopPropagation}
                title="收藏"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="detail-panel-content">
          {!picture ? (
            /* 骨架屏加载 */
            <div className="skeleton" style={{ height: '100%', minHeight: '400px' }} />
          ) : (
            <>
              {/* 技术参数 */}
              <div>
                <h3 className="detail-section-title">技术参数</h3>
                <div className="tech-specs-grid">
                  <div className="tech-spec-item">
                    <div className="tech-spec-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      格式
                    </div>
                    <div className="tech-spec-value">
                      {picture.picFormat?.toUpperCase() || '—'}
                    </div>
                  </div>

                  <div className="tech-spec-item">
                    <div className="tech-spec-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                      尺寸
                    </div>
                    <div className="tech-spec-value">
                      {picture.picWidth && picture.picHeight
                        ? `${picture.picWidth} × ${picture.picHeight}`
                        : '—'}
                    </div>
                  </div>

                  <div className="tech-spec-item">
                    <div className="tech-spec-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      大小
                    </div>
                    <div className="tech-spec-value">
                      {picture.picSize ? formatFileSize(picture.picSize) : '—'}
                    </div>
                  </div>

                  <div className="tech-spec-item">
                    <div className="tech-spec-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                      </svg>
                      比例
                    </div>
                    <div className="tech-spec-value">
                      {aspectRatioText}
                    </div>
                  </div>
                </div>
              </div>

              {/* 色彩分析 */}
              {picture.dominantColor && (
                <div className="color-analysis-section">
                  <h3 className="detail-section-title">色彩分析</h3>
                  <div className="color-preview">
                    <div 
                      className="color-swatch"
                      style={{ backgroundColor: picture.dominantColor }}
                    />
                    <div className="color-info">
                      <div className="color-label">主色调</div>
                      <div className="color-value">{picture.dominantColor}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 属性信息 */}
              <div className="attributes-section">
                <h3 className="detail-section-title">属性信息</h3>
                
                {/* 分类 */}
                {picture.category && (
                  <div className="attribute-item">
                    <div className="attribute-label">所属分类</div>
                    <div className="pill-tag">{picture.category}</div>
                  </div>
                )}

                {/* 标签 */}
                {picture.tags && picture.tags.length > 0 && (
                  <div className="attribute-item">
                    <div className="attribute-label">标签</div>
                    <div className="tag-cloud">
                      {picture.tags.map((tag, index) => (
                        <span key={index} className="pill-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 简介 */}
                {picture.introduction && (
                  <div className="attribute-item">
                    <div className="attribute-label">简介</div>
                    <div style={{ 
                      fontSize: '0.95rem', 
                      color: '#475569', 
                      lineHeight: '1.6',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      {picture.introduction}
                    </div>
                  </div>
                )}
              </div>

              {/* 操作记录 */}
              <div className="activity-section">
                <div className="activity-item">
                  <div className="activity-avatar">
                    {picture.user?.userNickname?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">
                      由 <strong>{picture.user?.userNickname || '匿名用户'}</strong> 上传
                    </div>
                    <div className="activity-time">
                      {picture.createTime ? formatDate(picture.createTime) : '未知时间'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部按钮组 */}
        <div className="detail-panel-footer">
          <div className="button-group">
            {/* 主按钮：AI 扩图 */}
            {onAIOutPainting && picture && (
              <button
                type="button"
                className="action-btn action-btn--primary"
                onClick={() => {
                  stopPropagation()
                  onAIOutPainting(picture)
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                AI 扩图
              </button>
            )}

            {/* 次要按钮：下载、分享 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {onDownload && picture && (
                <button
                  type="button"
                  className="action-btn action-btn--secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    stopPropagation()
                    onDownload(picture)
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  下载
                </button>
              )}
              {onShare && picture && (
                <button
                  type="button"
                  className="action-btn action-btn--secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    stopPropagation()
                    onShare(picture)
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  分享
                </button>
              )}
            </div>

            {/* 危险按钮：删除 */}
            {onDelete && picture && currentUser?.userRole === 'admin' && (
              <button
                type="button"
                className="action-btn action-btn--danger"
                onClick={() => {
                  stopPropagation()
                  onDelete(picture)
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                删除图片
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
