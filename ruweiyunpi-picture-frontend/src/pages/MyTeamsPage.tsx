import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { spaceApi, spaceUserApi } from '../api/space'
import { useAuth } from '../context/AuthContext'
import type { SpaceUserVO, SpaceVO } from '../types/api'

interface TeamEntry {
  spaceId: string
  spaceName: string
  source: 'created' | 'joined'
  spaceRole?: string
}

const roleLabelMap: Record<string, string> = {
  admin: '管理员',
  editor: '编辑者',
  viewer: '浏览者',
}

export function MyTeamsPage() {
  const { currentUser } = useAuth()
  const [createdSpaces, setCreatedSpaces] = useState<SpaceVO[]>([])
  const [joinedSpaceUsers, setJoinedSpaceUsers] = useState<SpaceUserVO[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const [createdRes, joinedRes] = await Promise.allSettled([
        spaceApi.listByPageVO({ current: 1, pageSize: 100, userId: currentUser.id, spaceType: 1 }),
        spaceUserApi.listMyTeamSpaceUser(),
      ])
      console.log('[MyTeams] 我创建的:', createdRes)
      console.log('[MyTeams] 我加入的:', joinedRes)
      setCreatedSpaces(createdRes.status === 'fulfilled' ? (createdRes.value.records || []) : [])
      setJoinedSpaceUsers(joinedRes.status === 'fulfilled' ? (joinedRes.value || []) : [])
    } catch (err) {
      console.error('加载团队空间失败:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      void load()
    } else {
      setLoading(false)
    }
  }, [currentUser, load])

  const teams = useMemo<TeamEntry[]>(() => {
    const createdIds = new Set(createdSpaces.map((s) => String(s.id)))

    const entries: TeamEntry[] = createdSpaces.map((s) => ({
      spaceId: String(s.id),
      spaceName: s.spaceName || '未命名空间',
      source: 'created' as const,
      spaceRole: 'admin',
    }))

    for (const su of joinedSpaceUsers) {
      if (!su.spaceId) continue
      if (createdIds.has(String(su.spaceId))) continue
      if (su.space?.userId && currentUser && String(su.space.userId) === String(currentUser.id)) continue
      entries.push({
        spaceId: String(su.spaceId),
        spaceName: su.space?.spaceName || '未命名空间',
        source: 'joined' as const,
        spaceRole: su.spaceRole,
      })
    }

    return entries
  }, [createdSpaces, joinedSpaceUsers, currentUser])

  return (
    <div className="my-teams-page">
      <div className="my-teams-hero">
        <div className="my-teams-hero-content">
          <h1 className="my-teams-title">我的团队</h1>
          <p className="my-teams-subtitle">管理所有团队协作空间</p>
        </div>
      </div>

      {loading ? (
        <div className="my-teams-loading">
          <div className="my-teams-spinner"></div>
          <p>加载中...</p>
        </div>
      ) : !currentUser ? (
        <div className="my-teams-empty">
          <svg className="my-teams-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h2>请先登录</h2>
          <p>登录后可以查看团队空间</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="my-teams-empty">
          <svg className="my-teams-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h2>暂无团队空间</h2>
          <p>还没有任何团队空间</p>
          <Link to="/spaces" className="my-teams-create-btn">去创建/加入空间</Link>
        </div>
      ) : (
        <div className="my-teams-grid">
          {teams.map((team) => (
            <div key={team.spaceId} className={`my-teams-card my-teams-card--${team.source}`}>
              <div className="my-teams-card-avatar">
                {team.spaceName.charAt(0)}
              </div>
              <div className="my-teams-card-body">
                <h3 className="my-teams-card-name">{team.spaceName}</h3>
                <div className="my-teams-card-tags">
                  {team.source === 'created' ? (
                    <span className="my-teams-tag my-teams-tag--created">我创建的</span>
                  ) : (
                    <span className="my-teams-tag my-teams-tag--joined">
                      {roleLabelMap[team.spaceRole || ''] || team.spaceRole || '成员'}
                    </span>
                  )}
                </div>
              </div>
              <div className="my-teams-card-actions">
                <Link
                  to={`/my-teams/${team.spaceId}`}
                  className="my-teams-card-link"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                  进入空间
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
