import { useState, useRef, useEffect } from 'react';
import Taro from '@tarojs/taro';
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
import './index.scss';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  dishes?: any[];
  created_at: string;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollViewRef = useRef<HTMLDivElement>(null);
  const recorderManager = useRef<any>(null);

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
        setSessions(res.data);
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
    }
  };

  // 切换显示会话列表
  const toggleSessions = () => {
    if (!showSessions) {
      loadSessions();
    }
    setShowSessions(!showSessions);
  };

  // 选择会话
  const handleSelectSession = async (sid: string) => {
    setSessionId(sid);
    setShowSessions(false);
    setMessages([]);

    try {
      const res = await getSessionMessages(sid);
      if (res.code === 200) {
        const historyMessages: Message[] = res.data.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
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
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) {
        Taro.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      // 创建一个临时的 assistant 消息用于流式更新
      const tempAssistantId = Date.now().toString() + '-assistant';
      const tempAssistant: Message = {
        id: tempAssistantId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAssistant]);

      // 使用 Taro.request 进行流式请求
      const url = buildApiUrl('/ai/chat/stream');
      const res = await Taro.request({
        url,
        method: 'POST',
        header: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          session_id: sessionId,
          content: userMessage.content,
        },
        enableChunkedTransfer: true,
      });

      // 处理流式响应
      let fullContent = '';
      let dishes: any[] = [];

      // 监听分块数据
      const onRequestTask = (res: any) => {
        if (res.data) {
          try {
            const text = res.data as string;
            const lines = text.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.type === 'text' && parsed.content) {
                    fullContent += parsed.content;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === tempAssistantId
                          ? { ...msg, content: fullContent }
                          : msg,
                      ),
                    );
                  }

                  if (parsed.type === 'dishes' && parsed.dishes) {
                    dishes = parsed.dishes;
                  }

                  if (parsed.type === 'done') {
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
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          } catch (e) {
            // 忽略处理错误
          }
        }
      };

      if (res && typeof res === 'object' && 'onChunkReceived' in res) {
        (res as any).onChunkReceived(onRequestTask);
      } else {
        if (res.data) {
          const data = res.data as any;
          if (data.content) fullContent = data.content;
          if (data.dishes) dishes = data.dishes;

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
        }
      }

      const responseSessionId = (res.header as any)?.['x-session-id'] || res.data?.session_id;
      if (responseSessionId) {
        setSessionId(responseSessionId);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' });
      setMessages((prev) => prev.filter((msg) => !msg.id.endsWith('-assistant')));
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
      <View className='ai-chat__toolbar'>
        <View className='ai-chat__toolbar-btn' onClick={toggleSessions}>
          <Text className='ai-chat__toolbar-icon'>📋</Text>
          <Text className='ai-chat__toolbar-text'>历史</Text>
        </View>
        <View className='ai-chat__toolbar-btn' onClick={handleNewSession}>
          <Text className='ai-chat__toolbar-icon'>✏️</Text>
          <Text className='ai-chat__toolbar-text'>新会话</Text>
        </View>
        <View
          className='ai-chat__toolbar-btn'
          onClick={() => Taro.navigateTo({ url: '/pages/preferences/index' })}
        >
          <Text className='ai-chat__toolbar-icon'>⚙️</Text>
          <Text className='ai-chat__toolbar-text'>偏好</Text>
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
          </View>
        )}

        {messages.map((msg) => (
          <View key={msg.id}>
            <View className={`ai-chat__bubble ai-chat__bubble--${msg.role}`}>
              <View className='ai-chat__bubble-content'>
                <Text>{msg.content}</Text>
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
