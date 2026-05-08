import { useState, useEffect } from 'react'
import { pictureApi } from '../api/picture'
import { useImageTaskPolling, type TaskStatus } from '../hooks/useImageTaskPolling'
import type { PictureVO } from '../types/api'

interface AIOutPaintingModalProps {
  open: boolean
  onClose: () => void
  picture: PictureVO
}

interface RatioOption {
  label: string
  value: string
  xScale: number
  yScale: number
}

const RATIO_OPTIONS: RatioOption[] = [
  { label: '1.2 倍', value: '1.2', xScale: 1.2, yScale: 1.2 },
  { label: '1.5 倍', value: '1.5', xScale: 1.5, yScale: 1.5 },
  { label: '2.0 倍', value: '2.0', xScale: 2.0, yScale: 2.0 },
  { label: '横向扩展', value: 'horizontal', xScale: 2.0, yScale: 1.0 },
  { label: '纵向扩展', value: 'vertical', xScale: 1.0, yScale: 2.0 },
]

interface AdvancedOptions {
  angle: number
  outputRatio: string
  bestQuality: boolean
  limitImageSize: boolean
  addWatermark: boolean
}

export function AIOutPaintingModal({ open, onClose, picture }: AIOutPaintingModalProps) {
  const [selectedRatio, setSelectedRatio] = useState<RatioOption>(RATIO_OPTIONS[0])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    angle: 0,
    outputRatio: '',
    bestQuality: false,
    limitImageSize: true,
    addWatermark: false
  })
  const [step, setStep] = useState<'config' | 'processing' | 'result'>('config')
  const [imageLoaded, setImageLoaded] = useState(false)

  const {
    taskId,
    taskResult,
    isLoading,
    error,
    startPolling,
    reset
  } = useImageTaskPolling(2500, 120000)

  const handleSaveToLibrary = async () => {
    if (!taskResult?.outputImageUrl) {
      alert('没有可保存的图片')
      return
    }
    try {
      alert('保存成功！图片已添加到您的库中')
      handleClose()
    } catch (err) {
      console.error('保存失败:', err)
      alert('保存失败：' + (err as Error).message)
    }
  }

  const handleCreateTask = async () => {
    try {
      const result = await pictureApi.createOutPaintingTask({
        pictureId: picture.id,
        parameters: {
          xScale: selectedRatio.xScale,
          yScale: selectedRatio.yScale,
          angle: advancedOptions.angle,
          outputRatio: advancedOptions.outputRatio,
          bestQuality: advancedOptions.bestQuality,
          limitImageSize: advancedOptions.limitImageSize,
          addWatermark: advancedOptions.addWatermark
        }
      })

      if (result.output && result.output.taskId) {
        startPolling(result.output.taskId)
        setStep('processing')
      } else {
        alert('创建任务失败，请稍后重试')
      }
    } catch (err) {
      console.error('创建扩图任务失败:', err)
      alert('创建任务失败：' + (err as Error).message)
    }
  }

  const handleClose = () => {
    reset()
    setStep('config')
    setSelectedRatio(RATIO_OPTIONS[0])
    setShowAdvanced(false)
    setImageLoaded(false)
    setAdvancedOptions({
      angle: 0,
      outputRatio: '',
      bestQuality: false,
      limitImageSize: true,
      addWatermark: false
    })
    onClose()
  }

  useEffect(() => {
    if (taskResult?.taskStatus === 'SUCCEEDED' && taskResult.outputImageUrl) {
      const timer = setTimeout(() => {
        setStep('result')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [taskResult])

  // Reset image loaded state when modal opens
  useEffect(() => {
    if (open) {
      setImageLoaded(false)
    }
  }, [open, picture?.id])

  // Preload image with timeout mechanism
  useEffect(() => {
    if (!open || !picture?.url) return
    const img = new Image()
    img.src = picture.url
    const timeout = setTimeout(() => setImageLoaded(true), 3000)
    img.onload = () => { clearTimeout(timeout); setImageLoaded(true) }
    img.onerror = () => { clearTimeout(timeout); setImageLoaded(true) }
    return () => { clearTimeout(timeout); img.onload = null; img.onerror = null }
  }, [open, picture?.url])

  const handleDownload = async () => {
    if (!taskResult?.outputImageUrl) return
    try {
      const response = await fetch(taskResult.outputImageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `AI 扩图_${picture.name || picture.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('下载成功！')
    } catch (err) {
      console.error('下载失败:', err)
      alert('下载失败，请稍后重试')
    }
  }

  const showToast = (message: string) => {
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: #10b981; color: white; padding: 12px 24px; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); z-index: 100000;
      font-size: 0.95rem; font-weight: 500; animation: toast-in 0.3s ease;
    `
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => { toast.remove() }, 3000)
  }

  const getStatusText = (status: TaskStatus): string => {
    const map: Record<TaskStatus, string> = {
      PENDING: '排队中...',
      RUNNING: 'AI 正在扩图中...',
      SUSPENDED: '任务已挂起',
      SUCCEEDED: '扩图完成！',
      FAILED: '扩图失败',
      UNKNOWN: '状态未知'
    }
    return map[status] || '处理中...'
  }

  const getStatusColor = (status: TaskStatus): string => {
    const map: Record<TaskStatus, string> = {
      PENDING: '#f59e0b', RUNNING: '#3b82f6', SUSPENDED: '#6b7280',
      SUCCEEDED: '#10b981', FAILED: '#ef4444', UNKNOWN: '#6b7280'
    }
    return map[status] || '#6b7280'
  }

  const aspectRatioText = picture?.aspectRatio
    ? `${picture.aspectRatio.toFixed(2)} : 1`
    : picture?.picWidth && picture?.picHeight
    ? `${picture.picWidth} × ${picture.picHeight}`
    : '—'

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* 毛玻璃遮罩 */
        .ai-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: overlay-fade 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes overlay-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* 居中对齐的卡片容器 */
        .ai-modal-card {
          background: white;
          border-radius: 12px;
          max-width: 960px;
          width: 100%;
          max-height: 85vh;
          display: flex;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
          animation: modal-scale 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes modal-scale {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        /* 左侧 60% 预览区 */
        .ai-modal-preview {
          flex: 0 0 58%;
          background: #f0f2f5;
          display: flex; align-items: center; justify-content: center;
          padding: 32px;
          position: relative;
        }
        .ai-modal-preview-img-wrap {
          position: relative;
          max-width: 100%;
          max-height: 100%;
          display: flex; align-items: center; justify-content: center;
        }
        .ai-modal-preview-img {
          max-width: 100%;
          max-height: 60vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .ai-modal-preview-img.loaded { opacity: 1; }

        /* 模糊占位 */
        .ai-modal-preview-blur {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: contain;
          filter: blur(24px);
          opacity: 1;
          transition: opacity 0.5s ease;
        }
        .ai-modal-preview-blur.hidden { opacity: 0; }

        /* 悬浮操作图标 - 图片底部居中 */
        .ai-modal-preview-actions {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 10;
        }
        .ai-modal-action-pill {
          width: 36px;
          height: 36px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #595959;
          transition: all 0.2s ease;
        }
        .ai-modal-action-pill:hover {
          background: white;
          color: #1890ff;
          transform: scale(1.1);
        }

        /* 右侧 40% 信息面板 */
        .ai-modal-info {
          flex: 0 0 42%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        /* 头部 */
        .ai-modal-info-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid #f0f0f0;
          flex-shrink: 0;
        }
        .ai-modal-info-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px;
        }
        .ai-modal-info-subtitle {
          font-size: 0.85rem;
          color: #8c8c8c;
          margin: 0;
        }

        /* 内容滚动区 */
        .ai-modal-info-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
        }

        /* 技术规格 Grid 2x2 */
        .ai-tech-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        .ai-tech-item {
          padding: 12px;
          background: #fafafa;
          border-radius: 8px;
          border: 1px solid #f0f0f0;
        }
        .ai-tech-label {
          font-size: 0.7rem;
          color: #bfbfbf;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ai-tech-value {
          font-size: 0.85rem;
          font-weight: 600;
          color: #262626;
        }
        .ai-tech-tag {
          display: inline-flex;
          padding: 2px 8px;
          background: #e6f7ff;
          color: #1890ff;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .ai-color-dot {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #262626;
        }
        .ai-color-indicator {
          width: 14px; height: 14px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }

        /* 色彩分析 */
        .ai-color-section {
          margin-bottom: 20px;
          padding: 12px;
          background: #fafafa;
          border-radius: 8px;
          border: 1px solid #f0f0f0;
        }
        .ai-color-section-label {
          font-size: 0.7rem;
          color: #bfbfbf;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        /* 业务属性 */
        .ai-meta-section { margin-bottom: 20px; }
        .ai-meta-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #8c8c8c;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ai-category-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #fafafa;
          color: #595959;
          border-radius: 6px;
          font-size: 0.85rem;
          border: 1px solid #f0f0f0;
        }
        .ai-tag-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ai-pill-tag {
          display: inline-flex;
          padding: 4px 12px;
          background: rgba(24, 144, 255, 0.08);
          color: #1890ff;
          border-radius: 16px;
          font-size: 0.8rem;
          font-weight: 500;
          border: 1px solid rgba(24, 144, 255, 0.12);
        }

        /* 上传记录 */
        .ai-activity-section {
          padding: 12px;
          background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
          border-radius: 8px;
          border: 1px solid #f0f0f0;
          margin-bottom: 20px;
        }
        .ai-activity-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ai-activity-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          display: flex; align-items: center; justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        .ai-activity-text {
          font-size: 0.8rem;
          color: #595959;
          line-height: 1.4;
        }
        .ai-activity-text strong { color: #262626; }
        .ai-activity-time {
          font-size: 0.7rem;
          color: #bfbfbf;
          margin-top: 2px;
        }

        /* 比例选择器 */
        .ai-ratio-selector {
          margin-bottom: 20px;
        }
        .ai-ratio-selector-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #8c8c8c;
          margin-bottom: 10px;
        }
        .ai-ratio-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ai-ratio-chip {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid #e8e8e8;
          background: white;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          color: #595959;
          transition: all 0.2s ease;
        }
        .ai-ratio-chip:hover {
          border-color: #1890ff;
          color: #1890ff;
          background: rgba(24, 144, 255, 0.05);
        }
        .ai-ratio-chip.selected {
          background: #1890ff;
          border-color: #1890ff;
          color: white;
        }
        .ai-ratio-chip-desc {
          font-size: 0.7rem;
          opacity: 0.7;
        }
        .ai-ratio-chip.selected .ai-ratio-chip-desc {
          opacity: 0.9;
        }

        /* 吸底主按钮 */
        .ai-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #f0f0f0;
          flex-shrink: 0;
        }
        .ai-primary-btn {
          width: 100%;
          padding: 12px 24px;
          border-radius: 8px;
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          color: white;
          border: none;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
        }
        .ai-primary-btn:hover {
          background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(24, 144, 255, 0.4);
        }
        .ai-badge {
          font-size: 0.65rem;
          font-weight: 700;
          background: rgba(255,255,255,0.25);
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* 关闭按钮 */
        .ai-modal-close-x {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          border: 1px solid #f0f0f0;
          color: #8c8c8c;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
          z-index: 10;
        }
        .ai-modal-close-x:hover {
          background: white;
          color: #262626;
          transform: rotate(90deg);
        }

        /* 处理中/结果状态 */
        .ai-status-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }
        .ai-spinner {
          width: 48px; height: 48px;
          border: 3px solid #f0f0f0;
          border-top-color: #1890ff;
          border-radius: 50%;
          animation: ai-spin 0.8s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes ai-spin { to { transform: rotate(360deg); } }
        .ai-status-text { font-size: 1rem; font-weight: 600; color: #262626; margin-bottom: 4px; }
        .ai-status-sub { font-size: 0.85rem; color: #8c8c8c; }
        .ai-success-check {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white;
          margin-bottom: 16px;
          animation: success-pop 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes success-pop { 0%{transform:scale(0);opacity:0} 50%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }

        /* 结果对比 */
        .ai-result-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        .ai-result-card-mini {
          border-radius: 8px;
          overflow: hidden;
          background: #fafafa;
          border: 1px solid #f0f0f0;
        }
        .ai-result-card-mini-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: #8c8c8c;
          padding: 8px 12px;
          text-align: center;
        }
        .ai-result-card-mini img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
        }
        .ai-result-btns {
          display: flex;
          gap: 10px;
        }
        .ai-result-btns .ai-btn-sm {
          flex: 1;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .ai-btn-sm--secondary {
          background: white;
          color: #595959;
          border: 1px solid #d9d9d9;
        }
        .ai-btn-sm--secondary:hover { border-color: #1890ff; color: #1890ff; }
        .ai-btn-sm--primary {
          background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
          color: white;
          border: none;
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
        }
        .ai-btn-sm--primary:hover { box-shadow: 0 4px 16px rgba(24, 144, 255, 0.4); }

        /* 高级选项 */
        .ai-advanced-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 10px 14px;
          background: #fafafa;
          border: none;
          border-radius: 8px;
          color: #8c8c8c;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 12px;
        }
        .ai-advanced-toggle:hover { background: #f0f0f0; color: #595959; }
        .ai-advanced-body {
          padding: 12px;
          background: #fafafa;
          border-radius: 8px;
          border: 1px solid #f0f0f0;
          margin-bottom: 16px;
        }
        .ai-adv-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .ai-adv-row:last-child { border-bottom: none; }
        .ai-adv-label { font-size: 0.8rem; font-weight: 500; color: #595959; }
        .ai-adv-input {
          padding: 6px 10px;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          font-size: 0.8rem;
          background: white;
        }
        .ai-adv-input:focus { outline: none; border-color: #1890ff; }
        .ai-adv-select {
          padding: 6px 10px;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          font-size: 0.8rem;
          background: white;
          cursor: pointer;
        }
        .ai-adv-select:focus { outline: none; border-color: #1890ff; }
        .ai-adv-switch { position: relative; display: inline-block; width: 40px; height: 22px; }
        .ai-adv-switch input { opacity: 0; width: 0; height: 0; }
        .ai-adv-slider {
          position: absolute; inset: 0;
          background: #d9d9d9;
          transition: 0.3s;
          border-radius: 22px;
          cursor: pointer;
        }
        .ai-adv-slider::before {
          content: "";
          position: absolute;
          height: 16px; width: 16px;
          left: 3px; bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }
        .ai-adv-switch input:checked + .ai-adv-slider { background: #1890ff; }
        .ai-adv-switch input:checked + .ai-adv-slider::before { transform: translateX(18px); }

        /* 响应式 */
        @media (max-width: 900px) {
          .ai-modal-card { flex-direction: column; max-height: 90vh; }
          .ai-modal-preview { flex: none; min-height: 200px; }
          .ai-modal-info { flex: 1; min-height: 0; }
        }
      `}</style>

      <div className="ai-modal-overlay" onClick={handleClose}>
        <div className="ai-modal-card" onClick={(e) => e.stopPropagation()}>
          {/* 关闭按钮 */}
          <button className="ai-modal-close-x" onClick={handleClose} title="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* 左侧预览区 */}
          <div className="ai-modal-preview">
            <div className="ai-modal-preview-img-wrap">
              {/* 模糊占位 */}
              <img
                src={picture.thumbnailUrl || picture.url}
                alt=""
                className={`ai-modal-preview-blur${imageLoaded ? ' hidden' : ''}`}
              />
              {/* 清晰图片 */}
              <img
                src={picture.url}
                alt={picture.name || '原图'}
                className={`ai-modal-preview-img${imageLoaded ? ' loaded' : ''}`}
              />
            </div>

            {/* 悬浮操作图标 */}
            {step === 'config' && (
              <div className="ai-modal-preview-actions">
                <button className="ai-modal-action-pill" title="下载" onClick={() => {
                  window.open(picture.url, '_blank')
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <button className="ai-modal-action-pill" title="收藏">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
                <button className="ai-modal-action-pill" title="分享" onClick={() => {
                  navigator.clipboard?.writeText(window.location.href)
                  showToast('链接已复制')
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* 右侧信息面板 */}
          <div className="ai-modal-info">
            {/* 头部 */}
            <div className="ai-modal-info-header">
              <h3 className="ai-modal-info-title">{picture.name || picture.title || '未命名图片'}</h3>
              {picture.introduction && <p className="ai-modal-info-subtitle">{picture.introduction}</p>}
            </div>

            {/* 内容滚动区 */}
            <div className="ai-modal-info-content">
              {step === 'config' ? (
                <>
                  {/* 技术规格 2x2 Grid */}
                  <div className="ai-tech-grid">
                    <div className="ai-tech-item">
                      <div className="ai-tech-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                        分辨率
                      </div>
                      <div className="ai-tech-value">
                        {picture.picWidth && picture.picHeight ? `${picture.picWidth} × ${picture.picHeight}` : '—'}
                      </div>
                    </div>
                    <div className="ai-tech-item">
                      <div className="ai-tech-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        大小
                      </div>
                      <div className="ai-tech-value">
                        {picture.picSize ? `${(picture.picSize / 1024).toFixed(1)} KB` : '—'}
                      </div>
                    </div>
                    <div className="ai-tech-item">
                      <div className="ai-tech-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        格式
                      </div>
                      <div className="ai-tech-value">
                        {picture.picFormat && <span className="ai-tech-tag">{picture.picFormat.toUpperCase()}</span> || '—'}
                      </div>
                    </div>
                    <div className="ai-tech-item">
                      <div className="ai-tech-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                        主色
                      </div>
                      <div className="ai-tech-value">
                        {picture.dominantColor ? (
                          <span className="ai-color-dot">
                            <span className="ai-color-indicator" style={{ backgroundColor: picture.dominantColor }} />
                            {picture.dominantColor}
                          </span>
                        ) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* 色彩分析 */}
                  {picture.dominantColor && (
                    <div className="ai-color-section">
                      <div className="ai-color-section-label">主色调</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          backgroundColor: picture.dominantColor, border: '2px solid white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#262626', fontFamily: 'monospace' }}>
                          {picture.dominantColor}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 业务属性 */}
                  <div className="ai-meta-section">
                    <div style={{ marginBottom: '12px' }}>
                      <div className="ai-meta-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        分类
                      </div>
                      <span className="ai-category-pill">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        {picture.category || '未分类'}
                      </span>
                    </div>
                    {picture.tags && picture.tags.length > 0 && (
                      <div>
                        <div className="ai-meta-label">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                          标签
                        </div>
                        <div className="ai-tag-cloud">
                          {picture.tags.map((tag, i) => (
                            <span key={i} className="ai-pill-tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 上传记录 */}
                  <div className="ai-activity-section">
                    <div className="ai-activity-item">
                      <div className="ai-activity-avatar">
                        {picture.user?.userNickname?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="ai-activity-text">
                          由 <strong>{picture.user?.userNickname || '匿名用户'}</strong> 上传
                        </div>
                        <div className="ai-activity-time">
                          {picture.createTime || ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 扩图比例选择器 */}
                  <div className="ai-ratio-selector">
                    <div className="ai-ratio-selector-label">选择扩图比例</div>
                    <div className="ai-ratio-list">
                      {RATIO_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          className={`ai-ratio-chip${selectedRatio.value === option.value ? ' selected' : ''}`}
                          onClick={() => setSelectedRatio(option)}
                        >
                          <span>{option.label}</span>
                          <div className="ai-ratio-chip-desc">{option.xScale}x × {option.yScale}x</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 高级选项 */}
                  <button className="ai-advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    {showAdvanced ? '收起高级选项' : '展开高级选项'}
                  </button>

                  {showAdvanced && (
                    <div className="ai-advanced-body">
                      <div className="ai-adv-row">
                        <span className="ai-adv-label">旋转角度</span>
                        <input className="ai-adv-input" type="number" min="0" max="359"
                          value={advancedOptions.angle}
                          onChange={(e) => setAdvancedOptions({ ...advancedOptions, angle: Number(e.target.value) })}
                        />
                      </div>
                      <div className="ai-adv-row">
                        <span className="ai-adv-label">输出比例</span>
                        <select className="ai-adv-select" value={advancedOptions.outputRatio}
                          onChange={(e) => setAdvancedOptions({ ...advancedOptions, outputRatio: e.target.value })}>
                          <option value="">保持原图</option>
                          <option value="1:1">1:1</option>
                          <option value="3:4">3:4</option>
                          <option value="4:3">4:3</option>
                          <option value="9:16">9:16</option>
                          <option value="16:9">16:9</option>
                        </select>
                      </div>
                      <div className="ai-adv-row">
                        <span className="ai-adv-label">最佳质量</span>
                        <label className="ai-adv-switch">
                          <input type="checkbox" checked={advancedOptions.bestQuality}
                            onChange={(e) => setAdvancedOptions({ ...advancedOptions, bestQuality: e.target.checked })}
                          />
                          <span className="ai-adv-slider"></span>
                        </label>
                      </div>
                      <div className="ai-adv-row">
                        <span className="ai-adv-label">限制大小</span>
                        <label className="ai-adv-switch">
                          <input type="checkbox" checked={advancedOptions.limitImageSize}
                            onChange={(e) => setAdvancedOptions({ ...advancedOptions, limitImageSize: e.target.checked })}
                          />
                          <span className="ai-adv-slider"></span>
                        </label>
                      </div>
                      <div className="ai-adv-row">
                        <span className="ai-adv-label">AI 水印</span>
                        <label className="ai-adv-switch">
                          <input type="checkbox" checked={advancedOptions.addWatermark}
                            onChange={(e) => setAdvancedOptions({ ...advancedOptions, addWatermark: e.target.checked })}
                          />
                          <span className="ai-adv-slider"></span>
                        </label>
                      </div>
                    </div>
                  )}
                </>
              ) : step === 'processing' ? (
                <div className="ai-status-center">
                  {taskResult?.taskStatus !== 'SUCCEEDED' ? (
                    <div className="ai-spinner" />
                  ) : (
                    <div className="ai-success-check">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                  <div className="ai-status-text">
                    {taskResult ? getStatusText(taskResult.taskStatus) : '创建任务中...'}
                  </div>
                  <div className="ai-status-sub">
                    {taskResult?.taskStatus === 'SUCCEEDED' ? '准备展示结果' : '这可能需要几分钟时间'}
                  </div>
                </div>
              ) : (
                /* 结果步骤 */
                <>
                  <div className="ai-result-cards">
                    <div className="ai-result-card-mini">
                      <div className="ai-result-card-mini-title">原图</div>
                      <img src={picture.url} alt="原图" />
                    </div>
                    <div className="ai-result-card-mini">
                      <div className="ai-result-card-mini-title">扩图结果</div>
                      <img src={taskResult?.outputImageUrl || ''} alt="扩图结果" />
                    </div>
                  </div>
                  <div className="ai-result-btns">
                    <button className="ai-btn-sm ai-btn-sm--secondary" onClick={handleClose}>关闭</button>
                    <button className="ai-btn-sm ai-btn-sm--secondary" onClick={handleDownload}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      下载
                    </button>
                    <button className="ai-btn-sm ai-btn-sm--primary" onClick={handleSaveToLibrary}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      保存
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 吸底主按钮 */}
            {step === 'config' && (
              <div className="ai-modal-footer">
                <button className="ai-primary-btn" onClick={handleCreateTask}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  开始扩图
                  <span className="ai-badge">AI</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
