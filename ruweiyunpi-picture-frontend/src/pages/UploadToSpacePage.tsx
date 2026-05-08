import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { pictureApi } from '../api/picture'
import { useAuth } from '../context/AuthContext'

interface UploadToSpacePageProps {
  defaultSpaceId?: string
  lockSpaceId?: boolean
}

export function UploadToSpacePage({ defaultSpaceId, lockSpaceId }: UploadToSpacePageProps) {
  return <UploadToSpaceForm defaultSpaceId={defaultSpaceId} lockSpaceId={lockSpaceId} />
}

function UploadToSpaceForm({ defaultSpaceId, lockSpaceId }: UploadToSpacePageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { currentUser } = useAuth()
  
  console.log('[UploadToSpace] 组件初始化:', {
    defaultSpaceId,
    lockSpaceId,
    currentUser: currentUser?.id
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [picName, setPicName] = useState('')
  
  // 空间关联选项
  const [linkToSpace, setLinkToSpace] = useState(!!defaultSpaceId)
  const [spaceId, setSpaceId] = useState(defaultSpaceId || '')
  
  // UI 状态
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // 从 URL 参数中获取 spaceId（如果存在）
  useEffect(() => {
    const urlSpaceId = searchParams.get('spaceId')
    console.log('[UploadToSpace] URL 参数检查:', {
      urlSpaceId,
      defaultSpaceId,
      lockSpaceId
    })
    if (urlSpaceId && !defaultSpaceId) {
      console.log('[UploadToSpace] 从 URL 设置 spaceId:', urlSpaceId)
      setSpaceId(urlSpaceId)
      setLinkToSpace(true)
    }
  }, [searchParams, defaultSpaceId, lockSpaceId])

  // 预览图生成
  useEffect(() => {
    if (!uploadFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(uploadFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [uploadFile])

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const pickFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
      if (file) {
        showToast('error', '请选择图片文件（如 JPG、PNG、WebP）')
      }
      return
    }
    setUploadFile(file)
    setToast(null)
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      showToast('info', '请先选择或拖入一张图片')
      return
    }
    
    setBusy(true)
    setToast(null)
    try {
      const uploadParams: {
        file: File
        picName?: string
        spaceId?: string
      } = {
        file: uploadFile,
        picName: picName || undefined
      }
      
      // 如果关联到空间，添加 spaceId 参数
      if (linkToSpace && spaceId) {
        uploadParams.spaceId = spaceId
        console.log('[上传] ✅ 关联到空间，spaceId:', spaceId)
        console.log('[上传] linkToSpace:', linkToSpace, 'spaceId:', spaceId)
      } else {
        console.log('[上传] ❌ 未关联空间')
        console.log('[上传] linkToSpace:', linkToSpace, 'spaceId:', spaceId, 'defaultSpaceId:', defaultSpaceId)
      }
      
      console.log('[上传] 最终上传参数:', uploadParams)
      
      await pictureApi.upload(uploadParams)
      showToast('success', '上传成功！图片已保存至云端')
      
      // 重置表单
      setUploadFile(null)
      setPicName('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // 延迟跳转到图片管理页面
      setTimeout(() => {
        navigate('/pictures/manage')
      }, 1500)
    } catch (e) {
      console.error('上传失败:', e)
      showToast('error', (e as Error).message || '上传失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    pickFile(f ?? null)
  }

  const handleCancel = () => {
    navigate('/pictures/manage')
  }

  return (
    <section className="upload-page">
      {/* Toast 提示 */}
      {toast && (
        <div className={`upload-toast upload-toast--${toast.type}`} role="status">
          {toast.type === 'success' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
          {toast.type === 'error' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
          {toast.type === 'info' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 页面头部 */}
      <header className="upload-hero">
        <p className="upload-eyebrow">图片上传</p>
        <h1 className="upload-title">上传到新空间</h1>
        <p className="upload-lead">
          填写图片信息并上传到对象存储，支持关联到指定空间
        </p>
      </header>

      {/* 上传表单卡片 */}
      <div className="upload-card">
        {/* 左侧：图片上传区域 */}
        <div className="upload-section">
          <h2 className="upload-section-title">
            <span className="upload-section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </span>
            图片文件
          </h2>
          
          <label
            className={`upload-dropzone${dragOver ? ' upload-dropzone--active' : ''}${uploadFile ? ' upload-dropzone--has-file' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="upload-file-input"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {previewUrl ? (
              <div className="upload-preview">
                <img src={previewUrl} alt="" className="upload-preview-img" />
                <button
                  type="button"
                  className="upload-preview-change"
                  onClick={() => fileInputRef.current?.click()}
                >
                  更换图片
                </button>
              </div>
            ) : (
              <div className="upload-dropzone-placeholder">
                <div className="upload-placeholder-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                </div>
                <span className="upload-placeholder-text">将图片文件拖拽到此处，或点击选择</span>
                <span className="upload-placeholder-formats">支持 PNG、JPG、WebP、GIF 格式</span>
              </div>
            )}
          </label>
          
          {uploadFile && (
            <div className="upload-file-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span>{uploadFile.name}</span>
              <span className="upload-file-size">({(uploadFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        {/* 右侧：表单字段 */}
        <div className="upload-section">
          <h2 className="upload-section-title">
            <span className="upload-section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </span>
            图片信息
          </h2>
          
          {/* 图片名称 */}
          <div className="upload-field">
            <label htmlFor="upload-pic-name" className="upload-field-label">
              图片名称
              <span className="upload-field-optional">（可选）</span>
            </label>
            <input
              id="upload-pic-name"
              type="text"
              className="upload-input"
              placeholder="输入图片名称，默认为文件名"
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* 空间关联选项 */}
          <div className="upload-field upload-field--highlight">
            <div className="upload-space-switch">
              <label className="upload-switch">
                <input
                  type="checkbox"
                  checked={linkToSpace}
                  onChange={(e) => setLinkToSpace(e.target.checked)}
                  disabled={lockSpaceId}
                />
                <span className="upload-slider"></span>
              </label>
              <div className="upload-switch-label">
                <span className="upload-switch-text">关联到当前空间</span>
                {spaceId && (
                  <span className="upload-switch-hint">
                    空间 ID: <strong>{spaceId}</strong>
                  </span>
                )}
              </div>
            </div>
            <p className="upload-field-help">
              勾选后图片将关联到指定空间，否则仅作为个人素材库
            </p>
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="upload-actions">
        <button
          type="button"
          className="upload-btn upload-btn--secondary"
          onClick={handleCancel}
          disabled={busy}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          取消并返回
        </button>
        <button
          type="button"
          className="upload-btn upload-btn--primary"
          onClick={handleUpload}
          disabled={busy || !uploadFile}
        >
          {busy ? (
            <>
              <span className="upload-spinner"></span>
              上传中...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              确认上传
            </>
          )}
        </button>
      </div>
    </section>
  )
}

// ========== 上传页面样式 ==========
const styleElement = document.createElement('style')
styleElement.textContent = `
  /* 页面容器 */
  .upload-page {
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 24px 48px;
    min-height: calc(100vh - 80px);
  }

  /* 页面头部 */
  .upload-hero {
    text-align: center;
    margin-bottom: 40px;
  }
  .upload-eyebrow {
    font-size: 0.875rem;
    font-weight: 600;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .upload-title {
    font-size: 2rem;
    font-weight: 800;
    color: #111827;
    margin: 0 0 12px;
    letter-spacing: -0.5px;
  }
  .upload-lead {
    font-size: 1rem;
    color: #6b7280;
    max-width: 540px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* Toast 提示 */
  .upload-toast {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: white;
    padding: 14px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.95rem;
    font-weight: 500;
    z-index: 100000;
    animation: toast-slide 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    border: 1px solid;
  }
  .upload-toast--success {
    color: #059669;
    border-color: #a7f3d0;
    background: #ecfdf5;
  }
  .upload-toast--error {
    color: #dc2626;
    border-color: #fecaca;
    background: #fef2f2;
  }
  .upload-toast--info {
    color: #2563eb;
    border-color: #bfdbfe;
    background: #eff6ff;
  }
  @keyframes toast-slide {
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }

  /* 上传卡片 */
  .upload-card {
    background: white;
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(226, 232, 240, 0.6);
    margin-bottom: 32px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }

  /* 区块标题 */
  .upload-section-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .upload-section-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    color: #3b82f6;
  }

  /* 拖拽上传区域 */
  .upload-dropzone {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 1;
    border: 2px dashed #d1d5db;
    border-radius: 16px;
    background: linear-gradient(135deg, #fafafa 0%, #f9fafb 100%);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }
  .upload-dropzone:hover {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
  }
  .upload-dropzone--active {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
    transform: scale(1.02);
  }
  .upload-dropzone--has-file {
    border-color: #10b981;
    background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  }
  .upload-file-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  /* 占位符 */
  .upload-dropzone-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
  }
  .upload-placeholder-icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }
  .upload-placeholder-text {
    font-size: 0.95rem;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 8px;
  }
  .upload-placeholder-formats {
    font-size: 0.8rem;
    color: #9ca3af;
  }

  /* 预览区域 */
  .upload-preview {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .upload-preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 14px;
  }
  .upload-preview-change {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(8px);
  }
  .upload-preview-change:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: translateX(-50%) scale(1.05);
  }

  /* 文件信息 */
  .upload-file-info {
    margin-top: 16px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 10px;
    border: 1px solid rgba(226, 232, 240, 0.5);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.875rem;
    color: #475569;
  }
  .upload-file-info svg {
    flex-shrink: 0;
    opacity: 0.6;
  }
  .upload-file-size {
    margin-left: auto;
    color: #94a3b8;
    font-size: 0.8rem;
  }

  /* 表单字段 */
  .upload-field {
    margin-bottom: 20px;
  }
  .upload-field-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }
  .upload-field-optional {
    color: #9ca3af;
    font-weight: 400;
  }
  .upload-input,
  .upload-select,
  .upload-textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    font-size: 0.95rem;
    color: #111827;
    background: white;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  .upload-input:focus,
  .upload-select:focus,
  .upload-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .upload-textarea {
    resize: vertical;
    min-height: 80px;
  }

  /* 标签输入 */
  .upload-tags-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .upload-tags-input-wrap {
    display: flex;
    gap: 8px;
  }
  .upload-add-tag-btn {
    padding: 10px 20px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  .upload-add-tag-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  .upload-add-tag-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .upload-tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .upload-tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    color: #1d4ed8;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }
  .upload-tag-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    background: transparent;
    color: #1d4ed8;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s ease;
  }
  .upload-tag-remove:hover {
    background: rgba(29, 78, 216, 0.1);
  }

  /* 空间关联选项 */
  .upload-field--highlight {
    padding: 16px;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border-radius: 12px;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
  .upload-space-switch {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .upload-switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 26px;
    flex-shrink: 0;
  }
  .upload-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .upload-slider {
    position: absolute;
    inset: 0;
    background: #d1d5db;
    border-radius: 26px;
    transition: 0.3s;
    cursor: pointer;
  }
  .upload-slider::before {
    content: "";
    position: absolute;
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background: white;
    border-radius: 50%;
    transition: 0.3s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  .upload-switch input:checked + .upload-slider {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  }
  .upload-switch input:checked + .upload-slider::before {
    transform: translateX(22px);
  }
  .upload-switch input:disabled + .upload-slider {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .upload-switch-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .upload-switch-text {
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
  }
  .upload-switch-hint {
    font-size: 0.8rem;
    color: #6b7280;
  }
  .upload-switch-hint strong {
    color: #059669;
  }
  .upload-field-help {
    font-size: 0.8rem;
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
  }

  /* 底部操作按钮 */
  .upload-actions {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    padding-top: 24px;
    border-top: 1px solid rgba(226, 232, 240, 0.6);
  }
  .upload-btn {
    padding: 12px 28px;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 8px;
    border: none;
  }
  .upload-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .upload-btn--secondary {
    background: white;
    color: #475569;
    border: 1px solid #d1d5db;
  }
  .upload-btn--secondary:hover:not(:disabled) {
    border-color: #9ca3af;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  }
  .upload-btn--primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  }
  .upload-btn--primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(59, 130, 246, 0.4);
  }
  .upload-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: upload-spin 0.8s linear infinite;
  }
  @keyframes upload-spin {
    to { transform: rotate(360deg); }
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .upload-card {
      grid-template-columns: 1fr;
      gap: 32px;
    }
    .upload-actions {
      flex-direction: column-reverse;
    }
    .upload-btn {
      width: 100%;
      justify-content: center;
    }
  }
`
document.head.appendChild(styleElement)
