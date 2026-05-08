import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'

import DishCard from './DishCard'
import { buildApiUrl } from '../utils/api'
import { getToken } from '../utils/session'
import { getCompatibleSystemInfoSync } from '../utils/system-info'
import {
  deleteSession,
  getSessionMessages,
  getSessions
} from '../services/ai'

import './global-assistant.scss'

interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  dishes?: any[]
}

interface AssistantSession {
  id: string
  title: string
  message_count: number
  last_message_at: string
}

const BALL_SIZE = 56
const EDGE_GAP = 12
const CLOSE_MS = 240
const WELCOME_MESSAGE: AssistantMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '你好，我是小厨。想吃什么、几个人用餐、偏清淡还是重口，都可以直接问我。'
}
const QUICK_QUESTIONS = [
  '推荐今天的菜',
  '4个人聚餐吃什么',
  '有什么清淡的菜',
  '帮我搭配菜单'
]

const decodeChunk = (chunk: ArrayBuffer | Uint8Array | string): string => {
  if (typeof chunk === 'string') return chunk

  const bytes = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : chunk

  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes, { stream: true })
  }

  const binary = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('')
  return decodeURIComponent(escape(binary))
}

const parseSseBuffer = (buffer: string, onData: (data: any) => void): string => {
  const lines = buffer.split(/\r?\n/)
  const rest = lines.pop() || ''

  lines.forEach(line => {
    if (!line.startsWith('data:')) return

    const data = line.slice(5).trim()
    if (!data || data === '[DONE]') return

    try {
      onData(JSON.parse(data))
    } catch {
      // Ignore partial or malformed SSE payloads.
    }
  })

  return rest
}

