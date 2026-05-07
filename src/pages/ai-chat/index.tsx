import type { CSSProperties } from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Input, Text, ScrollView } from '@tarojs/components';
import { buildApiUrl } from '../../utils/api';
import { getToken } from '../../utils/session';
import {
  getSessions,
  getSessionMessages,
  deleteSession,
  uploadAndAnalyzeImage,
  ChatSession,
} from '../../services/ai';
import DishCard from '../../components/DishCard';
import SessionList from '../../components/SessionList';
import { getCompatibleSystemInfoSync } from '../../utils/system-info';
import './index.scss';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  dishes?: any[];
  created_at: string;
}

const decodeChunk = (chunk: ArrayBuffer | Uint8Array | string): string => {
  if (typeof chunk === 'string') return chunk;

  const bytes = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : chunk;

  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes, { stream: true });
  }

  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('');
  return decodeURIComponent(escape(binary));
};

const parseSseBuffer = (
  buffer: string,
  onData: (data: any) => void,
): string => {
  const lines = buffer.split(/\r?\n/);
  const rest = lines.pop() || '';

  lines.forEach((line) => {
    if (!line.startsWith('data:')) return;

    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;

    try {
      onData(JSON.parse(data));
    } catch (error) {
      console.warn('ignore invalid sse data:', data);
    }
  });

  return rest;
};

