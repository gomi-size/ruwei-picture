import { useState, useRef, useCallback, useEffect, useMemo } from 'react'

interface CustomImageCropperProps {
  cosImageUrl: string
  onClose?: () => void
}

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const MIN_CROP_SIZE = 50

export function CustomImageCropper({ cosImageUrl, onClose }: CustomImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 0, h: 0 })
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 })
  const [message, setMessage] = useState('')
  const [processing, setProcessing] = useState(false)

  const dragging = useRef(false)
  const resizeHandle = useRef<ResizeHandle | null>(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const cropStart = useRef<CropRect>({ x: 0, y: 0, width: 0, height: 0 })

  const imageUrl = useMemo(() => {
    if (cosImageUrl.startsWith('data:')) return cosImageUrl
    const sep = cosImageUrl.includes('?') ? '&' : '?'
    return `${cosImageUrl}${sep}t=${Date.now()}`
  }, [cosImageUrl])

  const clampCrop = useCallback((next: CropRect, displayW: number, displayH: number): CropRect => {
    return {
      x: Math.max(0, Math.min(next.x, displayW - next.width)),
      y: Math.max(0, Math.min(next.y, displayH - next.height)),
      width: next.width,
      height: next.height,
    }
  }, [])

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const displayW = img.width
    const displayH = img.height
    setImgDisplaySize({ w: displayW, h: displayH })
    const defaultSize = Math.min(displayW, displayH, 400) * 0.6
    setCrop({
      x: Math.max(0, (displayW - defaultSize) / 2),
      y: Math.max(0, (displayH - defaultSize) / 2),
      width: Math.round(defaultSize),
      height: Math.round(defaultSize),
    })
    setImgLoaded(true)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    cropStart.current = { ...crop }

    const target = e.target as HTMLElement
    const handle = target.dataset.handle as ResizeHandle | undefined
    resizeHandle.current = handle || null
  }, [crop])

  useEffect(() => {
    if (!imgLoaded) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      const start = cropStart.current
      const handle = resizeHandle.current

      if (handle) {
        setCrop(prev => {
          const w = imgDisplaySize.w
          const h = imgDisplaySize.h
          let next = { ...start }

          if (handle.includes('e')) {
            next.width = Math.max(MIN_CROP_SIZE, Math.min(start.width + dx, w - start.x))
          }
          if (handle.includes('w')) {
            const newWidth = Math.max(MIN_CROP_SIZE, start.width - dx)
            const maxX = start.x + start.width - MIN_CROP_SIZE
            next.x = Math.max(0, Math.min(start.x + dx, maxX))
            next.width = newWidth
          }
          if (handle.includes('s')) {
            next.height = Math.max(MIN_CROP_SIZE, Math.min(start.height + dy, h - start.y))
          }
          if (handle.includes('n')) {
            const newHeight = Math.max(MIN_CROP_SIZE, start.height - dy)
            const maxY = start.y + start.height - MIN_CROP_SIZE
            next.y = Math.max(0, Math.min(start.y + dy, maxY))
            next.height = newHeight
          }

          return { ...prev, ...next }
        })
      } else {
        setCrop(prev =>
          clampCrop(
            {
              x: start.x + dx,
              y: start.y + dy,
              width: start.width,
              height: start.height,
            },
            imgDisplaySize.w,
            imgDisplaySize.h,
          ),
        )
      }
    }
    const handleMouseUp = () => {
      dragging.current = false
      resizeHandle.current = null
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [imgLoaded, clampCrop, imgDisplaySize])

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const img = imgRef.current
    if (!img) return

    setProcessing(true)

    try {
      if (!img.src.startsWith('data:')) {
        fetch(img.src)
          .then(r => r.blob())
          .then(blob => {
            const objUrl = URL.createObjectURL(blob)
            const proxy = new Image()
            proxy.onload = () => { URL.revokeObjectURL(objUrl); doCrop(proxy) }
            proxy.onerror = () => { setMessage('导出失败：图片加载失败'); setProcessing(false) }
            proxy.src = objUrl
          })
          .catch(() => { setMessage('导出失败：图片加载失败'); setProcessing(false) })
        return
      }
      doCrop(img)
    } catch {
      setMessage('导出失败')
      setProcessing(false)
    }

    function doCrop(source: HTMLImageElement) {
      const scaleX = source.naturalWidth / imgDisplaySize.w
      const scaleY = source.naturalHeight / imgDisplaySize.h

      const canvas = canvasRef.current!
      canvas.width = crop.width * scaleX
      canvas.height = crop.height * scaleY

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(
        source,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      canvas.toBlob((blob) => {
        if (!blob) {
          setMessage('导出失败')
          setProcessing(false)
          return
        }
        const timestamp = Date.now()
        const downloadUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `cropped_${timestamp}.jpg`
        link.style.display = 'none'
        document.body.appendChild(link)
        requestAnimationFrame(() => {
          link.click()
          document.body.removeChild(link)
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000)
          setProcessing(false)
          setMessage('下载完成')
        })
      }, 'image/jpeg', 0.92)
    }
  }, [crop, imgDisplaySize])

  return (
    <div className="cc-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <style>{`
        .cc-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: cc-fade 0.2s ease;
        }
        @keyframes cc-fade { from { opacity: 0; } to { opacity: 1; } }
        .cc-modal {
          background: #1f2937;
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          max-width: 94vw;
          max-height: 94vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .cc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid #374151;
        }
        .cc-header h3 { margin: 0; font-size: 1rem; color: #f9fafb; font-weight: 600; }
        .cc-close {
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid #4b5563; background: transparent; cursor: pointer;
          color: #d1d5db; font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .cc-close:hover { background: #374151; color: #fff; }
        .cc-body {
          position: relative;
          display: inline-block;
          line-height: 0;
          user-select: none;
          -webkit-user-select: none;
          flex-shrink: 0;
        }
        .cc-body img { display: block; max-width: 90vw; max-height: 70vh; }
        .cc-crop-box {
          position: absolute;
          border: 2px solid #fff;
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
          cursor: move;
          z-index: 2;
        }
        .cc-crop-label {
          position: absolute;
          bottom: -28px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.78);
          color: #fff;
          font-size: 0.75rem;
          padding: 3px 10px;
          border-radius: 4px;
          white-space: nowrap;
          pointer-events: none;
        }
        .cc-crop-handle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.3);
          border-radius: 2px;
          z-index: 3;
        }
        .cc-crop-handle--nw { top: -5px; left: -5px; cursor: nw-resize; }
        .cc-crop-handle--n  { top: -5px; left: calc(50% - 5px); cursor: n-resize; }
        .cc-crop-handle--ne { top: -5px; right: -5px; cursor: ne-resize; }
        .cc-crop-handle--e  { top: calc(50% - 5px); right: -5px; cursor: e-resize; }
        .cc-crop-handle--se { bottom: -5px; right: -5px; cursor: se-resize; }
        .cc-crop-handle--s  { bottom: -5px; left: calc(50% - 5px); cursor: s-resize; }
        .cc-crop-handle--sw { bottom: -5px; left: -5px; cursor: sw-resize; }
        .cc-crop-handle--w  { top: calc(50% - 5px); left: -5px; cursor: w-resize; }
        .cc-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border-top: 1px solid #374151;
          flex-wrap: wrap;
        }
        .cc-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          border-radius: 9px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }
        .cc-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .cc-btn--primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: #fff;
          box-shadow: 0 2px 8px rgba(59,130,246,0.3);
        }
        .cc-btn--primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(59,130,246,0.45);
        }
        .cc-btn--ghost {
          background: transparent;
          color: #d1d5db;
          border: 1px solid #4b5563;
        }
        .cc-btn--ghost:hover:not(:disabled) {
          background: #374151;
          color: #fff;
        }
        .cc-msg {
          font-size: 0.8rem;
          padding: 6px 12px;
          border-radius: 6px;
          flex: 1; min-width: 140px;
        }
        .cc-msg--ok { background: #064e3b; color: #6ee7b7; border: 1px solid #065f46; }
        .cc-msg--err { background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; }
      `}</style>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="cc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cc-header">
          <h3>裁剪图片（拖拽移动 / 拖拽手柄调整大小）</h3>
          <button className="cc-close" onClick={onClose}>✕</button>
        </div>

        <div className="cc-body">
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            onLoad={handleImageLoad}
            draggable={false}
          />

          {imgLoaded && (
            <>
              <div
                className="cc-crop-box"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.width,
                  height: crop.height,
                }}
                onMouseDown={handleMouseDown}
              >
                <div className="cc-crop-label">
                  {crop.width} × {crop.height}
                </div>
                <div className="cc-crop-handle cc-crop-handle--nw" data-handle="nw" />
                <div className="cc-crop-handle cc-crop-handle--n"  data-handle="n" />
                <div className="cc-crop-handle cc-crop-handle--ne" data-handle="ne" />
                <div className="cc-crop-handle cc-crop-handle--e"  data-handle="e" />
                <div className="cc-crop-handle cc-crop-handle--se" data-handle="se" />
                <div className="cc-crop-handle cc-crop-handle--s"  data-handle="s" />
                <div className="cc-crop-handle cc-crop-handle--sw" data-handle="sw" />
                <div className="cc-crop-handle cc-crop-handle--w"  data-handle="w" />
              </div>
            </>
          )}
        </div>

        <div className="cc-footer">
          <button
            type="button"
            className="cc-btn cc-btn--primary"
            onClick={handleDownload}
            disabled={!imgLoaded || processing}
          >
            {processing ? '处理中…' : '确认并下载'}
          </button>
          <button
            type="button"
            className="cc-btn cc-btn--ghost"
            onClick={onClose}
          >
            取消
          </button>
          {message && (
            <span className={`cc-msg ${message.includes('失败') ? 'cc-msg--err' : 'cc-msg--ok'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
