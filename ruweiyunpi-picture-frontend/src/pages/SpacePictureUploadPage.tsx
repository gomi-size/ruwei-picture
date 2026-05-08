import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { pictureApi } from '../api/picture'
import { spaceApi } from '../api/space'
import { useAuth } from '../context/AuthContext'
import type { PictureVO, SpaceVO } from '../types/api'

export function SpacePictureUploadPage() {
  return (
    <SpacePictureUploadInner />
  )
}

function SpacePictureUploadInner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [space, setSpace] = useState<SpaceVO | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isPublic, setIsPublic] = useState<boolean>(false)
  const [picName, setPicName] = useState<string>('')
  const [pictureId, setPictureId] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  const loadSpace = useCallback(async () => {
    if (!id) {
      console.error('URL 中没有空间 ID')
      showToast('error', '空间 ID 无效')
      return
    }
    
    try {
      const spaceDetail = await spaceApi.getById(id)
      // 验证空间是否存在
      if (!spaceDetail || !spaceDetail.id) {
        showToast('error', '空间不存在或已被删除')
        setSpace(null)
        return
      }
      // 权限检查：后端已通过 permissionList 返回当前用户在该空间的权限
      if (!spaceDetail.permissionList || spaceDetail.permissionList.length === 0) {
        showToast('error', '无权访问此空间')
        setSpace(null)
        return
      }
      setSpace(spaceDetail)
    } catch (error) {
      console.error('加载空间详情失败:', error, 'ID:', id)
      showToast('error', '空间不存在或已被删除')
      setSpace(null)
    }
  }, [id, currentUser])

  useEffect(() => {
    if (currentUser && id) {
      void loadSpace()
    }
  }, [loadSpace, currentUser, id])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    pickFile(file ?? null)
  }

  const pickFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
      if (file) {
        showToast('error', '请选择图片文件（如 JPG、PNG、WebP）')
      }
      return
    }
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    // 自动使用文件名作为图片名称
    const fileName = file.name.substring(0, file.name.lastIndexOf('.'))
    setPicName(fileName)
    setToast(null)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => {
    setDragOver(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    pickFile(file ?? null)
  }

  const onUpload = async () => {
    if (!selectedFile) {
      showToast('error', '请选择要上传的图片')
      return
    }

    if (!space) {
      showToast('error', '空间信息加载失败')
      return
    }

    setUploading(true)
    try {
      await pictureApi.upload({
        file: selectedFile,
        picName: picName,
        spaceId: isPublic ? undefined : space.id
      })
      showToast('success', '图片上传成功！')
      setSelectedFile(null)
      setPreviewUrl('')
      setPictureId('')
      setPicName('')
      // 上传成功后跳转到图片列表页面
      setTimeout(() => {
        navigate(`/spaces/${id}/pictures/view`)
      }, 1000)
    } catch (error) {
      console.error('上传图片失败:', error)
      showToast('error', '上传图片失败：' + (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="card access-card">
        <h2>需要登录</h2>
        <p>请使用右上角登录后访问此页面。</p>
      </div>
    )
  }

  return (
    <section className="space-picture-page">
      {toast && (
        <div className={`toast toast--${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '❌'}
            {toast.type === 'info' && 'ℹ️'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}

      {!space ? (
        <div className="card access-card">
          <h2>空间不存在</h2>
          <p>该空间可能已被删除或您无权访问。</p>
          <button 
            type="button" 
            onClick={() => navigate('/spaces')}
            className="create-btn create-btn--primary"
            style={{ marginTop: '16px' }}
          >
            返回空间列表
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <button 
            type="button" 
            onClick={() => navigate(`/spaces/${id}/pictures/view`)}
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none', 
              color: '#ffffff', 
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              marginBottom: '12px',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'
            }}
          >
            ← 返回图片列表
          </button>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
            上传图片 - {space.spaceName || `空间 #${space.id}`}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
            上传的图片默认关联到此空间，也可设为公共图片
          </p>
        </div>
      )}

      {space && (
        <article className="create-panel">
          <div className="create-panel-head">
            <span className="create-panel-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"></path>
              </svg>
            </span>
            <div>
              <h2 className="create-panel-title">本地上传</h2>
              <p className="create-panel-desc">拖拽文件到虚线区域，或点击选择图片（最大 10MB）</p>
            </div>
          </div>

          <label
            className={`create-dropzone${dragOver ? ' create-dropzone--active' : ''}${selectedFile ? ' create-dropzone--has-file' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept="image/*"
              className="create-file-input"
              onChange={onFileChange}
              disabled={uploading}
            />
            {previewUrl ? (
              <div className="create-preview">
                <img alt="" src={previewUrl} />
              </div>
            ) : (
              <div className="create-dropzone-placeholder">
                <span className="create-dropzone-hint">释放以上传，或点击此区域</span>
                <span className="create-dropzone-formats">PNG · JPG · WebP · GIF</span>
              </div>
            )}
          </label>

          {selectedFile && (
            <div className="create-file-meta">
              <p className="create-file-name">
                已选择：<strong>{selectedFile.name}</strong>
              </p>
              <button 
                type="button" 
                className="create-change-file"
                onClick={() => {
                  setSelectedFile(null)
                  setPreviewUrl('')
                  setPicName('')
                  setPictureId('')
                }}
              >
                更换图片
              </button>
            </div>
          )}

          <div className="create-field" style={{ marginTop: '20px' }}>
            <label className="create-field-label">图片名称 <span style={{ color: '#ef4444' }}>*</span></label>
            <input 
              type="text" 
              className="create-input"
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
              disabled={uploading || !selectedFile}
              placeholder="请先选择图片"
            />
          </div>

          <div className="create-field">
            <label className="create-field-label">空间 ID（只读）</label>
            <input 
              type="text" 
              className="create-input"
              value={space.id}
              disabled
              style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
              上传的图片将关联到此空间，除非勾选下方的"设为公共图片"选项
            </p>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginTop: '16px',
            marginBottom: '4px'
          }}>
            <input 
              type="checkbox"
              id="space-check"
              checked={!isPublic}
              onChange={(e) => setIsPublic(!e.target.checked)}
              disabled={uploading}
              style={{
                width: '16px',
                height: '16px',
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}
            />
            <label 
              htmlFor="space-check"
              style={{ 
                fontSize: '0.9rem',
                color: uploading ? '#9ca3af' : '#374151',
                cursor: uploading ? 'not-allowed' : 'pointer',
                margin: 0
              }}
            >
              关联到当前空间
            </label>
          </div>
          <p style={{ 
            fontSize: '0.8rem', 
            color: '#6b7280', 
            marginTop: '4px',
            marginLeft: '24px'
          }}>
            {!isPublic ? '图片将关联到当前空间' : '图片将作为公共资源，不关联到任何空间'}
          </p>

          <div className="create-actions" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="create-btn create-btn--primary"
              onClick={onUpload}
              disabled={uploading || !selectedFile || !picName.trim()}
              style={{
                opacity: uploading || !selectedFile || !picName.trim() ? 0.6 : 1,
                cursor: uploading || !selectedFile || !picName.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {uploading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  上传中...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <polyline points="16 16 12 12 8 16"></polyline>
                    <line x1="12" y1="12" x2="12" y2="21"></line>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                  </svg>
                  确认上传
                </>
              )}
            </button>
            <button
              type="button"
              className="create-btn"
              onClick={() => navigate(`/spaces/${id}/pictures/view`)}
              disabled={uploading}
              style={{
                opacity: uploading ? 0.6 : 1,
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}
            >
              取消
            </button>
          </div>
        </article>
      )}
    </section>
  )
}
