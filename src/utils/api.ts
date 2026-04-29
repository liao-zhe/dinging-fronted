// export const BASE_URL = 'https://lzljz.top/api'
export const BASE_URL = 'http://localhost:3000/api'

export function buildApiUrl(path: string): string {
  return `${BASE_URL}${path}`
}
