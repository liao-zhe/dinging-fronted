import { useState, useRef, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Input, Text, ScrollView } from '@tarojs/components';
import './index.scss';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollViewRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
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
      const token = Taro.getStorageSync('token');
      if (!token) {
        Taro.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      const res = await Taro.request({
        url: `${process.env.TARO_APP_API}/ai/chat`,
        method: 'POST',
        header: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          session_id: sessionId,
          content: userMessage.content,
        },
      });

      if (res.statusCode === 200) {
        const { session_id, content } = res.data;
        setSessionId(session_id);

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        Taro.showToast({ title: '发送失败', icon: 'none' });
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      Taro.showToast({ title: '网络错误', icon: 'none' });
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
      {/* 消息列表 */}
      <ScrollView
        className='ai-chat__messages'
        scrollY
        scrollWithAnimation
        enhanced
        showScrollbar={false}
      >
        {/* 欢迎消息 */}
        {messages.length === 0 && (
          <View className='ai-chat__welcome'>
            <View className='ai-chat__welcome-icon'>🍳</View>
            <View className='ai-chat__welcome-title'>你好，我是小厨</View>
            <View className='ai-chat__welcome-desc'>
              有什么菜品问题都可以问我哦～
            </View>
          </View>
        )}

        {/* 消息列表 */}
        {messages.map((msg) => (
          <View
            key={msg.id}
            className={`ai-chat__bubble ai-chat__bubble--${msg.role}`}
          >
            <View className='ai-chat__bubble-content'>
              <Text>{msg.content}</Text>
            </View>
          </View>
        ))}

        {/* 加载状态 */}
        {isLoading && (
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

        {/* 占位元素，用于滚动 */}
        <View className='ai-chat__placeholder' />
      </ScrollView>

      {/* 快捷问题 */}
      {messages.length === 0 && (
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
