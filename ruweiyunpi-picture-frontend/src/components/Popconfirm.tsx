import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface PopconfirmProps {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  children: React.ReactNode
}

export function Popconfirm({
  title = '确定要执行此操作吗？',
  description = '此操作不可逆。',
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  children,
}: PopconfirmProps) {
  const [visible, setVisible] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef(false)

  const open = useCallback(() => {
    visibleRef.current = true
    setVisible(true)
  }, [])

  const close = useCallback(() => {
    visibleRef.current = false
    setVisible(false)
  }, [])

  const handleConfirm = useCallback(async () => {
    setConfirmLoading(true)
    try {
      await onConfirm()
      close()
    } catch (error) {
      console.error('操作失败:', error)
    } finally {
      setConfirmLoading(false)
    }
  }, [onConfirm, close])

  useEffect(() => {
    if (!visible) return

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!visibleRef.current) return
      const cardEl = cardRef.current
      if (cardEl && !cardEl.contains(e.target as Node)) {
        close()
      }
    }

    setTimeout(() => {
      document.addEventListener('mousedown', onPointerDown)
      document.addEventListener('touchstart', onPointerDown)
    }, 0)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [visible, close])

  useEffect(() => {
    if (!visible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, close])

  return (
    <>
      <span onMouseDown={(e) => { e.preventDefault(); open() }} style={{ display: 'contents' }}>
        {children}
      </span>
      {visible && createPortal(
        <div className="popconfirm-overlay" onClick={close}>
          <div className="popconfirm-card" ref={cardRef} onClick={(e) => e.stopPropagation()}>
            <div className="popconfirm-header">{title}</div>
            <div className="popconfirm-body">{description}</div>
            <div className="popconfirm-actions">
              <button
                type="button"
                className="popconfirm-btn popconfirm-btn--cancel"
                onClick={close}
                disabled={confirmLoading}
              >
                {cancelText}
              </button>
              <button
                type="button"
                className="popconfirm-btn popconfirm-btn--danger"
                onClick={handleConfirm}
                disabled={confirmLoading}
              >
                {confirmLoading ? '处理中...' : confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
