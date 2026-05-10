import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { Input, Picker, Text, Textarea, View } from '@tarojs/components'
import { getPreferences, updatePreferences, UserPreference } from '../../services/ai'
import { getCompatibleSystemInfoSync } from '../../utils/system-info'
import './index.scss'

function getPreferencesHeaderStyle(): CSSProperties {
  const systemInfo = getCompatibleSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 20
  const windowWidth = systemInfo.windowWidth || 375

  try {
    const menuButton = Taro.getMenuButtonBoundingClientRect()
    const gap = Math.max(menuButton.top - statusBarHeight, 8)

    return {
      paddingTop: `${menuButton.bottom + gap + 14}px`,
      paddingRight: `${Math.max(windowWidth - menuButton.left + 16, 24)}px`
    }
  } catch {
    return {
      paddingTop: `${statusBarHeight + 18}px`,
      paddingRight: '24px'
    }
  }
}

const tasteOptions = ['清淡', '微辣', '中辣', '特辣', '酸甜', '咸鲜', '麻辣']
const cuisineExamples = ['川菜', '粤菜', '湘菜', '家常菜']

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<Partial<UserPreference>>({
    dietary_restrictions: '',
    favorite_cuisines: '',
    allergies: '',
    taste_preferences: '',
    typical_people_count: 4,
    notes: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const headerStyle = useMemo(() => getPreferencesHeaderStyle(), [])

  useEffect(() => {
    void loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setIsLoading(true)
    try {
      const res = await getPreferences()
      if (res.code === 200 && res.data) {
        setPreferences({
          ...res.data,
          typical_people_count: res.data.typical_people_count || 4
        })
      }
    } catch (error) {
      console.error('加载偏好失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const closePreferences = () => {
    Taro.navigateBack({
      delta: 1,
      fail: () => {
        Taro.switchTab({ url: '/pages/home/index' })
      }
    })
  }

  const handleSave = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      const res = await updatePreferences(preferences)
      if (res.code === 200) {
        Taro.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(closePreferences, 700)
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' })
      }
    } catch (error) {
      console.error('保存偏好失败:', error)
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof UserPreference, value: string | number) => {
    setPreferences((prev) => ({ ...prev, [field]: value }))
  }

  const updatePeopleCount = (nextCount: number) => {
    handleInputChange('typical_people_count', Math.min(20, Math.max(1, nextCount)))
  }

  const activeTasteIndex = Math.max(tasteOptions.indexOf(preferences.taste_preferences || ''), 0)
  const peopleCount = preferences.typical_people_count || 4

  if (isLoading) {
    return (
      <View className='preferences'>
        <View className='preferences__loading'>
          <Text className='preferences__loading-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='preferences'>
      <View className='preferences__header' style={headerStyle}>
        <View className='preferences__header-main'>
          <Text className='preferences__eyebrow'>AI 推荐资料</Text>
          <Text className='preferences__title'>个人偏好</Text>
          <Text className='preferences__subtitle'>让小厨更懂你的口味、忌口和家庭人数</Text>
        </View>
        <View className='preferences__close-top' onClick={closePreferences}>
          <Text className='preferences__close-top-text'>关闭</Text>
        </View>
      </View>

      <View className='preferences__summary'>
        <View className='preferences__summary-item'>
          <Text className='preferences__summary-value'>{preferences.taste_preferences || '未选'}</Text>
          <Text className='preferences__summary-label'>口味</Text>
        </View>
        <View className='preferences__summary-divider' />
        <View className='preferences__summary-item'>
          <Text className='preferences__summary-value'>{peopleCount} 人</Text>
          <Text className='preferences__summary-label'>常用人数</Text>
        </View>
        <View className='preferences__summary-divider' />
        <View className='preferences__summary-item'>
          <Text className='preferences__summary-value'>{preferences.allergies ? '已填写' : '无'}</Text>
          <Text className='preferences__summary-label'>过敏源</Text>
        </View>
      </View>

      <View className='preferences__group'>
        <View className='preferences__group-header'>
          <Text className='preferences__group-title'>饮食偏好</Text>
          <Text className='preferences__group-subtitle'>推荐菜品时会优先参考这些信息</Text>
        </View>

        <View className='preferences__field'>
          <Text className='preferences__label'>口味偏好</Text>
          <Picker
            mode='selector'
            range={tasteOptions}
            value={activeTasteIndex}
            onChange={(e) => handleInputChange('taste_preferences', tasteOptions[Number(e.detail.value)])}
          >
            <View className='preferences__picker'>
              <Text className={`preferences__picker-text ${preferences.taste_preferences ? '' : 'preferences__placeholder'}`}>
                {preferences.taste_preferences || '请选择口味偏好'}
              </Text>
              <Text className='preferences__picker-arrow'>›</Text>
            </View>
          </Picker>
          <View className='preferences__chips'>
            {tasteOptions.map((taste) => (
              <Text
                className={`preferences__chip ${preferences.taste_preferences === taste ? 'preferences__chip--active' : ''}`}
                key={taste}
                onClick={() => handleInputChange('taste_preferences', taste)}
              >
                {taste}
              </Text>
            ))}
          </View>
        </View>

        <View className='preferences__field'>
          <Text className='preferences__label'>喜欢菜系</Text>
          <Input
            className='preferences__input'
            value={preferences.favorite_cuisines || ''}
            onInput={(e) => handleInputChange('favorite_cuisines', e.detail.value)}
            placeholder='如：川菜、粤菜、湘菜'
            placeholderClass='preferences__placeholder'
          />
          <View className='preferences__chips'>
            {cuisineExamples.map((cuisine) => (
              <Text
                className='preferences__chip'
                key={cuisine}
                onClick={() => handleInputChange('favorite_cuisines', cuisine)}
              >
                {cuisine}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <View className='preferences__group'>
        <View className='preferences__group-header'>
          <Text className='preferences__group-title'>需要避开的食材</Text>
          <Text className='preferences__group-subtitle'>忌口和过敏源会影响推荐结果</Text>
        </View>

        <View className='preferences__field'>
          <Text className='preferences__label'>饮食限制</Text>
          <Input
            className='preferences__input'
            value={preferences.dietary_restrictions || ''}
            onInput={(e) => handleInputChange('dietary_restrictions', e.detail.value)}
            placeholder='如：素食、不吃辣、不吃海鲜'
            placeholderClass='preferences__placeholder'
          />
        </View>

        <View className='preferences__field preferences__field--last'>
          <Text className='preferences__label'>过敏源</Text>
          <Input
            className='preferences__input'
            value={preferences.allergies || ''}
            onInput={(e) => handleInputChange('allergies', e.detail.value)}
            placeholder='如：花生、海鲜、鸡蛋'
            placeholderClass='preferences__placeholder'
          />
        </View>
      </View>

      <View className='preferences__group'>
        <View className='preferences__group-header preferences__group-header--inline'>
          <View>
            <Text className='preferences__group-title'>常用用餐人数</Text>
            <Text className='preferences__group-subtitle'>下单和推荐份量会参考这个人数</Text>
          </View>
          <View className='preferences__counter'>
            <Text className='preferences__counter-btn' onClick={() => updatePeopleCount(peopleCount - 1)}>-</Text>
            <Text className='preferences__counter-value'>{peopleCount}</Text>
            <Text className='preferences__counter-btn' onClick={() => updatePeopleCount(peopleCount + 1)}>+</Text>
          </View>
        </View>
      </View>

      <View className='preferences__group preferences__group--notes'>
        <View className='preferences__group-header'>
          <Text className='preferences__group-title'>其他备注</Text>
          <Text className='preferences__group-subtitle'>比如少油、老人小孩口味、固定不吃的菜</Text>
        </View>
        <Textarea
          className='preferences__textarea'
          value={preferences.notes || ''}
          maxlength={160}
          onInput={(e) => handleInputChange('notes', e.detail.value)}
          placeholder='其他需要小厨记住的偏好'
          placeholderClass='preferences__placeholder'
        />
      </View>

      <View className='preferences__actions'>
        <View
          className={`preferences__save-btn ${isSaving ? 'preferences__save-btn--disabled' : ''}`}
          onClick={handleSave}
        >
          <Text className='preferences__save-btn-text'>{isSaving ? '保存中...' : '保存偏好'}</Text>
        </View>
      </View>
    </View>
  )
}
