import http from './http'
import type {
  BaseResponse,
  PageResult,
  PictureQueryRequest,
  PictureReviewRequest,
  PictureUpdateRequest,
  PictureTagCategory,
  PictureVO,
} from '../types/api'

export const pictureApi = {
  listPublic: async (data: PictureQueryRequest) => {
    // 确保 pageSize 不超过 20，符合后端限制
    const requestData = { ...data, pageSize: Math.min(data.pageSize || 20, 20) }
    const res = await http.post<BaseResponse<PageResult<PictureVO>>>('/picture/list/page/vo', requestData)
    return res.data.data
  },
  listPictureByPage: async (data: PictureQueryRequest) => {
    // 确保 pageSize 不超过 20，符合后端限制
    const requestData = { ...data, pageSize: Math.min(data.pageSize || 100, 20) }
    const res = await http.post<BaseResponse<PageResult<PictureVO>>>('/picture/list/page/vo', requestData)
    return res.data.data
  },
  listPictureByPageAdmin: async (data: PictureQueryRequest) => {
    // 管理员接口，使用 /list/page 获取完整数据（包含审核状态）
    const requestData = { ...data, pageSize: Math.min(data.pageSize || 100, 20) }
    const res = await http.post<BaseResponse<PageResult<PictureVO>>>('/picture/list/page', requestData)
    return res.data.data
  },
  getTagCategory: async () => {
    const res = await http.get<BaseResponse<PictureTagCategory>>('/picture/tag_category')
    return res.data.data
  },
  getVoById: async (id: number | string) => {
    const res = await http.get<BaseResponse<PictureVO>>('/picture/get/vo', { params: { id } })
    return res.data.data
  },
  uploadByFile: async (file: File, data?: { id?: number | string; picName?: string; introduction?: string; category?: string; tags?: string[]; spaceId?: number | string }) => {
    const formData = new FormData()
    
    // 1. 追加文件
    formData.append('file', file)
    
    // 2. 将其他参数作为独立的 form-data 字段添加（和 Swagger 文档一致）
    if (data?.id) {
      formData.append('id', String(data.id))
    }
    if (data?.picName) {
      formData.append('picName', data.picName)
    }
    if (data?.introduction) {
      formData.append('introduction', data.introduction)
    }
    if (data?.category) {
      formData.append('category', data.category)
    }
    if (data?.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags))
    }
    if (data?.spaceId) {
      formData.append('spaceId', String(data.spaceId))
    }
    
    // 3. 调试日志
    console.log('[Picture API] uploadByFile 调用:')
    console.log('  - 输入参数 data:', data)
    console.log('  - FormData 包含的字段:')
    console.log('    - file:', file.name, file.size, 'bytes')
    console.log('    - picName:', data?.picName)
    console.log('    - id:', data?.id)
    console.log('    - introduction:', data?.introduction)
    console.log('    - category:', data?.category)
    console.log('    - tags:', data?.tags)
    console.log('    - spaceId:', data?.spaceId)
    
    // 4. 发送请求
    const res = await http.post<BaseResponse<PictureVO>>('/picture/upload', formData)
    console.log('[Picture API] 上传结果:', res.data)
    return res.data.data
  },
  upload: async (data: { 
    file: File
    spaceId?: number | string
    id?: number | string
    picName?: string
    introduction?: string
    category?: string
    tags?: string[]
  }) => {
    const formData = new FormData()
    
    // 1. 追加文件
    formData.append('file', data.file)
    
    // 2. 将其他参数作为独立的 form-data 字段添加（和 Swagger 文档一致）
    if (data.id) {
      formData.append('id', String(data.id))
    }
    if (data.picName) {
      formData.append('picName', data.picName)
    }
    if (data.introduction) {
      formData.append('introduction', data.introduction)
    }
    if (data.category) {
      formData.append('category', data.category)
    }
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags))
    }
    if (data.spaceId) {
      formData.append('spaceId', String(data.spaceId))
    }
    
    // 3. 调试日志
    console.log('[Picture API] upload 调用:')
    console.log('  - 输入参数:', data)
    console.log('  - FormData 包含的字段:')
    console.log('    - file:', data.file.name, data.file.size, 'bytes')
    console.log('    - picName:', data.picName)
    console.log('    - id:', data.id)
    console.log('    - spaceId:', data.spaceId)
    
    // 4. 发送请求
    const res = await http.post<BaseResponse<PictureVO>>('/picture/upload', formData)
    
    console.log('[Picture API] 上传结果:', res.data)
    return res.data.data
  },
  uploadByUrl: async (data: { fileUrl: string; id?: number | string; name?: string; introduction?: string; category?: string; tags?: string[] }) => {
    const requestData = {
      fileUrl: data.fileUrl,
      id: data.id || undefined,
      picName: data.name,
      introduction: data.introduction,
      category: data.category,
      tags: data.tags ? JSON.stringify(data.tags) : undefined
    }
    const res = await http.post<BaseResponse<PictureVO>>('/picture/upload/url', requestData)
    return res.data.data
  },
  review: async (data: PictureReviewRequest) => {
    const res = await http.post<BaseResponse<boolean>>('/picture/review', data)
    return res.data.data
  },
  delete: async (id: number | string) => {
    const res = await http.post<BaseResponse<boolean>>('/picture/delete', { id })
    return res.data.data
  },
  edit: async (data: { id: number | string; name?: string; introduction?: string; category?: string; tags?: string[] }) => {
    const res = await http.post<BaseResponse<boolean>>('/picture/edit', data)
    return res.data.data
  },
  update: async (data: PictureUpdateRequest) => {
    const res = await http.post<BaseResponse<boolean>>('/picture/update', data)
    return res.data.data
  },
  uploadByBatch: async (data: { searchText: string; count?: number; namePrefix?: string }) => {
    const res = await http.post<BaseResponse<number>>('/picture/upload/batch', data)
    return res.data.data
  },
  download: async (pictureId: number | string) => {
    const response = await http.get('/picture/download', {
      params: { pictureId },
      responseType: 'blob'
    })
    return response.data
  },
  searchByColor: async (picColor: string, spaceId?: string) => {
    const res = await http.post<BaseResponse<PictureVO[]>>('/picture/search/color', {
      picColor,
      spaceId: spaceId || undefined,
    })
    return res.data.data
  },


  searchByPicture: async (data: { pictureId: number | string }) => {
    console.log('[Picture API] 以图搜图参数:', data)
    
    const res = await http.post<BaseResponse<any[]>>('/picture/search/picture', data)
    
    console.log('[Picture API] 以图搜图结果:', res.data)
    return res.data.data
  },
  createOutPaintingTask: async (data: { 
    pictureId: number | string
    parameters: {
      // 扩图参数
      angle?: number
      outputRatio?: string
      xScale?: number
      yScale?: number
      topOffset?: number
      bottomOffset?: number
      leftOffset?: number
      rightOffset?: number
      // 质量参数
      bestQuality?: boolean
      limitImageSize?: boolean
      addWatermark?: boolean
    }
  }) => {
    console.log('[Picture API] 创建扩图任务参数:', data)
    
    const res = await http.post<BaseResponse<any>>('/picture/out_painting/create_task', data)
    
    console.log('[Picture API] 创建扩图任务结果:', res.data)
    return res.data.data
  },
  getOutPaintingTask: async (taskId: string) => {
    console.log('[Picture API] 查询扩图任务参数:', { taskId })
    
    // 使用 URL 查询参数方式，确保参数名与后端方法参数名一致
    const res = await http.get<BaseResponse<any>>(
      `/picture/out_painting/get_task?taskId=${encodeURIComponent(taskId)}`
    )
    
    console.log('[Picture API] 查询扩图任务结果:', res.data)
    return res.data.data
  },
}

