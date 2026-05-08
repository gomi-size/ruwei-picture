import { useState, useRef, useCallback, useEffect } from 'react'

function getWsBase(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export interface EditNotification {
  type: string
  message: string
  editAction?: string
  user?: {
    id: string
    userName?: string
    userAvatar?: string
  }
  pictureId?: number | string
  isSelf: boolean
}

export interface EditError {
  message: string
  suggestions: string[]
}

interface UsePictureEditWebSocketReturn {
  isConnected: boolean
  isEditing: boolean
  editError: EditError | null
  notifications: EditNotification[]
  currentEditor: { id: string; name: string } | null
  viewerCount: number
  lockCountdown: number
  connect: (pictureId: string) => void
  disconnect: () => void
  enterEdit: () => void
  exitEdit: () => void
  sendEditAction: (action: string) => void
  clearNotifications: () => void
}

const INITIAL_LOCK_SECONDS = 27
const EXTEND_LOCK_SECONDS = 57

export function usePictureEditWebSocket(
  currentUserId?: string | null,
  applyRemoteActionRef?: React.MutableRefObject<((action: string) => void) | undefined>,
): UsePictureEditWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<EditError | null>(null)
  const [notifications, setNotifications] = useState<EditNotification[]>([])
  const [currentEditor, setCurrentEditor] = useState<{ id: string; name: string } | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  const [lockCountdown, setLockCountdown] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const pictureIdRef = useRef<string | null>(null)
  const currentUserIdRef = useRef(currentUserId)
  currentUserIdRef.current = currentUserId
  const countdownTimerRef = useRef<number | null>(null)
  const deadlineRef = useRef<number>(0)

  const stopCountdown = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      clearTimeout(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    setLockCountdown(0)
  }, [])

  const startOrResetCountdown = useCallback((seconds: number) => {
    stopCountdown()
    const deadline = Date.now() + seconds * 1000
    deadlineRef.current = deadline

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setLockCountdown(remaining)
      if (remaining > 0) {
        countdownTimerRef.current = window.setTimeout(tick, 250)
      } else {
        countdownTimerRef.current = null
      }
    }
    tick()
  }, [stopCountdown])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const connect = useCallback((pictureId: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    pictureIdRef.current = pictureId
    setEditError(null)
    setNotifications([])
    setCurrentEditor(null)
    setViewerCount(0)
    stopCountdown()

    const wsBase = getWsBase()
    const url = `${wsBase}/api/ws/picture/edit?pictureId=${pictureId}`
    console.debug('[WS] 连接:', url)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.debug('[WS] 已连接')
      setIsConnected(true)
      setEditError(null)
      setNotifications((prev) => [...prev, { type: 'INFO', message: '已连接到协作空间', isSelf: true }])
    }

    ws.onmessage = (event) => {
      try {
        const raw: Omit<EditNotification, 'isSelf'> = JSON.parse(event.data)
        const myId = currentUserIdRef.current
        const isSelf = !!(myId && raw.user && String(raw.user.id) === String(myId))
        console.debug('[WS] 收到消息:', raw.type, raw.message || '', isSelf ? '(自己)' : '')

        setNotifications((prev) => [...prev, { ...raw, isSelf }])

        switch (raw.type) {
          case 'ENTER_EDIT':
            if (raw.user) {
              setCurrentEditor({ id: raw.user.id, name: raw.user.userName || '未知用户' })
              if (isSelf) {
                setIsEditing(true)
              }
            }
            break
          case 'EXIT_EDIT':
            setCurrentEditor(null)
            setIsEditing(false)
            break
          case 'ERROR':
            setEditError({ message: raw.message || '操作失败', suggestions: [] })
            if (isSelf) {
              setIsEditing(false)
              setCurrentEditor(null)
              stopCountdown()
            }
            break
          case 'INFO':
            break
          case 'EDIT_ACTION':
            if (!isSelf && raw.editAction && applyRemoteActionRef?.current) {
              applyRemoteActionRef.current(raw.editAction)
            }
            break
        }
      } catch {
        console.warn('[WS] 无法解析消息')
      }
    }

    ws.onclose = (event) => {
      console.debug('[WS] 断开, code:', event.code, 'clean:', event.wasClean)
      setIsConnected(false)
      setIsEditing(false)
      setCurrentEditor(null)
      stopCountdown()
      if (!event.wasClean) {
        setEditError({
          message: `连接已断开 (code: ${event.code})`,
          suggestions: [
            '请确认此图片属于团队空间',
            '请确认您在该空间有编辑权限',
            '请确认后端服务已启动',
          ],
        })
      }
    }

    ws.onerror = () => {
      console.debug('[WS] onerror 事件（浏览器内部事件，连接正常则忽略）')
    }
  }, [stopCountdown])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsEditing(false)
    setCurrentEditor(null)
    setEditError(null)
    setNotifications([])
    setViewerCount(0)
    stopCountdown()
  }, [stopCountdown])

  const send = useCallback((data: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.debug('[WS] 发送:', data)
      wsRef.current.send(JSON.stringify(data))
    } else {
      console.warn('[WS] 未连接, 无法发送:', data)
    }
  }, [])

  const enterEdit = useCallback(() => {
    setEditError(null)
    setIsEditing(true)
    startOrResetCountdown(INITIAL_LOCK_SECONDS)
    send({ type: 'ENTER_EDIT', pictureId: pictureIdRef.current })
  }, [send, startOrResetCountdown])

  const exitEdit = useCallback(() => {
    stopCountdown()
    send({ type: 'EXIT_EDIT', pictureId: pictureIdRef.current })
    setIsEditing(false)
    setCurrentEditor(null)
  }, [send, stopCountdown])

  const sendEditAction = useCallback((action: string) => {
    console.debug('[WS] 发送编辑动作:', action)
    startOrResetCountdown(EXTEND_LOCK_SECONDS)
    send({ type: 'EDIT_ACTION', editAction: action, pictureId: pictureIdRef.current })
  }, [send, startOrResetCountdown])

  useEffect(() => {
    if (lockCountdown === 0 && isEditing && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      stopCountdown()
      const msg = { type: 'EXIT_EDIT', pictureId: pictureIdRef.current }
      wsRef.current.send(JSON.stringify(msg))
      setIsEditing(false)
      setCurrentEditor(null)
      console.debug('[WS] 倒计时结束，自动退出编辑')
    }
  }, [lockCountdown, isEditing, stopCountdown])

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      stopCountdown()
    }
  }, [stopCountdown])

  return {
    isConnected,
    isEditing,
    editError,
    notifications,
    currentEditor,
    viewerCount,
    lockCountdown,
    connect,
    disconnect,
    enterEdit,
    exitEdit,
    sendEditAction,
    clearNotifications,
  }
}