const removeToolCallMarkup = (content: string): string =>
  content
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .replace(/<tool_call>[\s\S]*$/g, '')
    .replace(/<\/?tool_call>/g, '')
    .replace(/\{\s*["']name["']\s*:\s*["'][^"']+["']\s*,\s*["']arguments["']\s*:\s*\{[\s\S]*?\}\s*\}/g, '')
    .trim()

const filterMentionedDishes = (content: string, dishes: any[]): any[] =>
  dishes.filter(dish => dish?.name && content.includes(dish.name))

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function GlobalAssistant() {
  const systemInfo = getCompatibleSystemInfoSync()
  const windowWidth = systemInfo.windowWidth || 375
  const windowHeight = systemInfo.windowHeight || 667
  const statusBarHeight = systemInfo.statusBarHeight || 20
  const minY = statusBarHeight + 64
  const maxY = Math.max(minY, windowHeight - 180)

  const [drawerMounted, setDrawerMounted] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [side, setSide] = useState<'left' | 'right'>('right')
  const [position, setPosition] = useState({
    x: windowWidth - BALL_SIZE - EDGE_GAP,
    y: clamp(Math.floor(windowHeight * 0.58), minY, maxY)
  })
  const [messages, setMessages] = useState<AssistantMessage[]>([
    WELCOME_MESSAGE
  ])
  const [sessions, setSessions] = useState<AssistantSession[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [scrollIntoView, setScrollIntoView] = useState('')
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false
  })

  useEffect(() => {
    setPosition(prev => ({
      x: clamp(prev.x, EDGE_GAP, windowWidth - BALL_SIZE - EDGE_GAP),
      y: clamp(prev.y, minY, maxY)
    }))
  }, [maxY, minY, windowWidth])

  useEffect(() => {
    const latest = messages[messages.length - 1]
    if (latest) {
      setScrollIntoView(`assistant-msg-${latest.id}`)
    }
  }, [messages])

  const openDrawer = () => {
    Taro.hideTabBar({ animation: false }).catch(() => {})
    setDrawerMounted(true)
    void loadSessions()
    setTimeout(() => setDrawerOpen(true), 20)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    Taro.showTabBar({ animation: false }).catch(() => {})
    setTimeout(() => setDrawerMounted(false), CLOSE_MS)
  }

  useEffect(() => {
    return () => {
      Taro.showTabBar({ animation: false }).catch(() => {})
    }
  }, [])

  const handleTouchStart = e => {
    const touch = e.touches[0]
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      originX: position.x,
      originY: position.y,
      moved: false
    }
  }

  const handleTouchMove = e => {
    const touch = e.touches[0]
    const deltaX = touch.clientX - dragRef.current.startX
    const deltaY = touch.clientY - dragRef.current.startY

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragRef.current.moved = true
    }

    setPosition({
      x: clamp(dragRef.current.originX + deltaX, EDGE_GAP, windowWidth - BALL_SIZE - EDGE_GAP),
      y: clamp(dragRef.current.originY + deltaY, minY, maxY)
    })
  }

  const handleTouchEnd = () => {
    if (!dragRef.current.moved) {
      openDrawer()
      return
    }

    const snapRight = position.x + BALL_SIZE / 2 > windowWidth / 2
    setSide(snapRight ? 'right' : 'left')
    setPosition(prev => ({
      x: snapRight ? windowWidth - BALL_SIZE - EDGE_GAP : EDGE_GAP,
      y: prev.y
    }))
  }

  const updateAssistantMessage = (
    id: string,
    updater: (message: AssistantMessage) => AssistantMessage
  ) => {
    setMessages(prev => prev.map(message => (message.id === id ? updater(message) : message)))
  }

  const loadSessions = async () => {
    try {
      const res = await getSessions()
      if (res.code === 200) {
        setSessions(res.data)
      }
    } catch {
      // Keep the drawer usable even when history fails to load.
    }
  }

  const handleNewSession = () => {
    setSessionId(null)
    setMessages([WELCOME_MESSAGE])
    setShowSessions(false)
  }

  const handleOpenPreferences = () => {
    Taro.navigateTo({ url: '/pages/preferences/index' })
  }

  const handleSelectSession = async (sid: string) => {
    setShowSessions(false)
    setSessionId(sid)
    setMessages([])

    try {
      const res = await getSessionMessages(sid)
      if (res.code === 200) {
        const historyMessages = res.data
          .filter(message => message.role !== 'system')
          .map(message => ({
            id: message.id,
            role: message.role as 'user' | 'assistant',
            content:
              message.role === 'assistant'
                ? removeToolCallMarkup(message.content)
                : message.content
          }))
        setMessages(historyMessages.length ? historyMessages : [WELCOME_MESSAGE])
      }
    } catch {
      Taro.showToast({ title: '加载历史失败', icon: 'none' })
      setMessages([WELCOME_MESSAGE])
    }
  }

  const handleDeleteSession = async (sid: string) => {
    try {
      const res = await deleteSession(sid)
      if (res.code === 200) {
        setSessions(prev => prev.filter(session => session.id !== sid))
        if (sessionId === sid) {
          handleNewSession()
        }
      }
    } catch {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  const formatSessionTime = (dateStr: string) => {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return ''

    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (diffDays <= 0) {
      return `${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
    }
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const handleSend = async () => {
    const content = inputValue.trim()
    if (!content || isLoading) return

    const token = getToken()
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const now = Date.now()
    const userMessage: AssistantMessage = {
      id: `${now}`,
      role: 'user',
      content
    }
    const assistantId = `${now}-assistant`
    const assistantMessage: AssistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: ''
    }

    let fullContent = ''
    let dishes: any[] = []
    let sseBuffer = ''
    let hasReceivedChunk = false

    const applyAssistant = () => {
      updateAssistantMessage(assistantId, message => ({
        ...message,
        content: fullContent,
        dishes: dishes.length > 0 ? dishes : undefined
      }))
    }

    const handleSseData = (data: any) => {
      if (data.type === 'text' && data.content) {
        fullContent = removeToolCallMarkup(fullContent + data.content)
        applyAssistant()
      }

      if (data.type === 'dishes' && Array.isArray(data.dishes)) {
        dishes = filterMentionedDishes(fullContent, data.dishes)
        applyAssistant()
      }
    }

    const handleChunk = (chunk: ArrayBuffer | Uint8Array | string) => {
      hasReceivedChunk = true
      sseBuffer = parseSseBuffer(sseBuffer + decodeChunk(chunk), handleSseData)
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const requestTask = Taro.request({
        url: buildApiUrl('/ai/chat/stream'),
        method: 'POST',
        header: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          session_id: sessionId,
          content
        },
        responseType: 'arraybuffer',
        enableChunked: true,
        enableChunkedTransfer: true
      } as any)

      if (typeof (requestTask as any).onChunkReceived === 'function') {
        ;(requestTask as any).onChunkReceived((res: { data: ArrayBuffer }) => {
          if (res.data) handleChunk(res.data)
        })
      }

      const res = await requestTask
      const responseSessionId =
        (res.header as any)?.['X-Session-Id'] ||
        (res.header as any)?.['x-session-id'] ||
        (res.data as any)?.session_id

      if (responseSessionId) {
        setSessionId(responseSessionId)
        void loadSessions()
      }

      if (!hasReceivedChunk && res.data) {
        handleChunk(res.data as ArrayBuffer)
        parseSseBuffer(`${sseBuffer}\n`, handleSseData)
      }
    } catch (error) {
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' })
      setMessages(prev => prev.filter(message => message.id !== assistantId))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <View
        className='global-assistant-ball'
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Text className='global-assistant-ball__text'>厨</Text>
        <View className='global-assistant-ball__pulse' />
      </View>

      {drawerMounted ? (
        <View
          className={`assistant-drawer-mask ${drawerOpen ? 'assistant-drawer-mask--open' : ''}`}
          onClick={closeDrawer}
        >
          <View
            className={`assistant-drawer assistant-drawer--${side} ${drawerOpen ? 'assistant-drawer--open' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <View className='assistant-drawer__header'>
              <View>
                <Text className='assistant-drawer__title'>AI 小厨</Text>
                <Text className='assistant-drawer__subtitle'>随手问菜品和搭配</Text>
              </View>
              <View className='assistant-drawer__actions'>
                <View
                  className={`assistant-drawer__icon-btn ${showSessions ? 'assistant-drawer__icon-btn--active' : ''}`}
                  onClick={() => {
                    if (!showSessions) void loadSessions()
                    setShowSessions(prev => !prev)
                  }}
                >
                  <Text className='assistant-drawer__icon-text'>历</Text>
                </View>
                <View className='assistant-drawer__icon-btn' onClick={handleNewSession}>
                  <Text className='assistant-drawer__icon-text'>新</Text>
                </View>
                <View className='assistant-drawer__icon-btn' onClick={handleOpenPreferences}>
                  <Text className='assistant-drawer__icon-text'>味</Text>
                </View>
                <View className='assistant-drawer__close' onClick={closeDrawer}>
                  <Text className='assistant-drawer__close-text'>×</Text>
                </View>
              </View>
            </View>

            <ScrollView
              className='assistant-drawer__messages'
              scrollY
              enhanced
              showScrollbar={false}
              scrollIntoView={scrollIntoView}
            >
              {showSessions ? (
                <View className='assistant-sessions'>
                  {sessions.length ? (
                    sessions.map(session => (
                      <View
                        key={session.id}
                        className={`assistant-session ${session.id === sessionId ? 'assistant-session--active' : ''}`}
                        onClick={() => handleSelectSession(session.id)}
                      >
                        <View className='assistant-session__main'>
                          <Text className='assistant-session__title'>{session.title || '未命名会话'}</Text>
                          <Text className='assistant-session__meta'>
                            {session.message_count} 条消息 · {formatSessionTime(session.last_message_at)}
                          </Text>
                        </View>
                        <View
                          className='assistant-session__delete'
                          onClick={e => {
                            e.stopPropagation()
                            void handleDeleteSession(session.id)
                          }}
                        >
                          <Text className='assistant-session__delete-text'>×</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View className='assistant-sessions__empty'>
                      <Text className='assistant-sessions__empty-text'>暂无历史会话</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  {messages.map(message => (
                    <View
                      key={message.id}
                      id={`assistant-msg-${message.id}`}
                      className={`assistant-drawer__message assistant-drawer__message--${message.role}`}
                    >
                      <View className='assistant-drawer__bubble'>
                        {message.content ? (
                          <Text className='assistant-drawer__bubble-text'>{message.content}</Text>
                        ) : (
                          <View className='assistant-drawer__typing'>
                            <View className='assistant-drawer__typing-dot' />
                            <View className='assistant-drawer__typing-dot' />
                            <View className='assistant-drawer__typing-dot' />
                          </View>
                        )}
                      </View>
                      {message.dishes?.length ? <DishCard dishes={message.dishes} /> : null}
                    </View>
                  ))}
                  {messages.length <= 1 ? (
                    <View className='assistant-quick'>
                      {QUICK_QUESTIONS.map(question => (
                        <View
                          key={question}
                          className='assistant-quick__item'
                          onClick={() => setInputValue(question)}
                        >
                          <Text className='assistant-quick__text'>{question}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
              <View className='assistant-drawer__bottom-space' />
            </ScrollView>

            <View className='assistant-drawer__footer'>
              <Input
                className='assistant-drawer__input'
                value={inputValue}
                placeholder='问我今天吃什么...'
                confirmType='send'
                disabled={isLoading}
                onInput={e => setInputValue(e.detail.value)}
                onConfirm={handleSend}
              />
              <View
                className={`assistant-drawer__send ${!inputValue.trim() || isLoading ? 'assistant-drawer__send--disabled' : ''}`}
                onClick={handleSend}
              >
                <Text className='assistant-drawer__send-text'>发送</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </>
  )
}
