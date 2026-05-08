import { useEffect, useState, useCallback, useRef } from 'react'
import { usePictureEditWebSocket, type EditNotification } from '../hooks/usePictureEditWebSocket'
import type { PictureVO } from '../types/api'
import { CustomImageCropper } from './CustomImageCropper'

interface PictureEditorProps {
  picture: PictureVO
  spaceId: string
  currentUserId?: string | null
  onClose: () => void
}

interface ToastItem extends EditNotification {
  toastId: number
}

const actionLabel: Record<string, string> = {
  ZOOM_IN: '放大',
  ZOOM_OUT: '缩小',
  ROTATE_LEFT: '左旋',
  ROTATE_RIGHT: '右旋',
}

const toastIcon: Record<string, string> = {
  INFO: '\u2139\uFE0F',
  ENTER_EDIT: '\u270F\uFE0F',
  EXIT_EDIT: '\u{1F6AA}',
  EDIT_ACTION: '\u{1F3A8}',
  ERROR: '\u26A0\uFE0F',
}

const toastColor: Record<string, string> = {
  INFO: '#3b82f6',
  ENTER_EDIT: '#10b981',
  EXIT_EDIT: '#f59e0b',
  EDIT_ACTION: '#8b5cf6',
  ERROR: '#ef4444',
}

type ActionHandler = (action: string) => void