const removeToolCallMarkup = (content: string): string =>
  content
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .replace(/\{\s*["']name["']\s*:\s*["'][^"']+["']\s*,\s*["']arguments["']\s*:\s*\{[\s\S]*?\}\s*\}/g, '')
    .trim();

const filterMentionedDishes = (content: string, dishes: any[]): any[] =>
  dishes.filter((dish) => dish?.name && content.includes(dish.name));

function getChatHeaderStyle(): CSSProperties {
  const systemInfo = getCompatibleSystemInfoSync();
  const statusBarHeight = systemInfo.statusBarHeight || 20;
  const windowWidth = systemInfo.windowWidth || 375;

  try {
    const menuButton = Taro.getMenuButtonBoundingClientRect();
    const gap = Math.max(menuButton.top - statusBarHeight, 8);
    const topInset = menuButton.bottom + gap + 12;
    const capsuleReserve = Math.max(windowWidth - menuButton.left + 16, 24);

    return {
      paddingTop: `${topInset}px`,
      paddingRight: `${capsuleReserve}px`,
      minHeight: `${topInset + 4}px`,
    };
  } catch {
    return {
      paddingTop: `${statusBarHeight + 16}px`,
      paddingRight: '24px',
      minHeight: `${statusBarHeight + 58}px`,
    };
  }
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const recorderManager = useRef<any>(null);
  const headerStyle = useMemo(() => getChatHeaderStyle(), []);

  // 滚动到底部
  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化录音管理器
  useEffect(() => {
    // #ifdef MP-WEIXIN
    recorderManager.current = Taro.getRecorderManager();
    recorderManager.current.onStop((res: any) => {
      if (res.tempFilePath) {
        handleVoiceResult(res.tempFilePath);
      }
    });
    recorderManager.current.onError((err: any) => {
      console.error('录音错误:', err);
      Taro.showToast({ title: '录音失败', icon: 'none' });
      setIsRecording(false);
    });
    // #endif
  }, []);

  // 加载会话列表
  const loadSessions = async () => {
    try {
      const res = await getSessions();
      if (res.code === 200) {
        setSessions((prev) => {
          if (!draftSessionId) {
            return res.data;
          }

          const draftSession = prev.find((session) => session.id === draftSessionId);
          if (!draftSession) {
            return res.data;
          }

          const nextSessions = res.data.filter((session) => session.id !== draftSessionId);
          return [draftSession, ...nextSessions];
        });
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
    }
  };

  useDidShow(() => {
    void loadSessions();
  });

  // 切换显示会话列表
  const toggleSessions = () => {
    setShowSessions((prev) => {
      if (!prev) {
        void loadSessions();
      }
      return !prev;
    });
  };

  // 选择会话
  const handleSelectSession = async (sid: string) => {
    if (sid === draftSessionId) {
      setSessionId(null);
      setShowSessions(false);
      setMessages([]);
      return;
    }

    setSessionId(sid);
    setDraftSessionId(null);
    setShowSessions(false);
    setMessages([]);

    try {
      const res = await getSessionMessages(sid);
      if (res.code === 200) {
        const historyMessages: Message[] = res.data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content:
            msg.role === 'assistant'
              ? removeToolCallMarkup(msg.content)
              : msg.content,
          created_at: msg.created_at,
        }));
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('加载历史消息失败:', error);
      Taro.showToast({ title: '加载历史消息失败', icon: 'none' });
    }
  };

  // 删除会话
  const handleDeleteSession = async (sid: string) => {
    if (sid === draftSessionId) {
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      setDraftSessionId(null);
      if (!sessionId) {
        setMessages([]);
      }
      return;
    }

    try {
      const res = await deleteSession(sid);
      if (res.code === 200) {
        setSessions((prev) => prev.filter((s) => s.id !== sid));
        if (sessionId === sid) {
          setSessionId(null);
          setMessages([]);
        }
        Taro.showToast({ title: '已删除', icon: 'success' });
      }
    } catch (error) {
      console.error('删除会话失败:', error);
      Taro.showToast({ title: '删除失败', icon: 'none' });
    }
  };

  // 新建会话
  const handleNewSession = () => {
    setSessionId(null);
    const nextDraftId = `draft-${Date.now()}`;
    const nowIso = new Date().toISOString();
    setDraftSessionId(nextDraftId);
    setSessions((prev) => [
      {
        id: nextDraftId,
        title: '新会话',
        message_count: 0,
        last_message_at: nowIso,
        created_at: nowIso,
      },
      ...prev.filter((session) => session.id !== nextDraftId),
    ]);
    setMessages([]);
    setShowSessions(false);
  };

  // 选择图片
  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      });

      if (res.tempFilePaths.length > 0) {
        const filePath = res.tempFilePaths[0];
        await handleImageAnalysis(filePath);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
    }
  };

  // 处理图片分析
  const handleImageAnalysis = async (filePath: string) => {
    setIsLoading(true);

    // 添加用户消息（显示图片占位）
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: '[图片]',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const result = await uploadAndAnalyzeImage(filePath);

      if (result.code === 200 && result.data) {
        // 添加 AI 回复
        const assistantMessage: Message = {
          id: Date.now().toString() + '-assistant',
          role: 'assistant',
          content: result.data.analysis,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        Taro.showToast({ title: result.message || '分析失败', icon: 'none' });
        // 移除失败的用户消息
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      }
    } catch (error) {
      console.error('图片分析失败:', error);
      Taro.showToast({ title: '分析失败', icon: 'none' });
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // 开始/停止录音
  const handleToggleRecording = () => {
    // #ifdef MP-WEIXIN
    if (isRecording) {
      recorderManager.current.stop();
      setIsRecording(false);
    } else {
      Taro.authorize({
        scope: 'scope.record',
        success: () => {
          recorderManager.current.start({
            duration: 60000,
            sampleRate: 16000,
            numberOfChannels: 1,
            encodeBitRate: 96000,
            format: 'mp3',
          });
          setIsRecording(true);
        },
        fail: () => {
          Taro.showToast({ title: '需要录音权限', icon: 'none' });
        },
      });
    }
    // #endif

    // #ifdef H5
    Taro.showToast({ title: 'H5端暂不支持语音', icon: 'none' });
    // #endif
  };

  // 处理语音识别结果
  const handleVoiceResult = async (filePath: string) => {
    // 这里应该调用语音识别 API，暂时简化处理
    Taro.showToast({ title: '语音识别功能开发中', icon: 'none' });
  };

  // 发送消息（流式）
  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isLoading) return;

    const token = getToken();
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const now = Date.now();
    const userMessage: Message = {
      id: `${now}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    const tempAssistantId = `${now}-assistant`;
    const tempAssistant: Message = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    let fullContent = '';
    let dishes: any[] = [];
    let sseBuffer = '';
    let hasReceivedChunk = false;

    const updateAssistant = () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempAssistantId
            ? {
                ...msg,
                content: fullContent,
                dishes: dishes.length > 0 ? dishes : undefined,
              }
            : msg,
        ),
      );
    };

    const handleSseData = (data: any) => {
      if (data.type === 'text' && data.content) {
        fullContent += data.content;
        fullContent = removeToolCallMarkup(fullContent);
        updateAssistant();
      }

      if (data.type === 'dishes' && Array.isArray(data.dishes)) {
        dishes = filterMentionedDishes(fullContent, data.dishes);
        updateAssistant();
      }

      if (data.type === 'done') {
        updateAssistant();
      }
    };

    const handleChunk = (chunk: ArrayBuffer | Uint8Array | string) => {
      hasReceivedChunk = true;
      sseBuffer = parseSseBuffer(sseBuffer + decodeChunk(chunk), handleSseData);
    };

    setMessages((prev) => [...prev, userMessage, tempAssistant]);
    setInputValue('');
    setIsLoading(true);

    try {
      const requestTask = Taro.request({
        url: buildApiUrl('/ai/chat/stream'),
        method: 'POST',
        header: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          session_id: sessionId,
          content,
        },
        responseType: 'arraybuffer',
        enableChunked: true,
        enableChunkedTransfer: true,
      } as any);

      if (typeof (requestTask as any).onChunkReceived === 'function') {
        (requestTask as any).onChunkReceived((res: { data: ArrayBuffer }) => {
          if (res.data) handleChunk(res.data);
        });
      }

      const res = await requestTask;
      const responseSessionId =
        (res.header as any)?.['X-Session-Id'] ||
        (res.header as any)?.['x-session-id'] ||
        (res.data as any)?.session_id;

      if (responseSessionId) {
        setSessionId(responseSessionId);
        if (draftSessionId) {
          setSessions((prev) =>
            prev.map((session) =>
              session.id === draftSessionId
                ? {
                    ...session,
                    id: responseSessionId,
                    title: session.title === '新会话' ? content.slice(0, 50) : session.title,
                    message_count: Math.max(session.message_count, 1),
                    last_message_at: new Date().toISOString(),
                  }
                : session,
            ),
          );
          setDraftSessionId(null);
        }
        void loadSessions();
      }

      if (!hasReceivedChunk && res.data) {
        handleChunk(res.data as ArrayBuffer);
        parseSseBuffer(`${sseBuffer}\n`, handleSseData);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' });
      setMessages((prev) => prev.filter((msg) => msg.id !== tempAssistantId));
    } finally {
      setIsLoading(false);
    }
  };

  // 快捷问题
  const quickQuestions = [
    '推荐今天的菜',
    '4人聚餐吃什么',
    '有什么清淡的菜',
    '帮我搭配菜单',
  ];

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
  };

  return (
    <View className='ai-chat'>
      {/* 顶部操作栏 */}
      <View className='ai-chat__header' style={headerStyle}>
        <View className='ai-chat__header-main'>
          <View className='ai-chat__avatar'>厨</View>
          <View className='ai-chat__title-wrap'>
            <Text className='ai-chat__title'>AI 小厨</Text>
            <Text className='ai-chat__subtitle'>
              {isLoading ? '正在搭配菜单' : '懂口味，也懂今天吃什么'}
            </Text>
          </View>
        </View>

        <View className='ai-chat__toolbar'>
          <View
            className={`ai-chat__toolbar-btn ${showSessions ? 'ai-chat__toolbar-btn--active' : ''}`}
            onClick={toggleSessions}
          >
            <Text className='ai-chat__toolbar-icon'>历</Text>
          </View>
          <View className='ai-chat__toolbar-btn' onClick={handleNewSession}>
            <Text className='ai-chat__toolbar-icon'>新</Text>
          </View>
          <View
            className='ai-chat__toolbar-btn'
            onClick={() => Taro.navigateTo({ url: '/pages/preferences/index' })}
          >
            <Text className='ai-chat__toolbar-icon'>味</Text>
          </View>
        </View>
      </View>

      {/* 会话列表 */}
      {showSessions && (
        <SessionList
          sessions={sessions}
          currentSessionId={sessionId}
          onSelect={handleSelectSession}
          onDelete={handleDeleteSession}
          onNew={handleNewSession}
        />
      )}

      {/* 消息列表 */}
      <ScrollView
        className='ai-chat__messages'
        scrollY
        scrollWithAnimation
        enhanced
        showScrollbar={false}
      >
        {messages.length === 0 && !showSessions && (
          <View className='ai-chat__welcome'>
            <View className='ai-chat__welcome-icon'>🍳</View>
            <View className='ai-chat__welcome-title'>你好，我是小厨</View>
            <View className='ai-chat__welcome-desc'>
              有什么菜品问题都可以问我哦～
            </View>
            <View className='ai-chat__welcome-card'>
              <Text className='ai-chat__welcome-card-title'>今天可以这样问</Text>
              <Text className='ai-chat__welcome-card-text'>
                想吃辣、清淡、多人聚餐，或者不知道怎么搭配，我都能帮你把选择缩小一点。
              </Text>
            </View>
          </View>
        )}

        {messages.map((msg) => (
          <View key={msg.id}>
            <View className={`ai-chat__bubble ai-chat__bubble--${msg.role}`}>
              <View className='ai-chat__bubble-content'>
                <Text className='ai-chat__bubble-text'>{msg.content}</Text>
              </View>
            </View>
            {msg.dishes && msg.dishes.length > 0 && (
              <DishCard dishes={msg.dishes} />
            )}
          </View>
        ))}

        {isLoading && !messages.some((m) => m.role === 'assistant' && !m.content) && (
          <View className='ai-chat__bubble ai-chat__bubble--assistant'>
            <View className='ai-chat__bubble-content ai-chat__bubble-content--loading'>
              <View className='ai-chat__typing'>
                <View className='ai-chat__typing-dot' />
                <View className='ai-chat__typing-dot' />
                <View className='ai-chat__typing-dot' />
              </View>
            </View>
          </View>
        )}

        <View className='ai-chat__placeholder' />
      </ScrollView>

      {messages.length === 0 && !showSessions && (
        <View className='ai-chat__quick-replies'>
          {quickQuestions.map((question) => (
            <View
              key={question}
              className='ai-chat__quick-reply'
              onClick={() => handleQuickQuestion(question)}
            >
              {question}
            </View>
          ))}
        </View>
      )}

      {/* 输入区域 */}
      <View className='ai-chat__input-area'>
        <View className='ai-chat__input-actions'>
          <View className='ai-chat__action-btn' onClick={handleChooseImage}>
            <Text className='ai-chat__action-icon'>📷</Text>
          </View>
          <View
            className={`ai-chat__action-btn ${isRecording ? 'ai-chat__action-btn--recording' : ''}`}
            onClick={handleToggleRecording}
          >
            <Text className='ai-chat__action-icon'>🎤</Text>
          </View>
        </View>
        <Input
          className='ai-chat__input'
          value={inputValue}
          onInput={(e) => setInputValue(e.detail.value)}
          placeholder='问我关于菜品的问题...'
          confirmType='send'
          onConfirm={handleSend}
          disabled={isLoading}
        />
        <View
          className={`ai-chat__send-btn ${!inputValue.trim() || isLoading ? 'ai-chat__send-btn--disabled' : ''}`}
          onClick={handleSend}
        >
          发送
        </View>
      </View>
    </View>
  );
}
