import { loginWithCode } from '../utils/auth'
import { api } from '../utils/request'
import {
  clearToken,
  getUser,
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
  code: string
  nickname?: string
  avatar?: string
}

function syncCachedUser(data: AuthCheckResult): void {
  const cachedUser = getUser()
  const nextUser: AuthUser = {
    ...cachedUser,
    id: String(data.userId),
    openid: data.openid,
    role: data.role
  }

  setUser(nextUser)
}

export async function wxLogin(params: LoginParams) {
  return loginWithCode<UserProfile>(params.code, {
    userInfo: {
      nickname: params.nickname,
      avatar_url: params.avatar
    }
  })
}

export function checkAuth() {
  return api
    .get<{ code: number; data: AuthCheckResult; message: string }>('/auth/check')
    .then((res) => {
      syncCachedUser(res.data)
      return res.data
    })
}

export async function logout() {
  await api.post<void>('/auth/logout')
  clearToken()
}

export function getUserProfile() {
  return api.get<UserProfile>('/user/profile')
}

export function updateUserProfile(data: Partial<UserProfile>) {
  return api.put<UserProfile>('/user/profile', data)
}
