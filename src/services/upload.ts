import Taro from '@tarojs/taro'

import { ensureAuthorized } from '../utils/auth'
import { buildApiUrl } from '../utils/api'
import { clearToken } from '../utils/session'

interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

export interface UploadedImage {
  bucket: string
  objectKey: string
  url: string
}

function parseUploadResponse(data: unknown): ApiResponse<UploadedImage> {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as ApiResponse<UploadedImage>
    } catch {
      return {
        code: -1,
        data: {} as UploadedImage,
        message: ''
      }
    }
  }

  return data as ApiResponse<UploadedImage>
}

function getUploadErrorMessage(data: unknown, fallback: string): string {
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

export async function uploadImage(filePath: string, allowRetry = true): Promise<UploadedImage> {
  const token = await ensureAuthorized(false)

  const res = await Taro.uploadFile({
    url: buildApiUrl('/upload/image'),
    filePath,
    name: 'file',
    header: {
      Authorization: `Bearer ${token}`
    }
  })

  const parsed = parseUploadResponse(res.data)

  if (res.statusCode >= 200 && res.statusCode < 300 && parsed?.data?.url) {
    return parsed.data
  }

  if (res.statusCode === 401 && allowRetry) {
    clearToken()
    await ensureAuthorized(true)
    return uploadImage(filePath, false)
  }

  throw new Error(getUploadErrorMessage(parsed, '图片上传失败'))
}
