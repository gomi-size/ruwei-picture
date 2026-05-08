import { useEffect, useState } from 'react'

export interface DialogButton {
  label: string
  onClick: () => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface ConfirmDialogProps {
  title: string
  message: string
  buttons: DialogButton[]
  visible: boolean
  onClose: () => void
}

export function ConfirmDialog({ title, message, buttons, visible, onClose }: ConfirmDialogProps) {
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => {
        setAnimating(true)
      })
    } else {
      setAnimating(false)
    }
  }, [visible])

  const handleOverlayClick = () => {
    onClose()
  }

  const handleButtonClick = async (button: DialogButton) => {
    try {
      await button.onClick()
    } finally {
      // 只有点击按钮时才会关闭
      onClose()
    }
  }

  const getButtonStyle = (variant: DialogButton['variant'] = 'secondary'): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      flex: 1,
      padding: '10px 20px',
      fontSize: '0.95rem',
      fontWeight: '600',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)'
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
        }
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca'
        }
      case 'secondary':
      default:
        return {
          ...baseStyle,
          backgroundColor: '#ffffff',
          color: '#374151',
          border: '1px solid #e5e7eb'
        }
    }
  }

  if (!visible && !animating) {
    return null
  }

  return (
    <div
      className="confirm-dialog-overlay"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: visible ? 'rgba(15, 23, 42, 0.45)' : 'rgba(15, 23, 42, 0)',
        transition: 'background 0.2s ease',
        pointerEvents: visible ? 'auto' : 'none'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="confirm-dialog-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(15, 23, 42, 0.15)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.2s ease, opacity 0.2s ease'
        }}
      >
        <div style={{ padding: '24px 24px 16px' }}>
          <h3
            id="confirm-dialog-title"
            style={{
              margin: '0 0 12px 0',
              fontSize: '1.15rem',
              fontWeight: '700',
              color: '#111827',
              lineHeight: 1.3
            }}
          >
            {title}
          </h3>
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            color: '#6b7280',
            lineHeight: 1.6
          }}>
            {message}
          </p>
        </div>

        <div style={{
          padding: '16px 24px 24px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          {buttons.map((button, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleButtonClick(button)}
              style={getButtonStyle(button.variant)}
              onMouseEnter={(e) => {
                const target = e.currentTarget
                if (button.variant === 'primary') {
                  target.style.filter = 'brightness(1.05)'
                  target.style.transform = 'translateY(-1px)'
                  target.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)'
                } else if (button.variant === 'danger') {
                  target.style.backgroundColor = '#fee2e2'
                  target.style.borderColor = '#fca5a5'
                } else {
                  target.style.backgroundColor = '#f8fafc'
                  target.style.borderColor = '#93c5fd'
                }
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget
                if (button.variant === 'primary') {
                  target.style.filter = 'brightness(1)'
                  target.style.transform = 'translateY(0)'
                  target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'
                } else if (button.variant === 'danger') {
                  target.style.backgroundColor = '#fef2f2'
                  target.style.borderColor = '#fecaca'
                } else {
                  target.style.backgroundColor = '#ffffff'
                  target.style.borderColor = '#e5e7eb'
                }
              }}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
