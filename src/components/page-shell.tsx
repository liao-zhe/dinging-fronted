import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { CSSProperties, PropsWithChildren } from 'react'
import { useMemo } from 'react'


type PageShellProps = PropsWithChildren<{
  title: string
  subtitle?: string
  compact?: boolean
}>

export function PageShell({
  title,
  subtitle,
  compact,
  children
}: PageShellProps) {
  const headerStyle = useMemo<CSSProperties>(() => {
    const windowInfo = Taro.getWindowInfo()
    const menuButton = Taro.getMenuButtonBoundingClientRect()
    const statusBarHeight = windowInfo.statusBarHeight || 20
    const gap = Math.max(menuButton.top - statusBarHeight, 8)
    const top = statusBarHeight + gap
    const bottom = compact ? 36 : 44

    return {
      paddingTop: `${top}px`,
      paddingBottom: `${bottom}px`,
      minHeight: `${menuButton.bottom + gap}px`
    }
  }, [compact])

  return (
    <View className="page-shell">
      <View
        className={`page-header ${compact ? 'page-header--compact' : ''}`}
        style={headerStyle}
      >
        <Text className="page-title">{title}</Text>
        {subtitle ? <Text className="page-subtitle">{subtitle}</Text> : null}
      </View>
      <View className="page-body">{children}</View>
    </View>
  )
}
