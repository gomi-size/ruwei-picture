import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pictureApi } from '../api/picture'
import { useAuth } from '../context/AuthContext'
import { AdminOnly } from '../components/AdminOnly'

export function CreatePicturePage() {
  return <CreatePictureForm />
}

function CreatePictureForm() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadUrl, setUploadUrl] = useState('')
  const [picName, setPicName] = useState('')
  const [id, setId] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

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

  const onUploadByFile = async () => {
    if (!uploadFile) {
      showToast('info', '请先选择或拖入一张图片')
      return
    }
    
    console.log('=== 本地上传调试信息 ===')
    console.log('uploadFile:', uploadFile.name)
    console.log('picName state:', picName, '(长度:', picName.length, ')')
    console.log('id state:', id)
    const uploadParams = {
      picName: picName || undefined,
      id: id || undefined
    }
    console.log('传递的参数:', uploadParams)
    console.log('picName 是否为空字符串:', picName === '')
    console.log('picName 是否为 undefined:', picName === undefined)
    
    setBusy(true)
    setToast(null)
    try {
      await pictureApi.uploadByFile(uploadFile, {
        picName: picName || undefined,
        id: id || undefined
      })
      showToast('success', '上传成功，素材已保存至云端')
      setUploadFile(null)
      setPicName('')
      setId('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (e) {
      console.error('上传失败:', e)
      showToast('error', (e as Error).message || '上传失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  const onUploadByUrl = async () => {
    const url = uploadUrl.trim()
    if (!url) {
      showToast('info', '请输入以 http(s):// 开头的图片地址')
      return
    }
    setBusy(true)
    setToast(null)
    try {
      await pictureApi.uploadByUrl({
        fileUrl: url,
        id: id || undefined,
        name: picName || undefined
      })
      showToast('success', '链接导入成功')
      setUploadUrl('')
      setPicName('')
      setId('')
    } catch (e) {
      showToast('error', (e as Error).message || '导入失败，请检查链接是否有效')
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

  return (
    <section className="create-page">
      <header className="create-hero">
        <p className="create-eyebrow">素材发布</p>
        <h1 className="create-title">上传图片素材</h1>
        <p className="create-lead">
          支持本地上传与远程链接导入，自动同步至对象存储。上传后可在「图片管理」中完成审核与上架。
        </p>
      </header>

      {toast ? (
        <div className={`create-toast create-toast--${toast.type}`} role="status">
          {toast.text}
        </div>
      ) : null}

      <div className="create-grid">
        <article className="create-panel">
          <div className="create-panel-head">
            <span className="create-panel-icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </span>
            <div>
              <h2 className="create-panel-title">本地上传</h2>
              <p className="create-panel-desc">拖拽文件到虚线区域，或点击选择图片（最大 10MB）</p>
            </div>
          </div>

          <label
            className={`create-dropzone${dragOver ? ' create-dropzone--active' : ''}${uploadFile ? ' create-dropzone--has-file' : ''}`}
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
              className="create-file-input"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {previewUrl ? (
              <div className="create-preview">
                <img src={previewUrl} alt="" />
              </div>
            ) : (
              <div className="create-dropzone-placeholder">
                <span className="create-dropzone-hint">释放以上传，或点击此区域</span>
                <span className="create-dropzone-formats">PNG · JPG · WebP · GIF</span>
              </div>
            )}
          </label>

          {uploadFile ? (
            <div className="create-file-meta">
              <p className="create-file-name">
                已选择：<strong>{uploadFile.name}</strong>
              </p>
              <button
                type="button"
                className="create-change-file"
                onClick={() => fileInputRef.current?.click()}
              >
                更换图片
              </button>
            </div>
          ) : null}

          {/* 图片名称输入框 */}
          <div className="create-field">
            <label htmlFor="local-pic-name" className="create-field-label">
              图片名称（可选）
            </label>
            <input
              id="local-pic-name"
              type="text"
              className="create-input"
              placeholder="输入图片名称，默认为文件名"
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
              autoComplete="off"
            />
          </div>

          <button
            type="button"
            className="create-btn create-btn--primary"
            disabled={busy || !uploadFile}
            onClick={() => void onUploadByFile()}
          >
            {busy ? '上传中…' : '开始上传'}
          </button>
        </article>

        <article className="create-panel create-panel--accent">
          <div className="create-panel-head">
            <span className="create-panel-icon create-panel-icon--accent" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            <div>
              <h2 className="create-panel-title">链接导入</h2>
              <p className="create-panel-desc">粘贴公网可访问的图片地址，系统将拉取并入库</p>
            </div>
          </div>

          <div className="create-field">
            <label htmlFor="create-url-input" className="create-field-label">
              图片 URL
            </label>
            <input
              id="create-url-input"
              type="url"
              className="create-input"
              placeholder="https://cdn.example.com/banner.png"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="create-field">
            <label htmlFor="create-pic-name" className="create-field-label">
              图片名称
            </label>
            <input
              id="create-pic-name"
              type="text"
              className="create-input"
              placeholder="输入图片名称"
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="create-field">
            <label htmlFor="create-id" className="create-field-label">
              图片 ID（用于修改）
            </label>
            <input
              id="create-id"
              type="number"
              className="create-input"
              placeholder="输入图片 ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoComplete="off"
            />
          </div>

          <button
            type="button"
            className="create-btn create-btn--secondary"
            disabled={busy || !uploadUrl.trim()}
            onClick={() => void onUploadByUrl()}
          >
            {busy ? '处理中…' : '从链接导入'}
          </button>
        </article>
      </div>

      <ul className="create-features">
        <li>
          <span className="create-feature-dot" />
          企业级对象存储，访问稳定、加载更快
        </li>
        <li>
          <span className="create-feature-dot" />
          支持覆盖更新与审核流，便于内容治理
        </li>
        <li>
          <span className="create-feature-dot" />
          与公开素材库无缝联动，上架即可检索
        </li>
      </ul>

      <footer className="create-footer">
        <AdminOnly>
          <button type="button" className="create-footer-link" onClick={() => navigate('/pictures/batch-upload')}>
            批量上传 →
          </button>
        </AdminOnly>
        <button type="button" className="create-footer-cta" onClick={() => navigate('/pictures/manage')}>
          前往图片管理
        </button>
      </footer>
    </section>
  )
}
