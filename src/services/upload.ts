import Taro from '@tarojs/taro'

import { buildApiUrl } from '../utils/api'

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

export async function uploadImage(filePath: string): Promise<UploadedImage> {
  const res = await Taro.uploadFile({
    url: buildApiUrl('/upload/image'),
    filePath,
    name: 'file'
  })

  const parsed = parseUploadResponse(res.data)

  if (res.statusCode >= 200 && res.statusCode < 300 && parsed?.data?.url) {
    return parsed.data
  }

  throw new Error(getUploadErrorMessage(parsed, '鍥剧墖涓婁紶澶辫触'))
}