export function PictureEditor({ picture, spaceId, currentUserId, onClose }: PictureEditorProps) {
  const baseWidth = picture.picWidth || 800
  const baseHeight = picture.picHeight || 600

  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null)
  const editorCanvasRef = useRef<HTMLCanvasElement>(null)

  const applyRemoteAction = useCallback<ActionHandler>((action: string) => {
    switch (action) {
      case 'ZOOM_IN':
        setScale((s) => Math.min(s + 0.25, 5))
        break
      case 'ZOOM_OUT':
        setScale((s) => Math.max(s - 0.25, 0.25))
        break
      case 'ROTATE_LEFT':
        setRotation((r) => r - 90)
        break
      case 'ROTATE_RIGHT':
        setRotation((r) => r + 90)
        break
    }
  }, [])

  const applyRemoteActionRef = useRef(applyRemoteAction)
  applyRemoteActionRef.current = applyRemoteAction

  const {
    isConnected,
    isEditing,
    editError,
    notifications,
    currentEditor,
    lockCountdown,
    connect,
    disconnect,
    enterEdit,
    exitEdit,
    sendEditAction,
  } = usePictureEditWebSocket(currentUserId, applyRemoteActionRef)

  const isEditingRef = useRef(isEditing)
  isEditingRef.current = isEditing
  const sendEditActionRef = useRef(sendEditAction)
  sendEditActionRef.current = sendEditAction

  const [pendingEdit, setPendingEdit] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seenRef = useRef(0)
  const toastIdRef = useRef(0)

  const currentWidth = Math.round(baseWidth * scale)
  const currentHeight = Math.round(baseHeight * scale)

  useEffect(() => {
    const newCount = notifications.length
    if (newCount <= seenRef.current) return
    const fresh = notifications.slice(seenRef.current)
    seenRef.current = newCount

    const incoming: ToastItem[] = fresh
      .filter((n) => !n.isSelf)
      .map((n) => ({
        ...n,
        toastId: ++toastIdRef.current,
      }))
    setToasts((prev) => [...prev, ...incoming])

    incoming.forEach((t) => {
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.toastId !== t.toastId))
      }, 4000)
    })
  }, [notifications])

  useEffect(() => {
    connect(picture.id)
    return () => {
      if (isEditingRef.current) {
        exitEdit()
      }
      disconnect()
    }
  }, [picture.id])

  useEffect(() => {
    if (pendingEdit && isConnected) {
      setPendingEdit(false)
      enterEdit()
    }
  }, [pendingEdit, isConnected, enterEdit])

  const onEnterEdit = useCallback(() => {
    if (!isConnected) {
      setPendingEdit(true)
      return
    }
    enterEdit()
  }, [isConnected, enterEdit])

  const onZoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 5))
    if (isEditingRef.current) sendEditActionRef.current('ZOOM_IN')
  }, [])

  const onZoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.25))
    if (isEditingRef.current) sendEditActionRef.current('ZOOM_OUT')
  }, [])

  const onRotateLeft = useCallback(() => {
    setRotation((r) => r - 90)
    if (isEditingRef.current) sendEditActionRef.current('ROTATE_LEFT')
  }, [])

  const onRotateRight = useCallback(() => {
    setRotation((r) => r + 90)
    if (isEditingRef.current) sendEditActionRef.current('ROTATE_RIGHT')
  }, [])

  const onReset = useCallback(() => {
    setScale(1)
    setRotation(0)
  }, [])

  const openCropper = useCallback(async () => {
    try {
      const response = await fetch(picture.url)
      if (!response.ok) throw new Error('图片加载失败')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const normalizedRotation = ((rotation % 360) + 360) % 360
        const is90or270 = normalizedRotation === 90 || normalizedRotation === 270
        const srcWidth = Math.round(baseWidth * scale)
        const srcHeight = Math.round(baseHeight * scale)

        const cav = editorCanvasRef.current!
        cav.width = is90or270 ? srcHeight : srcWidth
        cav.height = is90or270 ? srcWidth : srcHeight

        const ctx = cav.getContext('2d')!
        ctx.translate(cav.width / 2, cav.height / 2)
        if (normalizedRotation !== 0) {
          ctx.rotate((normalizedRotation * Math.PI) / 180)
        }
        ctx.drawImage(img, -srcWidth / 2, -srcHeight / 2, srcWidth, srcHeight)

        setCropperImageUrl(cav.toDataURL('image/jpeg', 0.95))
        setCropperOpen(true)
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        setCropperImageUrl(picture.url)
        setCropperOpen(true)
      }
      img.src = objectUrl
    } catch {
      setCropperImageUrl(picture.url)
      setCropperOpen(true)
    }
  }, [picture.url, baseWidth, baseHeight, scale, rotation])

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(picture.url)
      if (!response.ok) throw new Error('图片加载失败')
      const imgBlob = await response.blob()
      const objectUrl = URL.createObjectURL(imgBlob)

      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const normalizedRotation = ((rotation % 360) + 360) % 360
        const is90or270 = normalizedRotation === 90 || normalizedRotation === 270

        const srcWidth = Math.round(baseWidth * scale)
        const srcHeight = Math.round(baseHeight * scale)

        const canvas = document.createElement('canvas')
        canvas.width = is90or270 ? srcHeight : srcWidth
        canvas.height = is90or270 ? srcWidth : srcHeight

        const ctx = canvas.getContext('2d')!
        ctx.translate(canvas.width / 2, canvas.height / 2)

        if (normalizedRotation !== 0) {
          ctx.rotate((normalizedRotation * Math.PI) / 180)
        }

        ctx.drawImage(img, -srcWidth / 2, -srcHeight / 2, srcWidth, srcHeight)

        canvas.toBlob((exportBlob) => {
          if (!exportBlob) {
            alert('下载失败：无法导出图片')
            return
          }
          const downloadUrl = URL.createObjectURL(exportBlob)
          const link = document.createElement('a')
          link.href = downloadUrl
          const baseName = (picture.name || `picture_${picture.id}`).replace(/\.[^.]+$/, '')
          link.download = `${baseName}_edited.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(downloadUrl)
        }, 'image/png')
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        alert('下载失败：图片解析错误')
      }
      img.src = objectUrl
    } catch {
      alert('下载失败：\n图片跨域加载失败，请确认 OSS/COS 已配置 CORS 允许当前域名访问')
    }
  }, [picture.url, picture.id, picture.name, baseWidth, baseHeight, scale, rotation])

  const lastMsg = notifications[notifications.length - 1]

  return (
    <div className="picture-editor-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="picture-editor-container">
        <div className="picture-editor-header">
          <div className="picture-editor-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>编辑图片 — {picture.name || '未命名'}</span>
          </div>
          <div className="picture-editor-status">
            {!isConnected && <span className="editor-status editor-status--connecting">连接中...</span>}
            {isConnected && !isEditing && !currentEditor && (
              <span className="editor-status editor-status--ready">协作就绪</span>
            )}
            {isConnected && currentEditor && !isEditing && (
              <span className="editor-status editor-status--locked">
                {currentEditor.name} 正在编辑
              </span>
            )}
            {isEditing && currentEditor && (
              <span className="editor-status editor-status--editing">
                你正在编辑
              </span>
            )}
            {lastMsg && !currentEditor && (
              <span className="editor-status editor-status--info">{lastMsg.message}</span>
            )}
          </div>
          <button className="picture-editor-close" onClick={onClose}>✕</button>
        </div>

        {editError && (
          <div className="picture-editor-error">
            <span className="picture-editor-error-msg">⚠ {editError.message}</span>
            {editError.suggestions.length > 0 && (
              <ul className="picture-editor-error-list">
                {editError.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
            <button onClick={() => { connect(picture.id) }}>重试</button>
          </div>
        )}

        <div className="picture-editor-canvas">
          <canvas ref={editorCanvasRef} style={{ display: 'none' }} />
          <div style={{
              display: 'inline-block',
              transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
              transition: 'transform 0.15s',
            }}
          >
            <img
              src={picture.url}
              alt={picture.name || '图片'}
              className="picture-editor-image"
              width={currentWidth}
              height={currentHeight}
              draggable={false}
            />
          </div>
        </div>

        <div className="picture-editor-resinfo">
          <span>原始分辨率 {baseWidth} × {baseHeight}</span>
          {scale !== 1 && (
            <span className="picture-editor-resinfo-current">
              → {currentWidth} × {currentHeight}
            </span>
          )}
        </div>

        <div className="picture-editor-toolbar">
          <div className="toolbar-group">
            {!isEditing ? (
              <button
                className="toolbar-btn toolbar-btn--primary"
                onClick={onEnterEdit}
                disabled={!!currentEditor}
                title={currentEditor ? `${currentEditor.name} 正在编辑中` : '进入编辑模式'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                {currentEditor ? '编辑中（被占用）' : '进入编辑'}
              </button>
            ) : (
              <button
                className="toolbar-btn toolbar-btn--danger"
                onClick={() => { exitEdit() }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                退出编辑
              </button>
            )}
            {isEditing && lockCountdown > 0 && (
              <span className="toolbar-countdown">
                {lockCountdown}s
              </span>
            )}
          </div>

          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={onZoomIn} disabled={!isEditing} title={isEditing ? '放大' : '进入编辑后可用'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button className="toolbar-btn" onClick={onZoomOut} disabled={!isEditing} title={isEditing ? '缩小' : '进入编辑后可用'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <span className="toolbar-label">{Math.round(scale * 100)}%</span>
          </div>

          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={onRotateLeft} disabled={!isEditing} title={isEditing ? '左旋 90°' : '进入编辑后可用'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
            <button className="toolbar-btn" onClick={onRotateRight} disabled={!isEditing} title={isEditing ? '右旋 90°' : '进入编辑后可用'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/>
              </svg>
            </button>
            <span className="toolbar-label">{rotation}°</span>
          </div>

          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={onReset} disabled={!isEditing} title={isEditing ? '重置' : '进入编辑后可用'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
          </div>

          <div className="toolbar-group">
            <button className="toolbar-btn toolbar-btn--download" onClick={openCropper} title="裁剪图片">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
              </svg>
              裁剪
            </button>
          </div>

          <div className="toolbar-group">
            <button className="toolbar-btn toolbar-btn--download" onClick={handleDownload} title="下载当前参数的图片">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              下载
            </button>
          </div>
        </div>

        <div className="picture-editor-participants">
          {isConnected && <span className="participant-dot participant-dot--online"/>}
          <span>协作空间已连接</span>
        </div>
      </div>

      <div className="picture-editor-toast-area">
        {toasts.map((t) => {
          let displayMsg = t.message
          if (t.editAction && actionLabel[t.editAction]) {
            displayMsg = t.message.replace(t.editAction, actionLabel[t.editAction])
          }
          return (
            <div
              key={t.toastId}
              className="picture-editor-toast"
              style={{ borderLeftColor: toastColor[t.type] || '#3b82f6' }}
            >
              <span className="picture-editor-toast-icon">{toastIcon[t.type] || '\u2139\uFE0F'}</span>
              <span className="picture-editor-toast-msg">{displayMsg}</span>
            </div>
          )
        })}
      </div>

      {cropperOpen && cropperImageUrl && (
        <CustomImageCropper
          cosImageUrl={cropperImageUrl}
          onClose={() => { setCropperOpen(false); setCropperImageUrl(null) }}
        />
      )}
    </div>
  )
}
