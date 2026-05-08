import { useState, useEffect, useCallback } from 'react'
import { pictureApi } from '../api/picture'
import { useImageTaskPolling, type OutPaintingTaskResult } from '../hooks/useImageTaskPolling'
import type { PictureVO } from '../types/api'

interface OutPaintingDrawerProps {
  open: boolean
  onClose: () => void
  picture: PictureVO
}

interface ImageDimensions {
  width: number
  height: number
}

interface RatioOption {
  label: string
  value: string
  xScale: number
  yScale: number
  icon: 'all' | 'horizontal' | 'vertical'
  desc: string
}

const RATIO_OPTIONS: RatioOption[] = [
  { label: '1.2 倍', value: '1.2', xScale: 1.2, yScale: 1.2, icon: 'all', desc: '轻微扩展，保留原始构图' },
  { label: '1.5 倍', value: '1.5', xScale: 1.5, yScale: 1.5, icon: 'all', desc: '均衡扩展，适合大多数场景' },
  { label: '2.0 倍', value: '2.0', xScale: 2.0, yScale: 2.0, icon: 'all', desc: '大幅扩展，创造广阔视野' },
  { label: '横向扩展', value: 'horizontal', xScale: 2.0, yScale: 1.0, icon: 'horizontal', desc: '仅左右扩展，适合横幅场景' },
  { label: '纵向扩展', value: 'vertical', xScale: 1.0, yScale: 2.0, icon: 'vertical', desc: '仅上下扩展，适合竖幅场景' },
]

