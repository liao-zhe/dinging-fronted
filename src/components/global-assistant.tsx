import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { getCompatibleSystemInfoSync } from '../utils/system-info'

import './global-assistant.scss'

const PANEL_CLOSE_MS = 220
const GLOBAL_ASSISTANT_ENABLED = false

export function GlobalAssistant() {
  if (!GLOBAL_ASSISTANT_ENABLED) {
    return null
  }

  const systemInfo = getCompatibleSystemInfoSync()
  const assistantSafeLayout = useMemo(() => {
    const statusBarHeight = systemInfo.statusBarHeight || 20
    const isIOS = systemInfo.platform === 'ios'
    const defaultTopInset = statusBarHeight + 50

    try {
      let topInset = defaultTopInset

      if (isIOS) {
        const menuButton = Taro.getMenuButtonBoundingClientRect()

        if (menuButton && menuButton.bottom) {
          const gap = Math.max(menuButton.top - statusBarHeight, 8)
          topInset = menuButton.bottom + gap + 10
        }
      }

      return {
        panelStyle: { top: '0px', bottom: '0px' } as CSSProperties,
        headerStyle: {
          paddingTop: `${topInset}px`
        } as CSSProperties,
        bodyStyle: { top: `${topInset + 236}px` } as CSSProperties,
        dragMinY: topInset + 20
      }
    } catch {
      return {
        panelStyle: { top: '0px', bottom: '0px' } as CSSProperties,
        headerStyle: {
          paddingTop: `${defaultTopInset}px`
        } as CSSProperties,
        bodyStyle: { top: `${defaultTopInset + 236}px` } as CSSProperties,
        dragMinY: defaultTopInset + 20
      }
    }
  }, [systemInfo.platform, systemInfo.statusBarHeight])

  const [showAssistantPanel, setShowAssistantPanel] = useState(false)
  const [assistantPanelVisible, setAssistantPanelVisible] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarModalVisible, setAvatarModalVisible] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [assistantPos, setAssistantPos] = useState({
    x: 12,
    y: Math.max(
      assistantSafeLayout.dragMinY,
      Math.floor((systemInfo.windowHeight || 667) * 0.42)
    )
  })
  const [assistantSide, setAssistantSide] = useState<'left' | 'right'>('left')
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false
  })

  useEffect(() => {
    setAssistantPos(prev => ({
      ...prev,
      y: Math.max(prev.y, assistantSafeLayout.dragMinY)
    }))
  }, [assistantSafeLayout.dragMinY])

  const openAssistantPanel = () => {
    Taro.hideTabBar({ animation: false }).catch(() => {})
    setShowAssistantPanel(true)
    setTimeout(() => setAssistantPanelVisible(true), 20)
  }

  const closeAssistantPanel = () => {
    setAssistantPanelVisible(false)
    Taro.showTabBar({ animation: false }).catch(() => {})
    setTimeout(() => setShowAssistantPanel(false), PANEL_CLOSE_MS)
  }

  useEffect(() => {
    return () => {
      Taro.showTabBar({ animation: false }).catch(() => {})
    }
  }, [])

  const handleAssistantTouchStart = e => {
    const touch = e.touches[0]
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      originX: assistantPos.x,
      originY: assistantPos.y,
      moved: false
    }
  }

  const handleAssistantTouchMove = e => {
    const touch = e.touches[0]
    const deltaX = touch.clientX - dragRef.current.startX
    const deltaY = touch.clientY - dragRef.current.startY

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragRef.current.moved = true
    }

    const nextX = Math.min(
      Math.max(12, dragRef.current.originX + deltaX),
      (systemInfo.windowWidth || 375) - 56
    )
    const nextY = Math.min(
      Math.max(assistantSafeLayout.dragMinY, dragRef.current.originY + deltaY),
      (systemInfo.windowHeight || 667) - 180
    )

    setAssistantPos({ x: nextX, y: nextY })
  }

  const handleAssistantTouchEnd = () => {
    if (!dragRef.current.moved) {
      openAssistantPanel()
      return
    }

    const snapRight = assistantPos.x > (systemInfo.windowWidth || 375) / 2
    setAssistantSide(snapRight ? 'right' : 'left')
    setAssistantPos(prev => ({
      x: snapRight ? (systemInfo.windowWidth || 375) - 56 : 12,
      y: prev.y
    }))
  }

  const openAvatarModal = () => {
    setShowAvatarModal(true)
    setTimeout(() => setAvatarModalVisible(true), 20)
  }

  const closeAvatarModal = () => {
    setAvatarModalVisible(false)
    setTimeout(() => setShowAvatarModal(false), 220)
  }

  const handleChooseAvatar = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        setAvatarUrl(res.tempFilePaths[0] || '')
      }
    })
  }

  const handleSaveAvatar = () => {
    Taro.showToast({ title: '头像已更新', icon: 'success' })
    closeAvatarModal()
  }

  const AvatarVisual = ({ className, imageClassName, fallbackClassName, fallbackTextClassName }) =>
    avatarUrl ? (
      <Image className={imageClassName} src={avatarUrl} mode='aspectFill' />
    ) : (
      <View className={fallbackClassName}>
        <Text className={fallbackTextClassName}>AI</Text>
      </View>
    )

  return (
    <>
      <View
        className='global-assistant'
        style={{ left: `${assistantPos.x}px`, top: `${assistantPos.y}px` }}
        onTouchStart={handleAssistantTouchStart}
        onTouchMove={handleAssistantTouchMove}
        onTouchEnd={handleAssistantTouchEnd}
      >
        <View className='global-assistant__avatar'>
          <AvatarVisual
            className='global-assistant__avatar'
            imageClassName='global-assistant__avatar-img'
            fallbackClassName='global-assistant__avatar-fallback'
            fallbackTextClassName='global-assistant__avatar-text'
          />
        </View>
        <View className='global-assistant__dot' />
      </View>

      {showAssistantPanel ? (
        <View
          className={`assistant-mask ${assistantPanelVisible ? 'assistant-mask--show' : ''}`}
          onClick={closeAssistantPanel}
        >
          <View
            className={`assistant-panel assistant-panel--${assistantSide} ${assistantPanelVisible ? 'assistant-panel--open' : ''}`}
            style={assistantSafeLayout.panelStyle}
            onClick={e => e.stopPropagation()}
          >
            <View className='assistant-panel__header' style={assistantSafeLayout.headerStyle}>
              <View className='assistant-panel__profile'>
                <View className='assistant-panel__avatar' onClick={openAvatarModal}>
                  <AvatarVisual
                    className='assistant-panel__avatar'
                    imageClassName='assistant-panel__avatar-img'
                    fallbackClassName='assistant-panel__avatar-fallback'
                    fallbackTextClassName='assistant-panel__avatar-text'
                  />
                  <View className='assistant-panel__avatar-edit'>📷</View>
                </View>
                <View className='assistant-panel__heading'>
                  <Text className='assistant-panel__title'>AI私厨助手</Text>
                  <Text className='assistant-panel__subtitle'>随时为您提供帮助</Text>
                </View>
              </View>
              <Text className='assistant-panel__close' onClick={closeAssistantPanel}>
                ×
              </Text>
            </View>

            <View className='assistant-panel__body' style={assistantSafeLayout.bodyStyle}>
              <View className='assistant-message-row'>
                <View className='assistant-message-row__avatar'>
                  <AvatarVisual
                    className='assistant-message-row__avatar'
                    imageClassName='assistant-message-row__avatar-img'
                    fallbackClassName='assistant-message-row__avatar-fallback'
                    fallbackTextClassName='assistant-message-row__avatar-text'
                  />
                </View>
                <View className='assistant-message-group'>
                  <View className='assistant-message'>
                    <Text className='assistant-message__text'>
                      您好！我是您的家庭私厨助手，有什么可以帮您的吗？您可以问我关于菜品、营养搭配、烹饪建议等问题哦~
                    </Text>
                  </View>
                  <Text className='assistant-message__time'>14:45</Text>
                </View>
              </View>
            </View>

            <View className='assistant-panel__footer'>
              <View className='assistant-panel__input-wrap'>
                <Text className='assistant-panel__input-prefix'>问</Text>
                <Text className='assistant-panel__input'>输入您的问题...</Text>
              </View>
              <Text className='assistant-panel__send'>✈</Text>
            </View>
          </View>
        </View>
      ) : null}

      {showAvatarModal ? (
        <View
          className={`avatar-modal-mask ${avatarModalVisible ? 'avatar-modal-mask--show' : ''}`}
          onClick={closeAvatarModal}
        >
          <View
            className={`avatar-modal card ${avatarModalVisible ? 'avatar-modal--open' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <View className='avatar-modal__header'>
              <Text className='avatar-modal__title'>自定义AI助手头像</Text>
              <Text className='avatar-modal__close' onClick={closeAvatarModal}>×</Text>
            </View>

            <View className='avatar-modal__body'>
              <View className='avatar-modal__avatar-wrap' onClick={handleChooseAvatar}>
                <View className='avatar-modal__avatar-ring'>
                  <AvatarVisual
                    className='avatar-modal__avatar-ring'
                    imageClassName='avatar-modal__avatar-img'
                    fallbackClassName='avatar-modal__avatar-fallback'
                    fallbackTextClassName='avatar-modal__avatar-text'
                  />
                </View>
                <Text className='avatar-modal__avatar-hint'>点击头像上传新图片</Text>
              </View>
            </View>

            <View className='avatar-modal__footer'>
              <Text className='avatar-modal__btn avatar-modal__btn--cancel' onClick={closeAvatarModal}>取消</Text>
              <Text className='avatar-modal__btn avatar-modal__btn--save' onClick={handleSaveAvatar}>保存</Text>
            </View>
          </View>
        </View>
      ) : null}
    </>
  )
}
