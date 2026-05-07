import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Picker } from '@tarojs/components';
import { getPreferences, updatePreferences, UserPreference } from '../../services/ai';
import { getCompatibleSystemInfoSync } from '../../utils/system-info';
import './index.scss';

function getPreferencesHeaderStyle(): CSSProperties {
  const systemInfo = getCompatibleSystemInfoSync();
  const statusBarHeight = systemInfo.statusBarHeight || 20;
  const windowWidth = systemInfo.windowWidth || 375;

  try {
    const menuButton = Taro.getMenuButtonBoundingClientRect();
    const gap = Math.max(menuButton.top - statusBarHeight, 8);

    return {
      paddingTop: `${menuButton.bottom + gap + 12}px`,
      paddingRight: `${Math.max(windowWidth - menuButton.left + 16, 24)}px`,
    };
  } catch {
    return {
      paddingTop: `${statusBarHeight + 16}px`,
      paddingRight: '24px',
    };
  }
}

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<Partial<UserPreference>>({
    dietary_restrictions: '',
    favorite_cuisines: '',
    allergies: '',
    taste_preferences: '',
    typical_people_count: 0,
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const headerStyle = useMemo(() => getPreferencesHeaderStyle(), []);

  const tasteOptions = ['清淡', '微辣', '中辣', '特辣', '酸甜', '咸鲜', '麻辣'];

  useEffect(() => {
    void loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const res = await getPreferences();
      if (res.code === 200 && res.data) {
        setPreferences(res.data);
      }
    } catch (error) {
      console.error('加载偏好失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const closePreferences = () => {
    Taro.navigateBack({
      delta: 1,
      fail: () => {
        Taro.switchTab({ url: '/pages/ai-chat/index' });
      },
    });
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const res = await updatePreferences(preferences);
      if (res.code === 200) {
        Taro.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(closePreferences, 700);
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' });
      }
    } catch (error) {
      console.error('保存偏好失败:', error);
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserPreference, value: string | number) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <View className='preferences'>
        <View className='preferences__loading'>加载中...</View>
      </View>
    );
  }

  return (
    <View className='preferences'>
      <View className='preferences__header' style={headerStyle}>
        <View className='preferences__header-main'>
          <Text className='preferences__title'>个人偏好</Text>
          <Text className='preferences__subtitle'>用于优化推荐和对话理解</Text>
        </View>
        <View className='preferences__close-top' onClick={closePreferences}>
          <Text className='preferences__close-top-text'>关闭</Text>
        </View>
      </View>

      <View className='preferences__section'>
        <Text className='preferences__section-title'>饮食限制</Text>
        <Input
          className='preferences__input'
          value={preferences.dietary_restrictions || ''}
          onInput={(e) => handleInputChange('dietary_restrictions', e.detail.value)}
          placeholder='如：素食、不吃辣、不吃海鲜'
        />
      </View>

      <View className='preferences__section'>
        <Text className='preferences__section-title'>口味偏好</Text>
        <Picker
          mode='selector'
          range={tasteOptions}
          value={Math.max(tasteOptions.indexOf(preferences.taste_preferences || ''), 0)}
          onChange={(e) => handleInputChange('taste_preferences', tasteOptions[e.detail.value])}
        >
          <View className='preferences__picker'>
            <Text className='preferences__picker-text'>
              {preferences.taste_preferences || '请选择口味偏好'}
            </Text>
            <Text className='preferences__picker-arrow'>›</Text>
          </View>
        </Picker>
      </View>

      <View className='preferences__section'>
        <Text className='preferences__section-title'>喜欢菜系</Text>
        <Input
          className='preferences__input'
          value={preferences.favorite_cuisines || ''}
          onInput={(e) => handleInputChange('favorite_cuisines', e.detail.value)}
          placeholder='如：川菜、粤菜、湘菜'
        />
      </View>

      <View className='preferences__section'>
        <Text className='preferences__section-title'>过敏源</Text>
        <Input
          className='preferences__input'
          value={preferences.allergies || ''}
          onInput={(e) => handleInputChange('allergies', e.detail.value)}
          placeholder='如：花生、海鲜、鸡蛋'
        />
      </View>

      <View className='preferences__section'>
        <Text className='preferences__section-title'>通常用餐人数</Text>
        <Input
          className='preferences__input'
          type='number'
          value={preferences.typical_people_count?.toString() || '0'}
          onInput={(e) => handleInputChange('typical_people_count', parseInt(e.detail.value) || 0)}
          placeholder='请输入用餐人数'
        />
      </View>

      <View className='preferences__section'>
        <Text className='preferences__section-title'>其他备注</Text>
        <Input
          className='preferences__input preferences__input--textarea'
          value={preferences.notes || ''}
          onInput={(e) => handleInputChange('notes', e.detail.value)}
          placeholder='其他需要小厨记住的偏好'
        />
      </View>

      <View className='preferences__actions'>
        <View
          className={`preferences__save-btn ${isSaving ? 'preferences__save-btn--disabled' : ''}`}
          onClick={handleSave}
        >
          <Text className='preferences__save-btn-text'>
            {isSaving ? '保存中...' : '保存偏好'}
          </Text>
        </View>

        <View className='preferences__close-btn' onClick={closePreferences}>
          <Text className='preferences__close-btn-text'>关闭</Text>
        </View>
      </View>

      <View className='preferences__tip'>
        <Text className='preferences__tip-text'>
          小厨会根据你的偏好提供更个性化的菜品推荐
        </Text>
      </View>
    </View>
  );
}
