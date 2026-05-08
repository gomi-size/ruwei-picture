export interface BaseResponse<T> {
  code: number
  data: T
  message: string
}

export interface PageRequest {
  current?: number
  pageSize?: number
  sortField?: string
  sortOrder?: string
}

export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

export interface LoginUserVO {
  id: string  // 使用字符串类型，避免雪花算法ID精度丢失
  userAccount: string
  userName?: string
  userAvatar?: string
  userProfile?: string
  userRole: string
  editTime?: string
  createTime?: string
  updateTime?: string
  token?: string
}

export interface UserVO {
  id: string  // 使用字符串类型，避免雪花算法ID精度丢失
  userAccount: string
  userName?: string
  userAvatar?: string
  userProfile?: string
  userRole: string
  createTime?: string
}

export interface PictureVO {
  id: string  // 使用字符串类型，避免雪花算法ID精度丢失
  url: string
  thumbnailUrl?: string
  webpUrl?: string  // WebP 格式高清大图地址
  name?: string
  title?: string  // 图片标题（用于展示）
  introduction?: string
  tags?: string[]
  category?: string
  picSize?: number
  picWidth?: number
  picHeight?: number
  picScale?: number  // 图片宽高比（用于占位防抖动）
  aspectRatio?: number  // 图片宽高比（用于占位防抖动）
  picColor?: string  // 后端返回的图片主色调字段
  dominantColor?: string  // 图片主色调 Hex 值（兼容旧字段）
  picFormat?: string
  userId?: string  // 使用字符串类型，避免雪花算法ID精度丢失
  spaceId?: number | string  // 空间 id
  reviewStatus?: number  // 审核状态：0-待审核; 1-通过; 2-拒绝
  reviewMessage?: string
  createTime?: string
  editTime?: string
  updateTime?: string
  user?: UserVO
}

export interface PictureTagCategory {
  tagList: string[]
  categoryList: string[]
}

export interface UserLoginRequest {
  userAccount: string
  userPassword: string
  captchaKey?: string
  captchaCode?: string
}

export interface UserRegisterRequest {
  userAccount: string
  userPassword: string
  checkPassword: string
  captchaKey?: string
  captchaCode?: string
}

export interface UserAddRequest {
  userName?: string
  userAccount?: string
  userAvatar?: string
  userProfile?: string
  userRole?: string
}

export interface UserUpdateRequest {
  id: string  // 使用字符串类型，避免雪花算法ID精度丢失
  userName?: string
  userAvatar?: string
  userProfile?: string
  userRole?: string
}

export interface UserQueryRequest extends PageRequest {
  id?: string  // 使用字符串类型，避免雪花算法ID精度丢失
  userName?: string
  userAccount?: string
  userProfile?: string
  userRole?: string
}

export interface PictureQueryRequest extends PageRequest {
  id?: string  // 使用字符串类型，避免雪花算法ID精度丢失
  name?: string
  introduction?: string
  category?: string
  tags?: string[]
  searchText?: string
  userId?: string  // 使用字符串类型，避免雪花算法ID精度丢失
  reviewStatus?: number
  spaceId?: number | string  // 支持字符串类型，避免雪花算法ID精度丢失
}

export interface PictureReviewRequest {
  id: string  // 使用字符串类型，避免雪花算法ID精度丢失
  reviewStatus: number
}

export interface PictureUpdateRequest {
  id: string  // 使用字符串类型，避免雪花算法ID精度丢失
  name?: string
  introduction?: string
  category?: string
  tags?: string[]
}

export interface SpaceVO {
  id: string  // 使用字符串类型，避免雪花算法ID精度丢失
  spaceName?: string
  spaceLevel?: number
  spaceType?: number
  maxSize?: number
  maxCount?: number
  totalSize?: number
  totalCount?: number
  userId?: number | string
  createTime?: string
  editTime?: string
  updateTime?: string
  user?: UserVO
  permissionList?: string[]
}

export interface SpaceLevel {
  value: number
  text: string
  maxCount: number
  maxSize: number
}

export interface SpaceUserVO {
  id: string
  userId: string
  spaceId: string
  spaceRole: string
  space?: SpaceVO
  user?: UserVO
  createTime?: string
  updateTime?: string
}

export interface SpaceUserAddRequest {
  userId: string
  spaceId: string
  spaceRole?: string
}

export interface SpaceUserEditRequest {
  id: string
  spaceRole: string
}

export interface SpaceUserQueryRequest {
  current?: number
  pageSize?: number
  userId?: string
  spaceId?: string
  spaceRole?: string
}

// ========== 空间分析相关类型 ==========

export interface SpaceAnalyzeRequest {
  spaceId?: number | string
  queryPublic?: boolean
  queryAll?: boolean
}

export interface SpaceUsageAnalyzeResponse {
  usedSize: number
  maxSize: number | null
  sizeUsageRatio: number | null
  usedCount: number
  maxCount: number | null
  countUsageRatio: number | null
}

export interface SpaceCategoryAnalyzeResponse {
  category: string
  count: number
  totalSize: number
}

export interface SpaceTagAnalyzeResponse {
  tag: string
  count: number
}

export interface SpaceSizeAnalyzeResponse {
  sizeRange: string
  count: number
}

export interface SpaceUserAnalyzeRequest extends SpaceAnalyzeRequest {
  userId?: number | string
  timeDimension?: 'day' | 'week' | 'month'
}

export interface SpaceUserAnalyzeResponse {
  period: string
  count: number
}

export interface SpaceRankAnalyzeRequest {
  topN?: number
}

export interface SpaceRankVO {
  id: string
  spaceName: string
  userId: number | string
  totalSize: number
  maxSize: number
  maxCount: number
  totalCount: number
}

