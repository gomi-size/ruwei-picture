import type { ReactNode } from 'react'
import type { SpaceVO } from '../types/api'

interface AuthTagProps {
  /** 权限标识符 */
  permission: string
  /** 空间对象（包含 permissionList） */
  space?: SpaceVO | null
  /** 子组件 */
  children: ReactNode
  /** 如果没有权限时显示的替代组件（可选） */
  fallback?: ReactNode
}

/**
 * 权限控制包装组件
 * 根据空间的 permissionList 判断是否渲染子组件
 * 
 * @example
 * ```tsx
 * <AuthTag permission="picture_edit" space={space}>
 *   <button>编辑</button>
 * </AuthTag>
 * ```
 */
export function AuthTag({ permission, space, children, fallback = null }: AuthTagProps) {
  // 如果空间信息未加载，不渲染
  if (!space) {
    return <>{fallback}</>
  }

  // 如果权限列表为空或 undefined，不渲染
  const permissionList = space.permissionList || []
  if (!permissionList.includes(permission)) {
    return <>{fallback}</>
  }

  // 有权限，渲染子组件
  return <>{children}</>
}

/**
 * 检查用户是否有指定权限的工具函数
 * 
 * @param space 空间对象
 * @param permission 权限标识符
 * @returns boolean 是否有权限
 */
export function hasPermission(space: SpaceVO | null | undefined, permission: string): boolean {
  if (!space) {
    return false
  }
  const permissionList = space.permissionList || []
  return permissionList.includes(permission)
}

/**
 * 检查用户是否有任何一个权限的工具函数
 * 
 * @param space 空间对象
 * @param permissions 权限标识符列表
 * @returns boolean 是否有任一权限
 */
export function hasAnyPermission(space: SpaceVO | null | undefined, permissions: string[]): boolean {
  if (!space) {
    return false
  }
  const permissionList = space.permissionList || []
  return permissions.some(permission => permissionList.includes(permission))
}
