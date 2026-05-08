import http from './http'
import type {
  BaseResponse,
  LoginUserVO,
  PageResult,
  UserLoginRequest,
  UserQueryRequest,
  UserRegisterRequest,
  UserVO,
  UserAddRequest,
  UserUpdateRequest,
} from '../types/api'

export const userApi = {
  register: async (data: UserRegisterRequest) => {
    const res = await http.post<BaseResponse<number>>('/user/register', data)
    return res.data.data
  },
  login: async (data: UserLoginRequest) => {
    const res = await http.post<BaseResponse<LoginUserVO>>('/user/login', data)
    return res.data.data
  },
  logout: async () => {
    const res = await http.post<BaseResponse<boolean>>('/user/logout')
    return res.data.data
  },
  current: async () => {
    const res = await http.get<BaseResponse<LoginUserVO>>('/user')
    return res.data.data
  },
  list: async (data: UserQueryRequest) => {
    const res = await http.post<BaseResponse<PageResult<UserVO>>>('/user/list/page/vo', data)
    return res.data.data
  },
  add: async (data: UserAddRequest) => {
    const res = await http.post<BaseResponse<number>>('/user/add', data)
    return res.data.data
  },
  update: async (data: UserUpdateRequest) => {
    const res = await http.post<BaseResponse<boolean>>('/user/update', data)
    return res.data.data
  },
  delete: async (id: number | string) => {
    const res = await http.post<BaseResponse<boolean>>('/user/delete', { id })
    return res.data.data
  },
  getUserVOById: async (id: string) => {
    const res = await http.get<BaseResponse<UserVO>>('/user/get/vo', { params: { id } })
    return res.data.data
  },
}

