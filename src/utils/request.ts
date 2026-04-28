import Taro from '@tarojs/taro'

import { buildApiUrl } from './api'
import { clearSession, getToken } from './session'

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

let isRedirectingToLogin = false

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

function getCurrentRoute(): string {
  const pages = Taro.getCurrentPages()
  const currentPage = pages[pages.length - 1]
  return currentPage?.route ? `/${currentPage.route}` : '/pages/home/index'
}

function redirectToLogin() {
  const currentRoute = getCurrentRoute()

  if (currentRoute === '/pages/login/index' || isRedirectingToLogin) {
    return
  }

  isRedirectingToLogin = true
  const redirect = encodeURIComponent(currentRoute)

  void Taro.navigateTo({
    url: `/pages/login/index?redirect=${redirect}`
  }).finally(() => {
    isRedirectingToLogin = false
  })
}

export async function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, header = {} } = options
  const token = getToken()

  try {
    const res = await Taro.request({
      url: buildApiUrl(url),
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...header
      }
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.data as T
    }

    const errorMsg = getErrorMessage(res.data, '请求失败')

    if (res.statusCode === 401) {
      clearSession()
      redirectToLogin()
    } else if (res.statusCode !== 403) {
      Taro.showToast({ title: errorMsg, icon: 'none' })
    }

    throw createHandledError(errorMsg, res.statusCode, res.data)
  } catch (error) {
    if (!isHandledError(error)) {
      Taro.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
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
