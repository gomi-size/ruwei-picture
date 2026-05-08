import http from './http'
import type {
  BaseResponse,
  PageResult,
  SpaceVO,
  SpaceLevel,
  SpaceUserVO,
  SpaceUserAddRequest,
  SpaceUserEditRequest,
  SpaceUserQueryRequest,
} from '../types/api'

export interface SpaceAddRequest {
  spaceName?: string
  spaceLevel?: number
  spaceType?: number
}

export interface SpaceEditRequest {
  id: number | string
  spaceName?: string
  spaceType?: number
}

export interface SpaceUpdateRequest {
  id: number | string
  spaceName?: string
  spaceLevel?: number
  spaceType?: number
  maxSize?: number
  maxCount?: number
}

export interface SpaceQueryRequest {
  current: number
  pageSize: number
  id?: number | string
  userId?: number | string
  spaceName?: string
  spaceLevel?: number
  spaceType?: number
}

export const spaceApi = {
  /**
   * 添加空间
   */
  add: async (data: SpaceAddRequest) => {
    const res = await http.post<BaseResponse<number>>('/space/add', data)
    return res.data.data
  },

  /**
   * 删除空间
   */
  delete: async (id: number | string) => {
    const res = await http.post<BaseResponse<boolean>>('/space/delete', { id })
    return res.data.data
  },

  /**
   * 更新空间（管理员）
   */
  update: async (data: SpaceUpdateRequest) => {
    const res = await http.post<BaseResponse<boolean>>('/space/update', data)
    return res.data.data
  },

  /**
   * 编辑空间
   */
  edit: async (data: SpaceEditRequest) => {
    const res = await http.post<BaseResponse<boolean>>('/space/edit', data)
    return res.data.data
  },

  /**
   * 分页查询空间（管理员）
   */
  listByPage: async (data: SpaceQueryRequest) => {
    const res = await http.post<BaseResponse<PageResult<SpaceVO>>>('/space/list/page', data)
    return res.data.data
  },

  /**
   * 分页查询空间（脱敏）
   */
  listByPageVO: async (data: SpaceQueryRequest) => {
    const res = await http.post<BaseResponse<PageResult<SpaceVO>>>('/space/list/page/vo', data)
    return res.data.data
  },

  /**
   * 根据 ID 获取空间
   */
  getById: async (id: number | string) => {
    const res = await http.get<BaseResponse<SpaceVO>>(`/space/get/vo?id=${id}`)
    return res.data.data
  },

  /**
   * 获取空间级别列表
   */
  listLevel: async () => {
    const res = await http.get<BaseResponse<SpaceLevel[]>>('/space/list/level')
    return res.data.data
  },
}

export const spaceUserApi = {
  /**
   * 添加成员到空间
   */
  add: async (data: SpaceUserAddRequest) => {
    const res = await http.post<BaseResponse<number>>('/spaceUser/add', data)
    return res.data.data
  },

  /**
   * 从空间移除成员
   */
  delete: async (id: string) => {
    const res = await http.post<BaseResponse<boolean>>('/spaceUser/delete', { id })
    return res.data.data
  },

  /**
   * 编辑空间成员信息（主要是编辑成员在空间中的角色）
   */
  edit: async (data: SpaceUserEditRequest) => {
    const res = await http.post<BaseResponse<boolean>>('/spaceUser/edit', data)
    return res.data.data
  },

  /**
   * 获取空间成员列表
   */
  list: async (data: SpaceUserQueryRequest) => {
    const res = await http.post<BaseResponse<SpaceUserVO[]>>('/spaceUser/list', data)
    return res.data.data
  },

  /**
   * 查询我加入的团队空间列表
   */
  listMyTeamSpaceUser: async () => {
    const res = await http.post<BaseResponse<SpaceUserVO[]>>('/spaceUser/list/my')
    return res.data.data
  },
}

import type {
  SpaceAnalyzeRequest,
  SpaceUsageAnalyzeResponse,
  SpaceCategoryAnalyzeResponse,
  SpaceTagAnalyzeResponse,
  SpaceSizeAnalyzeResponse,
  SpaceUserAnalyzeRequest,
  SpaceUserAnalyzeResponse,
  SpaceRankAnalyzeRequest,
  SpaceRankVO,
} from '../types/api'

export const spaceAnalyzeApi = {
  /**
   * 空间资源使用分析
   */
  getUsage: async (data: SpaceAnalyzeRequest) => {
    const res = await http.post<BaseResponse<SpaceUsageAnalyzeResponse>>('/space/analyze/usage', data)
    return res.data.data
  },

  /**
   * 空间图片分类分析
   */
  getCategory: async (data: SpaceAnalyzeRequest) => {
    const res = await http.post<BaseResponse<SpaceCategoryAnalyzeResponse[]>>('/space/analyze/category', data)
    return res.data.data
  },

  /**
   * 空间图片标签分析
   */
  getTags: async (data: SpaceAnalyzeRequest) => {
    const res = await http.post<BaseResponse<SpaceTagAnalyzeResponse[]>>('/space/analyze/tags', data)
    return res.data.data
  },

  /**
   * 空间图片大小分析
   */
  getSize: async (data: SpaceAnalyzeRequest) => {
    const res = await http.post<BaseResponse<SpaceSizeAnalyzeResponse[]>>('/space/analyze/size', data)
    return res.data.data
  },

  /**
   * 用户上传行为分析
   */
  getUser: async (data: SpaceUserAnalyzeRequest) => {
    const res = await http.post<BaseResponse<SpaceUserAnalyzeResponse[]>>('/space/analyze/user', data)
    return res.data.data
  },

  /**
   * 空间使用排行分析（仅管理员）
   */
  getRank: async (data: SpaceRankAnalyzeRequest) => {
    const res = await http.post<BaseResponse<SpaceRankVO[]>>('/space/analyze/rank', data)
    return res.data.data
  },
}
