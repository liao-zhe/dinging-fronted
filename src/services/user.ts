import { api } from '../utils/request'
import {
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

function syncCachedUser(data: Partial<UserProfile>): UserProfile {
  const cachedUser = getUser()
  const nextUser: AuthUser = {
    ...cachedUser,
    id: String(data.id || cachedUser?.id || 'default-user'),
    openid: data.openid || cachedUser?.openid || 'default-openid',
    nickname: data.nickname || cachedUser?.nickname,
    avatar_url: data.avatar_url || cachedUser?.avatar_url,
    phone: data.phone || cachedUser?.phone,
    role: data.role || cachedUser?.role || 'chef'
  }

  setUser(nextUser)
  return nextUser as UserProfile
}

export async function wxLogin(params: LoginParams) {
  return Promise.resolve({
    user: syncCachedUser({
      nickname: params.nickname,
      avatar_url: params.avatar,
      role: 'chef'
    })
  })
}

export function checkAuth() {
  const user = getUser()
  return Promise.resolve({
    userId: user?.id || 'default-user',
    openid: user?.openid || 'default-openid',
    role: user?.role || 'chef'
  })
}

export async function logout() {
  return Promise.resolve()
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
  return api.put<UserProfile>('/user/profile', data)
}
