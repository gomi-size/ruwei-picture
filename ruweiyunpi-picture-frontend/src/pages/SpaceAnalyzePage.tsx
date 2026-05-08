import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { spaceApi, spaceAnalyzeApi } from '../api/space'
import { useAuth } from '../context/AuthContext'
import type {
  SpaceVO,
  SpaceUsageAnalyzeResponse,
  SpaceCategoryAnalyzeResponse,
  SpaceTagAnalyzeResponse,
  SpaceSizeAnalyzeResponse,
  SpaceUserAnalyzeResponse,
  SpaceRankVO,
} from '../types/api'

type ScopeMode = 'space' | 'public' | 'all'

export function SpaceAnalyzePage() {
  const { currentUser, isAdmin } = useAuth()
  const [searchParams] = useSearchParams()

  const [spaces, setSpaces] = useState<SpaceVO[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(searchParams.get('spaceId') || '')
  const [scopeMode, setScopeMode] = useState<ScopeMode>('space')
  const [timeDimension, setTimeDimension] = useState<'day' | 'week' | 'month'>('day')
  const [loading, setLoading] = useState(false)

  const [usageData, setUsageData] = useState<SpaceUsageAnalyzeResponse | null>(null)
  const [categoryData, setCategoryData] = useState<SpaceCategoryAnalyzeResponse[]>([])
  const [tagData, setTagData] = useState<SpaceTagAnalyzeResponse[]>([])
  const [sizeData, setSizeData] = useState<SpaceSizeAnalyzeResponse[]>([])
  const [userData, setUserData] = useState<SpaceUserAnalyzeResponse[]>([])
  const [rankData, setRankData] = useState<SpaceRankVO[]>([])

  const [usageError, setUsageError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [tagError, setTagError] = useState('')
  const [sizeError, setSizeError] = useState('')
  const [userError, setUserError] = useState('')
  const [rankError, setRankError] = useState('')

  const buildRequest = () => {
    const req: { spaceId?: number | string; queryPublic?: boolean; queryAll?: boolean } = {}
    if (scopeMode === 'space' && selectedSpaceId) {
      req.spaceId = selectedSpaceId
    } else if (scopeMode === 'public') {
      req.queryPublic = true
    } else if (scopeMode === 'all') {
      req.queryAll = true
    }
    return req
  }

  const loadSpaces = useCallback(async () => {
    try {
      let page
      if (isAdmin) {
        page = await spaceApi.listByPage({ current: 1, pageSize: 100 })
      } else {
        page = await spaceApi.listByPageVO({ current: 1, pageSize: 100, userId: currentUser?.id })
      }
      const list = page.records || []
      setSpaces(list)
      const urlSpaceId = searchParams.get('spaceId')
      if (urlSpaceId && list.some(s => String(s.id) === urlSpaceId)) {
        if (selectedSpaceId !== urlSpaceId) {
          setSelectedSpaceId(urlSpaceId)
        }
      } else if (list.length > 0 && !selectedSpaceId) {
        setSelectedSpaceId(String(list[0].id))
      }
    } catch {
      console.error('加载空间列表失败')
    }
  }, [currentUser, isAdmin, selectedSpaceId])

  const loadAllAnalysis = useCallback(async () => {
    const req = buildRequest()
    if (scopeMode === 'space' && !req.spaceId) return

    setLoading(true)
    setUsageError('')
    setCategoryError('')
    setTagError('')
    setSizeError('')
    setUserError('')
    setRankError('')

    const promises = [
      spaceAnalyzeApi.getUsage(req).then(setUsageData).catch((e: Error) => setUsageError(e.message)),
      spaceAnalyzeApi.getCategory(req).then(setCategoryData).catch((e: Error) => setCategoryError(e.message)),
      spaceAnalyzeApi.getTags(req).then(setTagData).catch((e: Error) => setTagError(e.message)),
      spaceAnalyzeApi.getSize(req).then(setSizeData).catch((e: Error) => setSizeError(e.message)),
      spaceAnalyzeApi.getUser({ ...req, timeDimension }).then(setUserData).catch((e: Error) => setUserError(e.message)),
    ]

    if (isAdmin) {
      promises.push(
        spaceAnalyzeApi.getRank({ topN: 10 }).then(setRankData).catch((e: Error) => setRankError(e.message))
      )
    }

    await Promise.allSettled(promises)
    setLoading(false)
  }, [selectedSpaceId, scopeMode, timeDimension, isAdmin])

  useEffect(() => {
    if (currentUser) {
      void loadSpaces()
    }
  }, [loadSpaces, currentUser])

  useEffect(() => {
    if (selectedSpaceId || scopeMode !== 'space') {
      void loadAllAnalysis()
    }
  }, [selectedSpaceId, scopeMode, timeDimension])

  const formatSize = (bytes: number | null | undefined) => {
    const num = Number(bytes ?? 0)
    if (!Number.isFinite(num) || num === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(num) / Math.log(k))
    return Math.round(num / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const categoryColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6']
  const sizePieColors = ['#10b981', '#f59e0b', '#f97316', '#ef4444']

  const totalCountAll = sizeData.reduce((s, d) => s + d.count, 0)

  if (!currentUser) {
    return (
      <div className="card access-card">
        <h2>需要登录</h2>
        <p>请使用右上角登录后访问此页面。</p>
      </div>
    )
  }

  return (
    <section className="space-analyze-page">
      <style>{`
        .space-analyze-page {
          max-width: 1400px;
          margin: 0 auto;
        }
        .analyze-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 42%, #1d4ed8 100%);
          border-radius: 16px;
          padding: 32px 36px;
          margin-bottom: 28px;
          color: #f8fafc;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
          position: relative;
          overflow: hidden;
        }
        .analyze-header::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,0.1), transparent 55%);
          pointer-events: none;
        }
        .analyze-header-content {
          position: relative;
          z-index: 1;
        }
        .analyze-header h1 {
          margin: 0 0 8px;
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .analyze-header p {
          margin: 0 0 20px;
          color: rgba(248,250,252,0.78);
          font-size: 0.9375rem;
        }
        .analyze-controls {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }
        .analyze-select {
          padding: 10px 16px;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 10px;
          background: rgba(255,255,255,0.1);
          color: #f8fafc;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          outline: none;
          min-width: 180px;
          backdrop-filter: blur(8px);
        }
        .analyze-select option {
          background: #1e293b;
          color: #f8fafc;
        }
        .analyze-scope-group {
          display: flex;
          gap: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 4px;
        }
        .analyze-scope-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: rgba(248,250,252,0.65);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .analyze-scope-btn.active {
          background: rgba(59,130,246,0.5);
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .analyze-scope-btn:hover:not(.active) {
          color: #f8fafc;
        }
        .analyze-refresh-btn {
          padding: 10px 20px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 10px;
          color: #f8fafc;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: auto;
        }
        .analyze-refresh-btn:hover {
          background: rgba(255,255,255,0.25);
        }
        .analyze-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
          gap: 20px;
        }
        @media (max-width: 960px) {
          .analyze-grid { grid-template-columns: 1fr; }
        }
        .analyze-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #f1f5f9;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .analyze-card-full {
          grid-column: 1 / -1;
        }
        .analyze-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .analyze-card-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .analyze-card-title {
          font-size: 1.0625rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
        }
        .analyze-card-subtitle {
          font-size: 0.8125rem;
          color: #94a3b8;
          margin: 2px 0 0;
        }
        .analyze-error {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }
        .analyze-loading {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }
        .analyze-loading-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* 仪表盘样式 */
        .gauge-row {
          display: flex;
          gap: 32px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .gauge-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .gauge-ring {
          position: relative;
          width: 140px;
          height: 140px;
        }
        .gauge-ring svg {
          transform: rotate(-90deg);
        }
        .gauge-ring-bg {
          fill: none;
          stroke: #f1f5f9;
          stroke-width: 12;
        }
        .gauge-ring-fill {
          fill: none;
          stroke-width: 12;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1);
        }
        .gauge-value {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .gauge-value-num {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }
        .gauge-value-unit {
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .gauge-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          text-align: center;
        }
        .gauge-detail {
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: center;
          max-width: 180px;
        }

        /* 分组条形图样式 */
        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .bar-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .bar-label {
          width: 90px;
          flex-shrink: 0;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #334155;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bar-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .bar-track {
          height: 22px;
          background: #f1f5f9;
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }
        .bar-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
          display: flex;
          align-items: center;
          padding-left: 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #fff;
          min-width: 0;
        }
        .bar-size-track {
          height: 14px;
          background: #f1f5f9;
          border-radius: 4px;
          overflow: hidden;
        }
        .bar-size-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
          background: #e2e8f0;
        }

        /* 词云样式 */
        .tag-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          align-items: center;
        }
        .tag-cloud-item {
          padding: 4px 12px;
          border-radius: 9999px;
          cursor: default;
          transition: transform 0.2s;
          font-weight: 600;
          line-height: 1.4;
        }
        .tag-cloud-item:hover {
          transform: scale(1.1);
        }

        /* 饼图样式 */
        .pie-chart-wrap {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .pie-chart {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pie-legend {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pie-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #334155;
        }
        .pie-legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .pie-legend-count {
          font-weight: 600;
          margin-left: auto;
          padding-left: 8px;
        }

        /* 折线图样式 */
        .line-chart-wrap {
          position: relative;
          width: 100%;
          height: 280px;
        }
        .line-chart-svg {
          width: 100%;
          height: 100%;
        }
        .line-chart-grid line {
          stroke: #f1f5f9;
          stroke-width: 1;
        }
        .line-chart-grid text {
          fill: #94a3b8;
          font-size: 11px;
        }
        .line-chart-tooltip {
          background: #0f172a;
          color: #fff;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8125rem;
          position: absolute;
          pointer-events: none;
          transform: translate(-50%, -100%);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.15s;
        }

        /* 排行榜样式 */
        .rank-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rank-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .rank-index {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 700;
          flex-shrink: 0;
          background: #f1f5f9;
          color: #64748b;
        }
        .rank-index.top3 {
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: #fff;
        }
        .rank-name {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
          color: #334155;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rank-bar-wrap {
          width: 200px;
          height: 24px;
          background: #f1f5f9;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .rank-bar-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        }
        .rank-size {
          width: 80px;
          text-align: right;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #0f172a;
          flex-shrink: 0;
        }
      `}</style>

      <div className="analyze-header">
        <div className="analyze-header-content">
          <h1>空间图库分析</h1>
          <p>全面了解您的图库资源使用情况，优化存储管理策略</p>
        </div>
        <div className="analyze-controls">
          {scopeMode === 'space' && (
            <select
              className="analyze-select"
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
            >
              {spaces.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.spaceName || `空间 #${s.id}`}</option>
              ))}
            </select>
          )}

          <div className="analyze-scope-group">
            <button className={`analyze-scope-btn${scopeMode === 'space' ? ' active' : ''}`} onClick={() => setScopeMode('space')}>
              我的空间
            </button>
            {isAdmin && (
              <>
                <button className={`analyze-scope-btn${scopeMode === 'public' ? ' active' : ''}`} onClick={() => setScopeMode('public')}>
                  公共图库
                </button>
                <button className={`analyze-scope-btn${scopeMode === 'all' ? ' active' : ''}`} onClick={() => setScopeMode('all')}>
                  全空间
                </button>
              </>
            )}
          </div>

          <select className="analyze-select" style={{minWidth: 120}} value={timeDimension} onChange={(e) => setTimeDimension(e.target.value as 'day' | 'week' | 'month')}>
            <option value="day">按天</option>
            <option value="week">按周</option>
            <option value="month">按月</option>
          </select>

          <button className="analyze-refresh-btn" onClick={() => void loadAllAnalysis()} disabled={loading}>
            {loading ? '加载中…' : '刷新分析'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="analyze-loading">
          <div className="analyze-loading-spinner" />
          <p>正在加载分析数据…</p>
        </div>
      )}

      <div className="analyze-grid">
        {/* 1. 空间资源使用分析 - 仪表盘 */}
        <div className="analyze-card">
          <div className="analyze-card-header">
            <div className="analyze-card-icon" style={{background: '#eff6ff', color: '#3b82f6'}}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12 6 6 0 010-12z"/>
                <path d="M10 6a4 4 0 100 8 4 4 0 000-8z"/>
              </svg>
            </div>
            <div>
              <h3 className="analyze-card-title">空间资源使用分析</h3>
              <p className="analyze-card-subtitle">存储容量与图片数量配额使用情况</p>
            </div>
          </div>
          {usageError ? (
            <div className="analyze-error">加载失败：{usageError}</div>
          ) : usageData ? (
            <div className="gauge-row">
              {(() => {
                const circumference = 2 * Math.PI * 58
                const sizeRatio = usageData.maxSize ? Math.min(usageData.sizeUsageRatio ?? 0, 100) : 0
                const countRatio = usageData.maxCount ? Math.min(usageData.countUsageRatio ?? 0, 100) : 0
                const sizeOffset = circumference * (1 - sizeRatio / 100)
                const countOffset = circumference * (1 - countRatio / 100)
                return (
                  <>
                    <div className="gauge-item">
                      <div className="gauge-ring">
                        <svg width="140" height="140" viewBox="0 0 140 140">
                          <circle className="gauge-ring-bg" cx="70" cy="70" r="58" />
                          <circle className="gauge-ring-fill" cx="70" cy="70" r="58"
                            stroke={sizeRatio > 90 ? '#ef4444' : sizeRatio > 70 ? '#f59e0b' : '#10b981'}
                            strokeDasharray={circumference}
                            strokeDashoffset={sizeOffset}
                          />
                        </svg>
                        <div className="gauge-value">
                          <span className="gauge-value-num">{Math.round(sizeRatio)}%</span>
                          <span className="gauge-value-unit">已使用</span>
                        </div>
                      </div>
                      <span className="gauge-label">存储容量</span>
                      <span className="gauge-detail">
                        {formatSize(usageData.usedSize)} / {usageData.maxSize ? formatSize(usageData.maxSize) : '无限制'}
                      </span>
                    </div>
                    <div className="gauge-item">
                      <div className="gauge-ring">
                        <svg width="140" height="140" viewBox="0 0 140 140">
                          <circle className="gauge-ring-bg" cx="70" cy="70" r="58" />
                          <circle className="gauge-ring-fill" cx="70" cy="70" r="58"
                            stroke={countRatio > 90 ? '#ef4444' : countRatio > 70 ? '#f59e0b' : '#8b5cf6'}
                            strokeDasharray={circumference}
                            strokeDashoffset={countOffset}
                          />
                        </svg>
                        <div className="gauge-value">
                          <span className="gauge-value-num">{Math.round(countRatio)}%</span>
                          <span className="gauge-value-unit">已使用</span>
                        </div>
                      </div>
                      <span className="gauge-label">图片数量</span>
                      <span className="gauge-detail">
                        {usageData.usedCount} 张 / {usageData.maxCount ?? '无限制'}
                      </span>
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="analyze-error">暂无数据</div>
          )}
        </div>

        {/* 2. 空间图片分类分析 - 分组条形图 */}
        <div className="analyze-card">
          <div className="analyze-card-header">
            <div className="analyze-card-icon" style={{background: '#f0fdf4', color: '#10b981'}}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V3zM7 3a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H8a1 1 0 01-1-1V3zM12 3a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 01-1 1h-2a1 1 0 01-1-1V3zM2 10a1 1 0 011-1h2a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-7zM7 10a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 01-1 1H8a1 1 0 01-1-1v-3zM12 10a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1h-2a1 1 0 01-1-1v-5z"/>
              </svg>
            </div>
            <div>
              <h3 className="analyze-card-title">空间图片分类分析</h3>
              <p className="analyze-card-subtitle">各分类图片数量与存储大小分布</p>
            </div>
          </div>
          {categoryError ? (
            <div className="analyze-error">加载失败：{categoryError}</div>
          ) : categoryData.length > 0 ? (
            <div className="bar-chart">
              {(() => {
                const maxCount = Math.max(...categoryData.map(d => d.count), 1)
                const maxSize = Math.max(...categoryData.map(d => d.totalSize), 1)
                return categoryData.map((d, i) => (
                  <div className="bar-row" key={d.category ? `cat-${d.category}` : `cat-empty-${i}`}>
                    <span className="bar-label">{d.category || '未分类'}</span>
                    <div className="bar-group">
                      <div className="bar-track">
                        <div className="bar-fill" style={{
                          width: `${(d.count / maxCount) * 100}%`,
                          background: categoryColors[i % categoryColors.length]
                        }}>
                          {d.count > maxCount * 0.15 ? `${d.count} 张` : ''}
                        </div>
                      </div>
                      <div className="bar-size-track">
                        <div className="bar-size-fill" style={{width: `${(d.totalSize / maxSize) * 100}%`}} />
                      </div>
                      <span style={{fontSize: '0.7rem', color: '#94a3b8'}}>{formatSize(d.totalSize)}</span>
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div className="analyze-error">暂无分类数据</div>
          )}
        </div>

        {/* 3. 空间图片标签分析 - 词云图 */}
        <div className="analyze-card">
          <div className="analyze-card-header">
            <div className="analyze-card-icon" style={{background: '#fef3c7', color: '#f59e0b'}}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <h3 className="analyze-card-title">空间图片标签分析</h3>
              <p className="analyze-card-subtitle">标签使用频率分布（词云图）</p>
            </div>
          </div>
          {tagError ? (
            <div className="analyze-error">加载失败：{tagError}</div>
          ) : tagData.length > 0 ? (
            <div className="tag-cloud" style={{minHeight: 120, alignContent: 'center'}}>
              {(() => {
                const maxCount = Math.max(...tagData.map(t => t.count), 1)
                const minCount = Math.min(...tagData.map(t => t.count), maxCount)
                const range = maxCount - minCount || 1
                return tagData.map((t, i) => {
                  const ratio = (t.count - minCount) / range
                  const fontSize = 0.75 + ratio * 1.75
                  const opacity = 0.5 + ratio * 0.5
                  const hue = (i * 37 + 200) % 360
                  return (
                    <span
                      key={t.tag}
                      className="tag-cloud-item"
                      style={{
                        fontSize: `${fontSize}rem`,
                        opacity,
                        background: `hsla(${hue}, 65%, 55%, ${0.1 + ratio * 0.2})`,
                        color: `hsl(${hue}, 60%, ${35 - ratio * 15}%)`,
                      }}
                      title={`${t.tag}: ${t.count} 次`}
                    >
                      {t.tag}
                    </span>
                  )
                })
              })()}
            </div>
          ) : (
            <div className="analyze-error">暂无标签数据</div>
          )}
        </div>

        {/* 4. 空间图片大小分析 - 饼图 */}
        <div className="analyze-card">
          <div className="analyze-card-header">
            <div className="analyze-card-icon" style={{background: '#fce7f3', color: '#ec4899'}}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2H5zm0 2h10v7H5V4zm0 9h4v3H5v-3zm6 0h4v3h-4v-3z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <h3 className="analyze-card-title">空间图片大小分析</h3>
              <p className="analyze-card-subtitle">按图片大小分段统计数量与占比</p>
            </div>
          </div>
          {sizeError ? (
            <div className="analyze-error">加载失败：{sizeError}</div>
          ) : sizeData.length > 0 ? (
            <div className="pie-chart-wrap">
              <div className="pie-chart" style={{
                background: `conic-gradient(${sizeData.map((d, i, arr) => {
                  const prev = arr.slice(0, i).reduce((s, x) => s + x.count, 0)
                  const start = (prev / totalCountAll) * 100
                  const end = ((prev + d.count) / totalCountAll) * 100
                  return `${sizePieColors[i]} ${start}% ${end}%`
                }).join(', ')})`
              }} />
              <div className="pie-legend">
                {sizeData.map((d, i) => (
                  <div className="pie-legend-item" key={d.sizeRange}>
                    <span className="pie-legend-dot" style={{background: sizePieColors[i]}} />
                    <span>{d.sizeRange}</span>
                    <span className="pie-legend-count">{d.count} 张 ({totalCountAll > 0 ? Math.round(d.count / totalCountAll * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="analyze-error">暂无大小分析数据</div>
          )}
        </div>

        {/* 5. 用户上传行为分析 - 折线图 */}
        <div className="analyze-card">
          <div className="analyze-card-header">
            <div className="analyze-card-icon" style={{background: '#ede9fe', color: '#8b5cf6'}}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <h3 className="analyze-card-title">用户上传行为分析</h3>
              <p className="analyze-card-subtitle">上传数量时间趋势（{timeDimension === 'day' ? '按天' : timeDimension === 'week' ? '按周' : '按月'}）</p>
            </div>
          </div>
          {userError ? (
            <div className="analyze-error">加载失败：{userError}</div>
          ) : userData.length > 0 ? (
            <div className="line-chart-wrap">
              {(() => {
                const W = 600
                const H = 260
                const padL = 50; const padR = 20; const padT = 15; const padB = 35
                const plotW = W - padL - padR
                const plotH = H - padT - padB
                const maxY = Math.max(...userData.map(d => d.count), 1) * 1.15
                const points = userData.map((d, i) => ({
                  x: padL + (userData.length > 1 ? (i / (userData.length - 1)) * plotW : plotW / 2),
                  y: padT + plotH - (d.count / maxY) * plotH,
                  ...d
                }))
                const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
                const yTicks = 5
                const areaD = `${pathD} L${points[points.length-1].x},${padT + plotH} L${points[0].x},${padT + plotH} Z`
                return (
                  <svg className="line-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <g className="line-chart-grid">
                      {Array.from({length: yTicks}).map((_, i) => {
                        const val = Math.round(maxY * (i / (yTicks - 1)))
                        const y = padT + plotH - (val / maxY) * plotH
                        return (
                          <g key={i}>
                            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
                            <text x={padL - 8} y={y + 4} textAnchor="end">{val}</text>
                          </g>
                        )
                      })}
                    </g>
                    <path d={areaD} fill="url(#lineGrad)"/>
                    <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {points.map((p, i) => (
                      <g key={i} style={{cursor: 'pointer'}}>
                        <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#8b5cf6" strokeWidth="2"/>
                        <title>{p.period}: {p.count} 次上传</title>
                      </g>
                    ))}
                    <g className="line-chart-grid">
                      {points.filter((_, i) => userData.length <= 20 || i % Math.ceil(userData.length / 12) === 0).map((p, i) => (
                        <text key={i} x={p.x} y={padT + plotH + 20} textAnchor="middle" transform={`rotate(-30,${p.x},${padT + plotH + 20})`}>
                          {p.period.length > 8 ? p.period.slice(-8) : p.period}
                        </text>
                      ))}
                    </g>
                  </svg>
                )
              })()}
            </div>
          ) : (
            <div className="analyze-error">暂无上传行为数据</div>
          )}
        </div>

        {/* 6. 空间使用排行分析 - 管理员 */}
        {isAdmin && (
          <div className="analyze-card analyze-card-full">
            <div className="analyze-card-header">
              <div className="analyze-card-icon" style={{background: '#fff7ed', color: '#f97316'}}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
              <div>
                <h3 className="analyze-card-title">空间使用排行分析</h3>
                <p className="analyze-card-subtitle">按存储使用量排序 TOP 10（仅管理员可见）</p>
              </div>
            </div>
            {rankError ? (
              <div className="analyze-error">加载失败：{rankError}</div>
            ) : rankData.length > 0 ? (
              <div className="rank-list">
                {(() => {
                  const maxSize = Math.max(...rankData.map(r => r.totalSize || 0), 1)
                  return rankData.map((r, i) => (
                    <div className="rank-item" key={r.id || i}>
                      <div className={`rank-index${i < 3 ? ' top3' : ''}`}>{i + 1}</div>
                      <span className="rank-name">{r.spaceName || `空间 #${r.id}`}</span>
                      <div className="rank-bar-wrap">
                        <div className="rank-bar-fill" style={{width: `${((r.totalSize || 0) / maxSize) * 100}%`}} />
                      </div>
                      <span className="rank-size">{formatSize(r.totalSize)}</span>
                    </div>
                  ))
                })()}
              </div>
            ) : (
              <div className="analyze-error">暂无排行数据</div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
