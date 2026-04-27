import Taro from '@tarojs/taro'

import { buildApiUrl } from './api'
import {
  clearToken,
  getToken,
  getUser,
  setToken,
  setUser,
  type AuthUser,
  type UserRole
} from './session'

export interface LoginResponse<TUser = unknown> {
  token: string
  user: TUser
}

interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

interface AuthCheckResponse {
  userId: string
  openid: string
  role: UserRole
}

type LoginUserPayload = Partial<AuthUser> & {
  id?: string | number
  role?: UserRole
}

let authPromise: Promise<LoginResponse<unknown>> | null = null

function getErrorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof (data as { message?: unknown }).message === 'string'
  ) {
    return (data as { message: string }).message
  }

  return fallback
}

function normalizeRole(role: unknown): UserRole | null {
  return role === 'chef' || role === 'customer' ? role : null
}

function saveLoginUser(user: unknown): void {
  if (!user || typeof user !== 'object') {
    return
  }

  const payload = user as LoginUserPayload
  const role = normalizeRole(payload.role)
  const id = payload.id

  if (!role || id === undefined || id === null) {
    return
  }

  setUser({
    id: String(id),
    openid: payload.openid,
    nickname: payload.nickname,
    avatar_url: payload.avatar_url,
    phone: payload.phone,
    role
  })
}

async function requestLoginCode(): Promise<string> {
  const result = await Taro.login()

  if (!result.code) {
    throw new Error('WECHAT_LOGIN_FAILED')
  }

  return result.code
}

async function checkAuthWithToken(token: string): Promise<AuthCheckResponse> {
  const res = await Taro.request<ApiResponse<AuthCheckResponse>>({
    url: buildApiUrl('/auth/check'),
    method: 'GET',
    header: {
      Authorization: `Bearer ${token}`
    }
  })

  if (res.statusCode < 200 || res.statusCode >= 300 || !res.data?.data) {
    throw new Error(getErrorMessage(res.data, 'AUTH_CHECK_FAILED'))
  }

  return res.data.data
}

export async function loginWithCode<TUser = unknown>(
  code: string,
  payload: Record<string, unknown> = {}
): Promise<LoginResponse<TUser>> {
  const res = await Taro.request<ApiResponse<LoginResponse<TUser>>>({
    url: buildApiUrl('/auth/login'),
    method: 'POST',
    data: {
      code,
      ...payload
    },
    header: {
      'Content-Type': 'application/json'
    }
  })

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(getErrorMessage(res.data, 'LOGIN_FAILED'))
  }

  const data = res.data?.data

  if (!data?.token) {
    throw new Error('TOKEN_MISSING')
  }

  setToken(data.token)
  saveLoginUser(data.user)

  return data
}

export async function ensureAuthorized(forceRefresh = false): Promise<string> {
  const token = getToken()

  if (token && !forceRefresh) {
    return token
  }

  if (authPromise) {
    const current = await authPromise
    return current.token
  }

  if (forceRefresh) {
    clearToken()
  }

  authPromise = (async () => {
    const code = await requestLoginCode()
    return loginWithCode(code)
  })().finally(() => {
    authPromise = null
  })

  const authResult = await authPromise
  return authResult.token
}

export async function syncAuthUser(): Promise<AuthUser | null> {
  const token = getToken()

  if (!token) {
    return getUser()
  }

  try {
    const result = await checkAuthWithToken(token)
    const nextUser: AuthUser = {
      id: String(result.userId),
      openid: result.openid,
      role: result.role
    }
    const cachedUser = getUser()

    setUser({
      ...cachedUser,
      ...nextUser
    })

    return getUser()
  } catch (error) {
    console.error('Auth check failed:', error)
    return getUser()
  }
}

export async function initializeAuth(): Promise<void> {
  try {
    const token = await ensureAuthorized(false)
    await syncAuthUser()

    if (!token) {
      throw new Error('AUTH_INIT_FAILED')
    }
  } catch (error) {
    console.error('Silent auth failed:', error)
  }
}
