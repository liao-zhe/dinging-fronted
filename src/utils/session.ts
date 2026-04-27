import Taro from '@tarojs/taro'

const USER_KEY = 'auth_user'

export type UserRole = 'chef' | 'customer'

export interface AuthUser {
  id: string
  openid?: string
  nickname?: string
  avatar_url?: string
  phone?: string
  role: UserRole
}

const DEFAULT_USER: AuthUser = {
  id: 'default-user',
  openid: 'default-openid',
  nickname: 'Default User',
  role: 'chef'
}

export function getUser(): AuthUser | null {
  return Taro.getStorageSync(USER_KEY) || DEFAULT_USER
}

export function setUser(user: AuthUser): void {
  Taro.setStorageSync(USER_KEY, user)
}

export function getUserRole(): UserRole | null {
  return getUser()?.role || DEFAULT_USER.role
}

export function clearToken(): void {
  Taro.removeStorageSync(USER_KEY)
}
