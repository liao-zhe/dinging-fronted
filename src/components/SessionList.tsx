import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { ChatSession } from '../../services/ai';
import './SessionList.scss';

interface SessionListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onNew: () => void;
}

export default function SessionList({
  sessions,
  currentSessionId,
  onSelect,
  onDelete,
  onNew,
}: SessionListProps) {
  const handleDelete = (e: any, sessionId: string) => {
    e.stopPropagation();
    Taro.showModal({
      title: '确认删除',
      content: '删除后聊天记录将无法恢复',
      success: (res) => {
        if (res.confirm) {
          onDelete(sessionId);
        }
      },
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  return (
    <View className='session-list'>
      <View className='session-list__header'>
        <Text className='session-list__title'>历史会话</Text>
        <View className='session-list__new-btn' onClick={onNew}>
          <Text className='session-list__new-btn-text'>+ 新建</Text>
        </View>
      </View>

      <ScrollView
        className='session-list__scroll'
        scrollY
        scrollWithAnimation
        enhanced
        showScrollbar={false}
      >
        {sessions.length === 0 ? (
          <View className='session-list__empty'>
            <Text className='session-list__empty-text'>暂无历史会话</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <View
              key={session.id}
              className={`session-item ${session.id === currentSessionId ? 'session-item--active' : ''}`}
              onClick={() => onSelect(session.id)}
            >
              <View className='session-item__content'>
                <Text className='session-item__title'>{session.title}</Text>
                <View className='session-item__meta'>
                  <Text className='session-item__count'>
                    {session.message_count} 条消息
                  </Text>
                  <Text className='session-item__time'>
                    {formatTime(session.last_message_at)}
                  </Text>
                </View>
              </View>
              <View
                className='session-item__delete'
                onClick={(e) => handleDelete(e, session.id)}
              >
                <Text className='session-item__delete-icon'>×</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
