import type { PictureVO, LoginUserVO } from '../types/api'

/**
 * 检查用户是否为管理员
 */
export function isAdmin(user: LoginUserVO | null): boolean {
  return user?.userRole === 'admin'
}

/**
 * 检查图片是否已审核通过（普通用户只能查看通过审核的图片）
 */
export function isPictureApproved(picture: PictureVO): boolean {
  // 如果没有 reviewStatus 字段，默认为通过（兼容旧数据）
  if (picture.reviewStatus === undefined || picture.reviewStatus === null) {
    return true
  }
  return picture.reviewStatus === 1 // 1 = PASS (通过)
}

/**
 * 过滤图片列表，只保留已审核通过的图片（普通用户使用）
 */
export function filterApprovedPictures(pictures: PictureVO[]): PictureVO[] {
  return pictures.filter(isPictureApproved)
}

/**
 * 检查用户是否有权限查看图片
 * @param user 当前用户
 * @param picture 图片对象
 * @returns boolean 是否有权限查看
 */
export function canViewPicture(user: LoginUserVO | null, picture: PictureVO): boolean {
  // 管理员可以查看所有图片
  if (isAdmin(user)) {
    return true
  }
  
  // 普通用户只能查看已审核通过的图片
  return isPictureApproved(picture)
}

/**
 * 检查用户是否有权限管理图片（审核、删除等）
 * @param user 当前用户
 * @returns boolean 是否有管理权限
 */
export function canManagePictures(user: LoginUserVO | null): boolean {
  return isAdmin(user)
}

/**
 * 获取图片审核状态的文本描述
 */
export function getReviewStatusText(status?: number | null): string {
  if (status === undefined || status === null) {
    return '未知'
  }
  switch (status) {
    case 0:
      return '待审核'
    case 1:
      return '已通过'
    case 2:
      return '已拒绝'
    default:
      return '未知'
  }
}

/**
 * 获取图片审核状态对应的颜色
 */
export function getReviewStatusColor(status?: number | null): string {
  if (status === undefined || status === null) {
    return '#9ca3af'
  }
  switch (status) {
    case 0:
      return '#f59e0b' // 黄色 - 待审核
    case 1:
      return '#10b981' // 绿色 - 已通过
    case 2:
      return '#ef4444' // 红色 - 已拒绝
    default:
      return '#9ca3af'
  }
}
