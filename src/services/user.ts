import Taro from '@tarojs/taro'
import { api } from '../utils/request'
import {
  clearSession,
  getUser,
  setToken,
  setUser,
  type AuthUser,
  type UserRole
} from '../utils/session'

export interface UserProfile {
  id: string
  openid: string
  nickname: string
  avatar_url: string
  phone: string
  role: UserRole
  created_at?: string
}

export interface AuthCheckResult {
  userId: string
  openid: string
  role: UserRole
}

export interface LoginParams {
  code?: string
  nickname?: string
  avatar?: string
  phone?: string
}

export interface ChefLoginParams {
  username: string
  password: string
}

export interface ChangePasswordParams {
  currentPassword: string
  newPassword: string
}

interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: string
  user: UserProfile
}

function syncCachedUser(data: Partial<UserProfile>): UserProfile {
  const cachedUser = getUser()
  const nextUser: AuthUser = {
    ...cachedUser,
    id: String(data.id || cachedUser?.id || ''),
    openid: data.openid || cachedUser?.openid || '',
    nickname: data.nickname || cachedUser?.nickname,
    avatar_url: data.avatar_url || cachedUser?.avatar_url,
    phone: data.phone || cachedUser?.phone,
    role: data.role || cachedUser?.role || 'customer'
  }

  setUser(nextUser)
  return nextUser as UserProfile
}

export async function wxLogin(params: LoginParams = {}) {
  const loginResult = params.code
    ? { code: params.code }
    : await Taro.login()

  console.log('wx.login result:', loginResult)

  if (!loginResult.code) {
    throw new Error('微信登录失败，未获取到 code')
  }

  const res = await api.post<{ code: number; data: LoginResponse; message: string }>(
    '/auth/wx-login',
    {
      code: loginResult.code,
      nickname: params.nickname,
      avatar_url: params.avatar,
      phone: params.phone
    }
  )

  setToken(res.data.accessToken)
  const user = syncCachedUser(res.data.user)

  return {
    token: res.data.accessToken,
    user
  }
}

export async function chefLogin(params: ChefLoginParams) {
  const res = await api.post<{ code: number; data: LoginResponse; message: string }>(
    '/auth/chef-login',
    params
  )

  setToken(res.data.accessToken)
  const user = syncCachedUser(res.data.user)

  return {
    token: res.data.accessToken,
    user
  }
}

export function checkAuth() {
  return api
    .get<{ code: number; data: AuthCheckResult; message: string }>('/auth/check')
    .then((res) => {
      const cachedUser = getUser()
      if (cachedUser) {
        setUser({
          ...cachedUser,
          role: res.data.role
        })
      }

      return res.data
    })
}

export async function logout() {
  try {
    await api.post<{ code: number; data: null; message: string }>('/auth/logout')
  } finally {
    clearSession()
  }
}

export function changePassword(params: ChangePasswordParams) {
  return api.post<{ code: number; data: null; message: string }>(
    '/auth/change-password',
    params
  )
}

export function getUserProfile() {
  return api
    .get<{ code: number; data: UserProfile; message: string }>('/user/profile')
    .then((res) => {
      syncCachedUser(res.data)
      return res.data
    })
}

export function updateUserProfile(data: Partial<UserProfile>) {
  return api
    .put<{ code: number; data: UserProfile; message: string }>('/user/profile', data)
    .then((res) => {
      syncCachedUser(res.data)
      return res.data
    })
}

