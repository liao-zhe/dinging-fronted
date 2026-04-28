import Taro from '@tarojs/taro'

const USER_KEY = 'auth_user'
const TOKEN_KEY = 'auth_token'

export type UserRole = 'chef' | 'customer'

export interface AuthUser {
  id: string
  openid?: string
  nickname?: string
  avatar_url?: string
  phone?: string
  role: UserRole
}

export function getUser(): AuthUser | null {
  return Taro.getStorageSync(USER_KEY) || null
}

export function setUser(user: AuthUser): void {
  Taro.setStorageSync(USER_KEY, user)
}

export function getToken(): string {
  return Taro.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token: string): void {
  Taro.setStorageSync(TOKEN_KEY, token)
}

export function hasToken(): boolean {
  return Boolean(getToken())
}

export function getUserRole(): UserRole | null {
  return getUser()?.role || null
}

export function clearSession(): void {
  Taro.removeStorageSync(USER_KEY)
  Taro.removeStorageSync(TOKEN_KEY)
}