const MIN_SHORT_EDGE = 448
const MAX_LONG_EDGE = 4096

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function OutPaintingDrawer({ open, onClose, picture }: OutPaintingDrawerProps) {
  const [selectedRatio, setSelectedRatio] = useState<RatioOption>(RATIO_OPTIONS[0])
  const [step, setStep] = useState<'config' | 'checking' | 'processing' | 'result'>('config')
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null)
  const [dimensionError, setDimensionError] = useState<string>('')
  const [processMessage, setProcessMessage] = useState<string>('')
  
  const {
    taskId,
    taskResult,
    isLoading,
    error,
    startPolling,
    reset: resetPolling
  } = useImageTaskPolling(2500, 120000)

  const checkImageDimension = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      
      img.onload = () => {
        const width = img.width
        const height = img.height
        const shortEdge = Math.min(width, height)
        const longEdge = Math.max(width, height)
        
        console.log('[AI 扩图] 图片尺寸:', { width, height, shortEdge, longEdge })
        setImageDimensions({ width, height })
        
        if (shortEdge < MIN_SHORT_EDGE) {
          setDimensionError(`图片短边 (${shortEdge}px) 小于最小值 ${MIN_SHORT_EDGE}px，无法扩图`)
          resolve(false)
        } else if (longEdge > MAX_LONG_EDGE) {
          setDimensionError(`图片长边 (${longEdge}px) 超过最大值 ${MAX_LONG_EDGE}px，无法扩图`)
          resolve(false)
        } else {
          setDimensionError('')
          resolve(true)
        }
      }
      
      img.onerror = () => {
        if (picture.thumbnailUrl && picture.thumbnailUrl !== img.src) {
          img.src = picture.thumbnailUrl
        } else {
          setDimensionError('无法加载图片，请检查图片链接是否有效')
          resolve(false)
        }
      }
      
      img.src = picture.url || picture.thumbnailUrl
    })
  }, [picture.url, picture.thumbnailUrl])

  const reset = useCallback(() => {
    resetPolling()
    setStep('config')
    setSelectedRatio(RATIO_OPTIONS[0])
    setImageDimensions(null)
    setDimensionError('')
    setProcessMessage('')
  }, [resetPolling])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  useEffect(() => {
    if (taskResult?.taskStatus === 'PENDING') {
      setProcessMessage('AI 正在分析图像特征...')
    } else if (taskResult?.taskStatus === 'RUNNING') {
      setProcessMessage('正在生成边缘纹理和细节...')
    } else if (taskResult?.taskStatus === 'SUCCEEDED') {
      setProcessMessage('扩图完成！')
    }
  }, [taskResult?.taskStatus])

  useEffect(() => {
    if (taskResult?.taskStatus === 'SUCCEEDED' && taskResult.outputImageUrl) {
      const timer = setTimeout(() => setStep('result'), 800)
      return () => clearTimeout(timer)
    }
  }, [taskResult])

  const handleStartOutPainting = async () => {
    setStep('checking')
    setDimensionError('')
    
    try {
      console.log('[AI 扩图] 开始检查图片尺寸')
      const isValid = await checkImageDimension()
      
      if (!isValid) {
        console.error('[AI 扩图] 图片尺寸校验失败:', dimensionError)
        setStep('config')
        return
      }
      
      console.log('[AI 扩图] 图片尺寸校验通过:', imageDimensions)
      
      setStep('processing')
      console.log('[AI 扩图] 开始创建任务')
      
      const result = await pictureApi.createOutPaintingTask({
        pictureId: picture.id,
        parameters: {
          xScale: selectedRatio.xScale,
          yScale: selectedRatio.yScale,
          bestQuality: true,
          limitImageSize: true,
        }
      })
      
      console.log('[AI 扩图] 创建任务响应:', result)
      
      if (result.output && result.output.taskId) {
        startPolling(result.output.taskId)
      } else {
        console.error('[AI 扩图] 创建任务失败，没有返回 taskId')
        alert('创建任务失败，请稍后重试')
        setStep('config')
      }
    } catch (err) {
      console.error('[AI 扩图] 创建任务失败:', err)
      alert('创建任务失败：' + (err as Error).message)
      setStep('config')
    }
  }

  const handleDownload = async () => {
    if (!taskResult?.outputImageUrl) return
    
    try {
      const response = await fetch(taskResult.outputImageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `AI_扩图_${picture.name || picture.id}.jpg`
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

  const handleSaveToLibrary = async () => {
    if (!taskResult?.outputImageUrl) {
      alert('没有可保存的图片')
      return
    }
    
    try {
      showToast('保存成功！图片已添加到您的库中')
      handleClose()
    } catch (err) {
      console.error('保存失败:', err)
      alert('保存失败：' + (err as Error).message)
    }
  }

  const showToast = (message: string) => {
    const toast = document.createElement('div')
    toast.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: #10b981; color: white; padding: 12px 24px; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16,185,129,0.3); z-index: 100000;
      font-size: 0.95rem; font-weight: 500; animation: toast-in 0.3s ease;
    `
    toast.textContent = message
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }

  const getStatusText = (status: string): string => {
    const map: Record<string, string> = {
      PENDING: '排队中...', RUNNING: 'AI 正在努力扩图中...',
      SUSPENDED: '任务已挂起', SUCCEEDED: '扩图完成！',
      FAILED: '扩图失败', UNKNOWN: '状态未知'
    }
    return map[status] || '处理中...'
  }

  const getStatusColor = (status: string): string => {
    const map: Record<string, string> = {
      PENDING: '#f59e0b', RUNNING: '#3b82f6', SUSPENDED: '#6b7280',
      SUCCEEDED: '#10b981', FAILED: '#ef4444', UNKNOWN: '#6b7280'
    }
    return map[status] || '#6b7280'
  }

  if (!open) return null

  const stepIcons = {
    config: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    checking: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    processing: 'M13 10V3L4 14h7v7l9-11h-7z',
    result: 'M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  }

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes drawer-enter {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes rotate-ring {
          from { transform: rotate(-90deg); }
          to { transform: rotate(270deg); }
        }
        @keyframes scan-line {
          0%,100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) translateY(-100%); }
          100% { transform: translateX(100%) translateY(100%); }
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }

        .drawer-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px); z-index: 99998;
          display: flex; align-items: center; justify-content: center;
        }
        .drawer {
          width: 680px; max-width: 92vw; max-height: 92vh;
          background: #fff; border-radius: 20px; overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 25px 60px rgba(0,0,0,0.25);
          animation: drawer-enter 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        .drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 32px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
        .drawer-title {
          margin: 0; font-size: 1.2rem; font-weight: 700; color: #f1f5f9;
          display: flex; align-items: center; gap: 10px;
        }
        .drawer-title-icon {
          color: #60a5fa;
        }
        .drawer-close {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08);
          color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .drawer-close:hover {
          background: rgba(239,68,68,0.25); color: #f87171; border-color: rgba(239,68,68,0.3);
        }

        /* Step indicator */
        .step-indicator {
          display: flex; align-items: center; justify-content: center;
          padding: 20px 32px 0; gap: 0;
        }
        .step-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 20px;
          font-size: 0.8rem; font-weight: 500;
          color: #94a3b8; transition: all 0.3s;
        }
        .step-item.active {
          color: #3b82f6; background: rgba(59,130,246,0.06);
        }
        .step-item.done {
          color: #10b981;
        }
        .step-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: currentColor;
          transition: all 0.3s;
        }
        .step-line {
          flex: 1; height: 1px; max-width: 40px;
          background: #e2e8f0;
        }

        .drawer-content {
          flex: 1; overflow-y: auto; padding: 20px 32px 28px;
        }
        .drawer-content::-webkit-scrollbar { width: 5px; }
        .drawer-content::-webkit-scrollbar-track { background: transparent; }
        .drawer-content::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.3); border-radius: 3px;
        }

        /* Config layout */
        .config-layout {
          display: flex; flex-direction: column; gap: 24px;
        }

        /* Preview card */
        .preview-card {
          position: relative; border-radius: 14px; overflow: hidden;
          border: 1px solid #e2e8f0; background: #f8fafc;
          max-height: 220px;
        }
        .preview-card img {
          width: 100%; height: auto; max-height: 220px;
          object-fit: contain; display: block;
        }
        .preview-scan-line {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.7), transparent);
          animation: scan-line 3s ease-in-out infinite;
          pointer-events: none; z-index: 2;
        }

        /* Picture meta card */
        .meta-card {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px;
          padding: 16px 20px; background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 12px; border: 1px solid #e2e8f0;
          font-size: 0.8rem;
        }
        .meta-item { display: flex; flex-direction: column; gap: 2px; }
        .meta-label { color: #94a3b8; font-size: 0.7rem; }
        .meta-value { color: #1e293b; font-weight: 600; font-size: 0.82rem; }
        .meta-category {
          display: inline-block; padding: 1px 8px;
          background: rgba(59,130,246,0.1); color: #3b82f6;
          border-radius: 4px; font-size: 0.72rem; font-weight: 600;
          width: fit-content;
        }

        /* Section header */
        .section-label {
          font-size: 0.82rem; font-weight: 600; color: #475569;
          margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
        }
        .section-badge {
          font-size: 0.65rem; padding: 2px 6px;
          background: rgba(59,130,246,0.1); color: #3b82f6;
          border-radius: 4px; font-weight: 600;
        }

        /* Ratio cards */
        .ratio-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
        }
        .ratio-card {
          padding: 16px 12px; border: 2px solid #e2e8f0; border-radius: 12px;
          cursor: pointer; text-align: center;
          transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
          background: #fff; position: relative;
        }
        .ratio-card:hover {
          border-color: #93c5fd; transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59,130,246,0.08);
        }
        .ratio-card.selected {
          border-color: #3b82f6;
          background: linear-gradient(135deg, rgba(59,130,246,0.04), rgba(139,92,246,0.04));
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .ratio-card.selected::after {
          content: '✓'; position: absolute; top: 8px; right: 10px;
          width: 22px; height: 22px; border-radius: 50%;
          background: #3b82f6; color: #fff; font-size: 0.7rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .ratio-icon-area {
          width: 44px; height: 44px; margin: 0 auto 10px;
          border: 2px solid #cbd5e1; border-radius: 6px;
          position: relative; transition: all 0.25s;
          display: flex; align-items: center; justify-content: center;
        }
        .ratio-card.selected .ratio-icon-area {
          border-color: #3b82f6; background: rgba(59,130,246,0.06);
        }
        .ratio-icon-svg { color: #94a3b8; transition: color 0.25s; }
        .ratio-card.selected .ratio-icon-svg { color: #3b82f6; }
        .ratio-name {
          font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 2px;
        }
        .ratio-sub {
          font-size: 0.7rem; color: #94a3b8;
        }

        /* Processing */
        .processing-area {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 360px; gap: 28px;
        }
        .processing-ring {
          width: 160px; height: 160px; position: relative;
        }
        .processing-ring svg { width: 100%; height: 100%; }
        .ring-bg { fill: none; stroke: #e2e8f0; stroke-width: 6; }
        .ring-fg {
          fill: none; stroke: url(#ring-grad); stroke-width: 6;
          stroke-linecap: round; stroke-dasharray: 440; stroke-dashoffset: 0;
          animation: rotate-ring 2s linear infinite;
          transform-origin: 50% 50%;
        }
        .processing-msg { text-align: center; }
        .processing-msg h4 {
          margin: 0 0 8px; font-size: 1.15rem; color: #1e293b; font-weight: 700;
        }
        .processing-msg p {
          margin: 0; font-size: 0.85rem; color: #64748b;
        }
        .status-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 18px; background: rgba(248,250,252,0.9);
          border-radius: 20px; border: 1px solid #e2e8f0; margin-top: 16px;
        }
        .status-chip-dot {
          width: 8px; height: 8px; border-radius: 50%;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }

        /* Result */
        .result-area { display: flex; flex-direction: column; gap: 20px; }
        .result-header { text-align: center; }
        .result-header h4 {
          margin: 0 0 4px; font-size: 1.1rem; color: #1e293b; font-weight: 700;
        }
        .result-header .success-icon {
          width: 48px; height: 48px; margin: 0 auto 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(16,185,129,0.3);
        }
        .comparison-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
        }
        .comparison-card {
          border-radius: 12px; overflow: hidden;
          border: 1px solid #e2e8f0; background: #fff;
          transition: all 0.3s;
        }
        .comparison-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px);
        }
        .comparison-label {
          text-align: center; padding: 10px; font-size: 0.75rem;
          font-weight: 600; color: #64748b;
          background: #f8fafc; border-bottom: 1px solid #f1f5f9;
        }
        .comparison-label.result { color: #10b981; }
        .comparison-card img {
          width: 100%; height: 180px; object-fit: contain;
          display: block; background: #fafbfc;
        }

        /* Buttons */
        .action-row {
          display: flex; gap: 12px; padding-top: 20px;
          border-top: 1px solid #f1f5f9;
        }
        .btn {
          flex: 1; padding: 14px 20px; border-radius: 12px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer; border: none;
          transition: all 0.25s; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-secondary {
          background: #f1f5f9; color: #475569;
        }
        .btn-secondary:hover { background: #e2e8f0; }
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #fff; box-shadow: 0 4px 14px rgba(59,130,246,0.3);
          position: relative; overflow: hidden;
        }
        .btn-primary::before {
          content: ''; position: absolute; top: -50%; left: -50%;
          width: 200%; height: 200%;
          background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%);
          animation: shimmer 2.5s infinite;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59,130,246,0.4);
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff; box-shadow: 0 4px 14px rgba(16,185,129,0.3);
        }
        .btn-success:hover {
          transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.4);
        }

        .error-msg {
          padding: 16px 20px; background: #fef2f2; border-radius: 12px;
          border: 1px solid #fecaca; color: #dc2626; font-size: 0.85rem;
          text-align: center; margin-top: 16px;
        }
        .dim-error {
          padding: 14px 18px; background: #fef2f2; border-radius: 10px;
          border: 1px solid #fecaca; color: #dc2626; font-size: 0.82rem;
          display: flex; align-items: flex-start; gap: 8px;
        }
      `}</style>

      <div className="drawer-overlay" onClick={handleClose}>
        <div className="drawer" onClick={e => e.stopPropagation()}>
          <div className="drawer-header">
            <h3 className="drawer-title">
              <svg className="drawer-title-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              AI 智能扩图
            </h3>
            <button className="drawer-close" onClick={handleClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="step-indicator">
            <span className={`step-item ${step === 'config' ? 'active' : step !== 'config' ? 'done' : ''}`}>
              <span className="step-dot" /> 配置
            </span>
            <span className="step-line" />
            <span className={`step-item ${step === 'processing' ? 'active' : step === 'result' ? 'done' : ''}`}>
              <span className="step-dot" /> 生成
            </span>
            <span className="step-line" />
            <span className={`step-item ${step === 'result' ? 'active' : ''}`}>
              <span className="step-dot" /> 结果
            </span>
          </div>

          <div className="drawer-content">
            {step === 'config' && (
              <div className="config-layout">
                {/* 原图预览 */}
                <div className="preview-card">
                  <img src={picture.thumbnailUrl || picture.url} alt="原图" />
                  <div className="preview-scan-line" />
                </div>

                {/* 图片信息 */}
                <div className="meta-card">
                  <div className="meta-item">
                    <span className="meta-label">名称</span>
                    <span className="meta-value">{picture.name || '未命名'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">分类</span>
                    {picture.category ? (
                      <span className="meta-category">{picture.category}</span>
                    ) : (
                      <span className="meta-value">—</span>
                    )}
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">尺寸</span>
                    <span className="meta-value">
                      {picture.picWidth && picture.picHeight
                        ? `${picture.picWidth} × ${picture.picHeight}`
                        : imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height}` : '—'}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">大小</span>
                    <span className="meta-value">{picture.picSize ? formatFileSize(picture.picSize) : '—'}</span>
                  </div>
                </div>

                {/* 模型信息 */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '5px 10px', background: 'rgba(59,130,246,0.06)', color: '#3b82f6',
                    borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                    border: '1px solid rgba(59,130,246,0.12)',
                    display: 'inline-flex', alignItems: 'center', gap: '5px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    预计 30-60 秒
                  </span>
                  <span style={{
                    padding: '5px 10px', background: 'rgba(139,92,246,0.06)', color: '#8b5cf6',
                    borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                    border: '1px solid rgba(139,92,246,0.12)',
                    display: 'inline-flex', alignItems: 'center', gap: '5px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    阿里云 DashScope
                  </span>
                </div>

                {/* 尺寸错误 */}
                {dimensionError && (
                  <div className="dim-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {dimensionError}
                  </div>
                )}

                {/* 扩图比例 */}
                <div>
                  <div className="section-label">
                    选择扩图比例
                    <span className="section-badge">必选</span>
                  </div>
                  <div className="ratio-grid">
                    {RATIO_OPTIONS.slice(0, 3).map(opt => (
                      <div
                        key={opt.value}
                        className={`ratio-card${selectedRatio.value === opt.value ? ' selected' : ''}`}
                        onClick={() => setSelectedRatio(opt)}
                      >
                        <div className="ratio-icon-area">
                          <svg className="ratio-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="3"/>
                            <path d="M3 3l6 6M21 21l-6-6"/>
                          </svg>
                        </div>
                        <div className="ratio-name">{opt.label}</div>
                        <div className="ratio-sub">{opt.xScale}x × {opt.yScale}x</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 定向扩展 */}
                <div>
                  <div className="section-label">
                    定向扩展方向
                    <span className="section-badge">可选</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {RATIO_OPTIONS.slice(3, 5).map(opt => (
                      <div
                        key={opt.value}
                        className={`ratio-card${selectedRatio.value === opt.value ? ' selected' : ''}`}
                        onClick={() => setSelectedRatio(opt)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', padding: '14px 16px' }}
                      >
                        <div className="ratio-icon-area" style={{ margin: 0, flexShrink: 0 }}>
                          <svg className="ratio-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            {opt.icon === 'horizontal'
                              ? <><line x1="3" y1="12" x2="21" y2="12"/><polyline points="15 6 21 12 15 18"/><polyline points="9 6 3 12 9 18"/></>
                              : <><line x1="12" y1="3" x2="12" y2="21"/><polyline points="6 9 12 3 18 9"/><polyline points="6 15 12 21 18 15"/></>
                            }
                          </svg>
                        </div>
                        <div>
                          <div className="ratio-name" style={{ fontSize: '0.88rem' }}>{opt.label}</div>
                          <div className="ratio-sub">{opt.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 扩展后尺寸预览 */}
                {imageDimensions && (
                  <div className="meta-card" style={{ textAlign: 'center', justifyContent: 'center' }}>
                    <div className="meta-item" style={{ alignItems: 'center' }}>
                      <span className="meta-label">扩展后预估尺寸</span>
                      <span className="meta-value" style={{ fontSize: '1rem', color: '#3b82f6' }}>
                        {Math.round(imageDimensions.width * selectedRatio.xScale)} × {Math.round(imageDimensions.height * selectedRatio.yScale)} px
                      </span>
                    </div>
                  </div>
                )}

                <div className="action-row">
                  <button className="btn btn-secondary" onClick={handleClose}>取消</button>
                  <button className="btn btn-primary" onClick={handleStartOutPainting}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    开始生成
                  </button>
                </div>
              </div>
            )}

            {(step === 'checking' || step === 'processing') && (
              <div className="processing-area">
                <div className="processing-ring">
                  <svg viewBox="0 0 160 160">
                    <defs>
                      <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <circle className="ring-bg" cx="80" cy="80" r="64" />
                    <circle className="ring-fg" cx="80" cy="80" r="64" />
                  </svg>
                </div>
                <div className="processing-msg">
                  <h4>{step === 'checking' ? '正在检查图片尺寸...' : (processMessage || 'AI 正在努力扩图中...')}</h4>
                  <p>{step === 'checking' ? '确保符合扩图引擎要求' : '预计需要 30-60 秒，请耐心等待'}</p>
                </div>

                {taskResult && (
                  <div className="status-chip">
                    <span className="status-chip-dot" style={{ background: getStatusColor(taskResult.taskStatus), boxShadow: `0 0 6px ${getStatusColor(taskResult.taskStatus)}` }} />
                    <span style={{ color: getStatusColor(taskResult.taskStatus), fontWeight: 600, fontSize: '0.85rem' }}>
                      {getStatusText(taskResult.taskStatus)}
                    </span>
                  </div>
                )}

                {error && <div className="error-msg">⚠ {error}</div>}
              </div>
            )}

            {step === 'result' && taskResult?.taskStatus === 'SUCCEEDED' && taskResult.outputImageUrl && (
              <div className="result-area">
                <div className="result-header">
                  <div className="success-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h4>扩图完成</h4>
                </div>

                <div className="comparison-grid">
                  <div className="comparison-card">
                    <div className="comparison-label">原图</div>
                    <img src={picture.thumbnailUrl || picture.url} alt="原图" />
                  </div>
                  <div className="comparison-card">
                    <div className="comparison-label result">AI 扩图结果</div>
                    <img src={taskResult.outputImageUrl} alt="扩图结果" />
                  </div>
                </div>

                <div className="action-row">
                  <button className="btn btn-secondary" onClick={handleClose}>关闭</button>
                  <button className="btn btn-secondary" onClick={handleDownload}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    下载
                  </button>
                  <button className="btn btn-success" onClick={handleSaveToLibrary}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                    </svg>
                    保存到库
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
