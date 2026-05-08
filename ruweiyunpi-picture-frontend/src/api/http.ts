import axios from 'axios'
import type { BaseResponse } from '../types/api'

const TOKEN_KEY = 'satoken'

export class ApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
    this.name = 'ApiError'
  }
}

const transformBigInt = (data: string): string => {
  return data.replace(/"(\w*[iI]d)"\s*:\s*(\d{16,})/g, '"$1":"$2"')
}

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 60000,
  transformResponse: [(data) => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(transformBigInt(data))
      } catch {
        return data
      }
    }
    return data
  }],
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers[TOKEN_KEY] = token
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data as BaseResponse<unknown>
    if (typeof body?.code === 'number' && body.code !== 0) {
      return Promise.reject(new ApiError(body.code, body.message || '接口调用失败'))
    }
    return response
  },
  (error) => Promise.reject(error),
)

export default http
