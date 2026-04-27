import Taro from '@tarojs/taro'

import { ensureAuthorized } from './auth'
import { buildApiUrl } from './api'
import { clearToken, getToken } from './session'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

type HandledError = Error & {
  handled?: boolean
  statusCode?: number
  data?: unknown
}

function createHandledError(
  message: string,
  statusCode?: number,
  data?: unknown
): HandledError {
  const error = new Error(message) as HandledError
  error.handled = true
  error.statusCode = statusCode
  error.data = data
  return error
}

function isHandledError(error: unknown): error is HandledError {
  return error instanceof Error && Boolean((error as HandledError).handled)
}

function isAuthRequest(url: string): boolean {
  return url.startsWith('/auth/')
}

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

export async function request<T = any>(
  options: RequestOptions,
  allowAuthRetry = true
): Promise<T> {
  const { url, method = 'GET', data, header = {} } = options
  const token = getToken()
  const requestHeader: Record<string, string> = { ...header }

  if (token) {
    requestHeader.Authorization = `Bearer ${token}`
  }

  try {
    const res = await Taro.request({
      url: buildApiUrl(url),
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...requestHeader
      }
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.data as T
    }

    if (res.statusCode === 401) {
      clearToken()

      if (allowAuthRetry && !isAuthRequest(url)) {
        try {
          await ensureAuthorized(true)
          return request<T>(options, false)
        } catch (authError) {
          console.error('Auth recovery failed:', authError)
          Taro.showToast({ title: '身份校验已失效', icon: 'none' })
          throw createHandledError('AUTH_REQUIRED', 401, res.data)
        }
      }

      Taro.showToast({ title: '身份校验失败', icon: 'none' })
      throw createHandledError('AUTH_REQUIRED', 401, res.data)
    }

    const errorMsg = getErrorMessage(res.data, '请求失败')

    if (res.statusCode !== 403) {
      Taro.showToast({ title: errorMsg, icon: 'none' })
    }

    throw createHandledError(errorMsg, res.statusCode, res.data)
  } catch (error) {
    if (!isHandledError(error)) {
      Taro.showToast({ title: '网络异常', icon: 'none' })
    }

    throw error
  }
}

export const api = {
  get: <T = any>(url: string, data?: any) =>
    request<T>({ url, method: 'GET', data }),
  post: <T = any>(url: string, data?: any) =>
    request<T>({ url, method: 'POST', data }),
  put: <T = any>(url: string, data?: any) =>
    request<T>({ url, method: 'PUT', data }),
  delete: <T = any>(url: string, data?: any) =>
    request<T>({ url, method: 'DELETE', data })
}
