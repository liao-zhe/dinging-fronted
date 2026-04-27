import Taro from '@tarojs/taro'

type CompatibleSystemInfo = Partial<WechatMiniprogram.SystemInfo> &
  Partial<WechatMiniprogram.WindowInfo> &
  Partial<WechatMiniprogram.DeviceInfo> &
  Partial<WechatMiniprogram.AppBaseInfo> &
  Partial<WechatMiniprogram.SystemSetting> &
  Partial<WechatMiniprogram.AppAuthorizeSetting>

function getWx() {
  if (typeof wx === 'undefined') return null
  return wx
}

export function getCompatibleSystemInfoSync(): CompatibleSystemInfo {
  const miniapp = getWx()

  if (!miniapp) return {}

  const windowInfo = typeof miniapp.getWindowInfo === 'function' ? miniapp.getWindowInfo() : {}
  const deviceInfo = typeof miniapp.getDeviceInfo === 'function' ? miniapp.getDeviceInfo() : {}
  const appBaseInfo = typeof miniapp.getAppBaseInfo === 'function' ? miniapp.getAppBaseInfo() : {}
  const systemSetting = typeof miniapp.getSystemSetting === 'function' ? miniapp.getSystemSetting() : {}
  const appAuthorizeSetting =
    typeof miniapp.getAppAuthorizeSetting === 'function' ? miniapp.getAppAuthorizeSetting() : {}

  return {
    ...appAuthorizeSetting,
    ...systemSetting,
    ...appBaseInfo,
    ...deviceInfo,
    ...windowInfo
  }
}

export function patchDeprecatedSystemInfoApis() {
  const compatibleGetSystemInfoSync = () => getCompatibleSystemInfoSync()
  const miniapp = getWx()

  if (miniapp) {
    ;(miniapp as typeof wx & {
      getSystemInfoSync?: typeof compatibleGetSystemInfoSync
    }).getSystemInfoSync = compatibleGetSystemInfoSync
  }

  ;(Taro as typeof Taro & {
    getSystemInfoSync?: typeof compatibleGetSystemInfoSync
  }).getSystemInfoSync = compatibleGetSystemInfoSync
}
