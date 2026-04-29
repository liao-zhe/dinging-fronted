import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'

import { chefLogin, wxLogin } from '../../services/user'

import './index.scss'

const TAB_PAGES = new Set([
  '/pages/home/index',
  '/pages/orders/index',
  '/pages/profile/index'
])

function resolveRedirectTarget(redirect?: string) {
  if (!redirect) {
    return '/pages/home/index'
  }

  return decodeURIComponent(redirect)
}

export default function LoginPage() {
  const router = useRouter()
  const [submittingWechat, setSubmittingWechat] = useState(false)
  const [submittingChef, setSubmittingChef] = useState(false)
  const [chefUsername, setChefUsername] = useState('')
  const [chefPassword, setChefPassword] = useState('')
  const [activeTab, setActiveTab] = useState<'wechat' | 'chef'>('wechat')

  const finishLogin = async () => {
    Taro.showToast({
      title: '登录成功',
      icon: 'success'
    })

    const redirectTarget = resolveRedirectTarget(router.params?.redirect)
    if (TAB_PAGES.has(redirectTarget)) {
      await Taro.switchTab({ url: redirectTarget })
      return
    }

    await Taro.redirectTo({ url: redirectTarget })
  }

  const handleWechatLogin = async () => {
    if (submittingWechat) {
      return
    }

    try {
      setSubmittingWechat(true)

      let nickname = ''
      let avatar = ''

      try {
        const profile = await Taro.getUserProfile({
          desc: '用于完善家庭私厨账号信息'
        })
        nickname = profile.userInfo?.nickName || ''
        avatar = profile.userInfo?.avatarUrl || ''
      } catch (error) {
        console.warn('getUserProfile skipped:', error)
      }

      await wxLogin({
        nickname,
        avatar
      })

      await finishLogin()
    } catch (error) {
      console.error('wechat login failed:', error)
      Taro.showToast({
        title: error instanceof Error ? error.message : '登录失败',
        icon: 'none'
      })
    } finally {
      setSubmittingWechat(false)
    }
  }

  const handleChefLogin = async () => {
    if (submittingChef) {
      return
    }

    if (!chefUsername.trim() || !chefPassword.trim()) {
      Taro.showToast({
        title: '请输入主厨账号和密码',
        icon: 'none'
      })
      return
    }

    try {
      setSubmittingChef(true)

      await chefLogin({
        username: chefUsername.trim(),
        password: chefPassword
      })

      await finishLogin()
    } catch (error) {
      console.error('chef login failed:', error)
      Taro.showToast({
        title: error instanceof Error ? error.message : '登录失败',
        icon: 'none'
      })
    } finally {
      setSubmittingChef(false)
    }
  }

  return (
    <View className='login-page'>
      {/* 顶部装饰背景 */}
      <View className='login-header'>
        <View className='login-header__decoration'>
          <View className='decoration-circle decoration-circle--1' />
          <View className='decoration-circle decoration-circle--2' />
          <View className='decoration-circle decoration-circle--3' />
        </View>
        <View className='login-header__content'>
          <View className='login-logo'>
            <View className='login-logo__icon'>🍳</View>
            <Text className='login-logo__text'>家庭私厨</Text>
          </View>
          <Text className='login-header__slogan'>每一餐，都是家的味道</Text>
        </View>
      </View>

      {/* 登录卡片 */}
      <View className='login-card'>
        {/* Tab切换 */}
        <View className='login-tabs'>
          <View
            className={`login-tab ${activeTab === 'wechat' ? 'login-tab--active' : ''}`}
            onClick={() => setActiveTab('wechat')}
          >
            <Text className='login-tab__icon'>💬</Text>
            <Text className='login-tab__text'>微信登录</Text>
          </View>
          <View
            className={`login-tab ${activeTab === 'chef' ? 'login-tab--active' : ''}`}
            onClick={() => setActiveTab('chef')}
          >
            <Text className='login-tab__icon'>👨‍🍳</Text>
            <Text className='login-tab__text'>主厨入口</Text>
          </View>
        </View>

        {/* 微信登录 */}
        {activeTab === 'wechat' && (
          <View className='login-content'>
            <View className='login-welcome'>
              <Text className='login-welcome__title'>欢迎回来</Text>
              <Text className='login-welcome__desc'>一键登录，开启美食之旅</Text>
            </View>

            <Button
              className='login-btn login-btn--wechat'
              loading={submittingWechat}
              onClick={handleWechatLogin}
            >
              <View className='login-btn__inner'>
                <Text className='login-btn__icon'>💬</Text>
                <Text className='login-btn__text'>
                  {submittingWechat ? '登录中...' : '微信快捷登录'}
                </Text>
              </View>
            </Button>

            <View className='login-features'>
              <View className='login-feature'>
                <Text className='login-feature__icon'>🍽️</Text>
                <Text className='login-feature__text'>浏览菜品</Text>
              </View>
              <View className='login-feature'>
                <Text className='login-feature__icon'>📝</Text>
                <Text className='login-feature__text'>在线下单</Text>
              </View>
              <View className='login-feature'>
                <Text className='login-feature__icon'>📦</Text>
                <Text className='login-feature__text'>订单管理</Text>
              </View>
            </View>
          </View>
        )}

        {/* 主厨登录 */}
        {activeTab === 'chef' && (
          <View className='login-content'>
            <View className='login-welcome'>
              <Text className='login-welcome__title'>主厨登录</Text>
              <Text className='login-welcome__desc'>使用专属账号管理菜品和订单</Text>
            </View>

            <View className='login-form'>
              <View className='login-input-wrapper'>
                <Text className='login-input-icon'>👤</Text>
                <Input
                  className='login-input'
                  placeholder='请输入主厨账号'
                  value={chefUsername}
                  onInput={(e) => setChefUsername(e.detail.value)}
                />
              </View>
              <View className='login-input-wrapper'>
                <Text className='login-input-icon'>🔒</Text>
                <Input
                  className='login-input'
                  password
                  placeholder='请输入密码'
                  value={chefPassword}
                  onInput={(e) => setChefPassword(e.detail.value)}
                />
              </View>
            </View>

            <Button
              className='login-btn login-btn--chef'
              loading={submittingChef}
              onClick={handleChefLogin}
            >
              <View className='login-btn__inner'>
                <Text className='login-btn__icon'>👨‍🍳</Text>
                <Text className='login-btn__text'>
                  {submittingChef ? '登录中...' : '登录'}
                </Text>
              </View>
            </Button>

            <View className='login-tip'>
              <Text className='login-tip__text'>主厨可管理菜品、确认订单、查看数据统计</Text>
            </View>
          </View>
        )}
      </View>

      {/* 底部装饰 */}
      <View className='login-footer'>
        <View className='login-footer__decoration'>
          <View className='decoration-dot' />
          <View className='decoration-dot' />
          <View className='decoration-dot' />
        </View>
        <Text className='login-footer__text'>用心烹饪，温暖每一个家</Text>
      </View>
    </View>
  )
}