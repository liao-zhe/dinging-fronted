import { Button, Input, Text, View } from '@tarojs/components'
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
      <View className='login-hero'>
        <Text className='login-hero__eyebrow'>家庭私厨</Text>
        <Text className='login-hero__title'>先确认身份，再开始点单或管理订单</Text>
        <Text className='login-hero__desc'>
          普通用户继续使用微信快捷登录。主厨通过独立账号密码进入管理能力，权限边界更清晰。
        </Text>
      </View>

      <View className='login-layout'>
        <View className='login-panel login-panel--guest'>
          <Text className='login-panel__kicker'>普通用户</Text>
          <Text className='login-panel__title'>微信快捷登录</Text>
          <Text className='login-panel__desc'>
            登录后可下单、查看我的订单、使用个人中心等普通用户能力。
          </Text>
          <Button
            className='login-panel__button login-panel__button--primary'
            loading={submittingWechat}
            onClick={handleWechatLogin}
          >
            {submittingWechat ? '登录中...' : '微信快捷登录'}
          </Button>
        </View>

        <View className='login-panel login-panel--chef'>
          <Text className='login-panel__kicker'>主厨入口</Text>
          <Text className='login-panel__title'>账号密码登录</Text>
          <Text className='login-panel__desc'>
            仅主厨账号可获得订单确认能力。菜品管理页对所有已登录用户开放。
          </Text>
          <View className='login-form'>
            <Input
              className='login-input'
              placeholder='主厨账号'
              value={chefUsername}
              onInput={(e) => setChefUsername(e.detail.value)}
            />
            <Input
              className='login-input'
              password
              placeholder='主厨密码'
              value={chefPassword}
              onInput={(e) => setChefPassword(e.detail.value)}
            />
          </View>
          <Button
            className='login-panel__button login-panel__button--secondary'
            loading={submittingChef}
            onClick={handleChefLogin}
          >
            {submittingChef ? '登录中...' : '使用主厨账号登录'}
          </Button>
        </View>
      </View>

      <View className='login-note'>
        <Text className='login-note__text'>
          微信登录固定返回普通用户角色，主厨权限仅通过主厨账号密码入口获取。
        </Text>
      </View>
    </View>
  )
}
