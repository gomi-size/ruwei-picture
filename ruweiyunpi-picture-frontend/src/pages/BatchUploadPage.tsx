import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pictureApi } from '../api/picture'
import { AdminOnly } from '../components/AdminOnly'

export function BatchUploadPage() {
  return (
    <AdminOnly>
      <BatchUploadForm />
    </AdminOnly>
  )
}

function BatchUploadForm() {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [count, setCount] = useState<number>(10)
  const [namePrefix, setNamePrefix] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [uploadedCount, setUploadedCount] = useState<number | null>(null)

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text })
  }, [])

  const onClearAll = useCallback(() => {
    setSearchText('')
    setCount(10)
    setNamePrefix('')
    setUploadedCount(null)
    setToast(null)
  }, [])

  const onSubmit = async () => {
    if (!searchText.trim()) {
      showToast('info', '请输入搜索关键词')
      return
    }

    if (count < 1 || count > 30) {
      showToast('error', '抓取数量必须在 1-30 之间')
      return
    }

    setBusy(true)
    setToast(null)
    try {
      const result = await pictureApi.uploadByBatch({
        searchText: searchText.trim(),
        count: count,
        namePrefix: namePrefix.trim() || undefined,
      })

      setUploadedCount(result)
      showToast('success', `成功抓取并上传 ${result} 张图片`)
    } catch (e) {
      showToast('error', (e as Error).message || '批量抓取失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="create-page">
      <header className="create-hero">
        <p className="create-eyebrow">批量抓取</p>
        <h1 className="create-title">搜索并批量导入图片素材</h1>
        <p className="create-lead">
          输入关键词自动从网络搜索图片，批量抓取并上传到素材库。适合快速采集特定主题的素材。
        </p>
      </header>

      {toast ? (
        <div className={`create-toast create-toast--${toast.type}`} role="status">
          {toast.text}
        </div>
      ) : null}

      {uploadedCount !== null && (
        <div className="create-toast create-toast--success">
          ✅ 本次成功抓取并上传 <strong>{uploadedCount}</strong> 张图片
        </div>
      )}

      <div className="create-grid">
        <article className="create-panel">
          <div className="create-panel-head">
            <span className="create-panel-icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <div>
              <h2 className="create-panel-title">搜索参数设置</h2>
              <p className="create-panel-desc">输入关键词和抓取数量，系统将自动搜索并批量上传</p>
            </div>
          </div>

          <div className="create-field">
            <label htmlFor="batch-search-text" className="create-field-label">
              搜索关键词 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="batch-search-text"
              type="text"
              className="create-input"
              placeholder="例如：搞笑表情包、风景壁纸、卡通头像"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </div>

          <div className="create-field">
            <label htmlFor="batch-count" className="create-field-label">
              抓取数量 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="batch-count"
              type="number"
              className="create-input"
              placeholder="1-30"
              min={1}
              max={30}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              autoComplete="off"
              disabled={busy}
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
              最多可抓取 30 张图片，实际上传数量取决于搜索结果
            </p>
          </div>

          <div className="create-field">
            <label htmlFor="batch-name-prefix" className="create-field-label">
              名称前缀（可选）
            </label>
            <input
              id="batch-name-prefix"
              type="text"
              className="create-input"
              placeholder="留空则使用搜索关键词作为前缀"
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
              上传的图片将命名为：{namePrefix || searchText || '关键词'}+ 序号
            </p>
          </div>

          <button
            type="button"
            className="create-btn create-btn--primary"
            disabled={busy || !searchText.trim() || count < 1 || count > 30}
            onClick={onSubmit}
          >
            {busy ? '爬取中…' : `开始爬取图片（${count} 张）`}
          </button>
        </article>

        <article className="create-panel create-panel--accent">
          <div className="create-panel-head">
            <span className="create-panel-icon create-panel-icon--accent" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </span>
            <div>
              <h2 className="create-panel-title">使用说明</h2>
              <p className="create-panel-desc">了解批量抓取的工作原理和注意事项</p>
            </div>
          </div>

          <div className="create-field">
            <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#374151' }}>
              <p style={{ marginBottom: '12px', fontWeight: 600 }}>工作原理：</p>
              <ol style={{ margin: '0 0 16px', paddingLeft: '20px' }}>
                <li>根据关键词从 Bing 图片搜索抓取结果</li>
                <li>自动提取图片真实地址</li>
                <li>批量上传到对象存储</li>
                <li>创建图片记录并保存到数据库</li>
              </ol>

              <p style={{ marginBottom: '12px', fontWeight: 600 }}>注意事项：</p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>仅管理员可使用此功能</li>
                <li>请确保搜索内容合法合规</li>
                <li>注意版权问题，勿用于商业用途</li>
                <li>网络状况可能影响抓取速度</li>
                <li>部分图片可能无法访问，会自动跳过</li>
              </ul>
            </div>
          </div>
        </article>
      </div>

      <ul className="create-features">
        <li>
          <span className="create-feature-dot" />
          智能搜索，自动采集网络图片
        </li>
        <li>
          <span className="create-feature-dot" />
          批量上传，一次操作最多 30 张
        </li>
        <li>
          <span className="create-feature-dot" />
          自定义命名，便于素材管理
        </li>
      </ul>

      <footer className="create-footer">
        <button type="button" className="create-footer-link" onClick={() => navigate('/pictures/create')}>
          ← 返回单图上传
        </button>
        <button type="button" className="create-footer-cta" onClick={() => navigate('/pictures/manage')}>
          前往图片管理
        </button>
      </footer>
    </section>
  )
}
