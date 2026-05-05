import { api } from '../utils/request';
import { buildApiUrl } from '../utils/api';
import { getToken } from '../utils/session';

export interface ChatSession {
  id: string;
  title: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: any;
  created_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  dietary_restrictions?: string;
  favorite_cuisines?: string;
  allergies?: string;
  taste_preferences?: string;
  typical_people_count: number;
  notes?: string;
}

// 获取会话列表
export function getSessions(): Promise<{ code: number; data: ChatSession[]; message: string }> {
  return api.get('/ai/sessions');
}

// 获取会话消息
export function getSessionMessages(sessionId: string): Promise<{ code: number; data: ChatMessage[]; message: string }> {
  return api.get(`/ai/sessions/${sessionId}/messages`);
}

// 删除会话
export function deleteSession(sessionId: string): Promise<{ code: number; data: { success: boolean }; message: string }> {
  return api.delete(`/ai/sessions/${sessionId}`);
}

// 发送消息（非流式）
export function sendMessage(data: {
  session_id?: string;
  content: string;
}): Promise<{
  code: number;
  data: {
    session_id: string;
    content: string;
    dishes?: any[];
  };
  message: string;
}> {
  return api.post('/ai/chat', data);
}

// 获取用户偏好
export function getPreferences(): Promise<{ code: number; data: UserPreference | null }> {
  return api.get('/ai/preferences');
}

// 更新用户偏好
export function updatePreferences(data: Partial<UserPreference>): Promise<{ code: number; data: UserPreference }> {
  return api.put('/ai/preferences', data);
}

// 分析菜品图片
export function analyzeImage(imageUrl: string): Promise<{ code: number; data?: { analysis: string }; message?: string }> {
  return api.post('/ai/analyze-image', { image_url: imageUrl });
}

// 上传图片并分析
export async function uploadAndAnalyzeImage(filePath: string): Promise<{ code: number; data?: { analysis: string; image_url: string }; message?: string }> {
  const token = getToken();
  if (!token) {
    return { code: 401, message: '请先登录' };
  }

  try {
    // 先上传图片
    const uploadRes = await new Promise<any>((resolve, reject) => {
      Taro.uploadFile({
        url: buildApiUrl('/upload/image'),
        filePath,
        name: 'file',
        header: {
          Authorization: `Bearer ${token}`,
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve(data);
          } catch (e) {
            reject(new Error('解析上传响应失败'));
          }
        },
        fail: (err) => reject(err),
      });
    });

    if (uploadRes.code !== 200 || !uploadRes.data?.url) {
      return { code: 500, message: uploadRes.message || '上传图片失败' };
    }

    // 分析图片
    const analyzeRes = await analyzeImage(uploadRes.data.url);
    return {
      code: analyzeRes.code,
      data: {
        analysis: analyzeRes.data?.analysis || '',
        image_url: uploadRes.data.url,
      },
      message: analyzeRes.message,
    };
  } catch (error) {
    return { code: 500, message: error?.message || '处理图片失败' };
  }
}

// 需要导入 Taro
import Taro from '@tarojs/taro';
