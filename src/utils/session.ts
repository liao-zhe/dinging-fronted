import Taro from '@tarojs/taro'

const TOKEN_KEY = 'auth_token'
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

export function getToken(): string | null {
  return Taro.getStorageSync(TOKEN_KEY) || null
}

export function setToken(token: string): void {
  Taro.setStorageSync(TOKEN_KEY, token)
}

export function getUser(): AuthUser | null {
  return Taro.getStorageSync(USER_KEY) || null
}

export function setUser(user: AuthUser): void {
  Taro.setStorageSync(USER_KEY, user)
}

export function getUserRole(): UserRole | null {
  return getUser()?.role || null
}

export function clearToken(): void {
  Taro.removeStorageSync(TOKEN_KEY)
  Taro.removeStorageSync(USER_KEY)
}
