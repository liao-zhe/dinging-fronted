import { Image, Text, View } from '@tarojs/components'
import { GlobalAssistant } from '../../components/global-assistant'

import { PageShell } from '../../components/page-shell'
import { cartItems } from '../../data/mock'

import './index.scss'

const total = cartItems.reduce((sum, item) => sum + item.qty, 0)

export default function CartPage() {
  const item = cartItems[0]

  return (
    <>
      <PageShell title='购物车' subtitle='查看和管理您选择的菜品' compact>
      <View className='cart-sheet'>
        <View className='cart-sheet__header'>
          <Text className='cart-sheet__title'>购物车</Text>
          <Text className='cart-sheet__close'>×</Text>
        </View>

        <Text className='cart-sheet__desc'>查看和管理您选择的菜品</Text>

        <View className='cart-sheet__item card'>
          <Image className='cart-sheet__image' src={item.image} mode='aspectFill' />
          <View className='cart-sheet__info'>
            <Text className='cart-sheet__name'>{item.name}</Text>
            <View className='cart-sheet__stepper'>
              <Text className='cart-sheet__step cart-sheet__step--disabled'>-</Text>
              <Text className='cart-sheet__qty'>{item.qty}</Text>
              <Text className='cart-sheet__step'>+</Text>
            </View>
          </View>
          <Text className='cart-sheet__sum'>x{item.qty}</Text>
        </View>

        <View className='cart-sheet__footer'>
          <View className='cart-sheet__total'>
            <Text className='cart-sheet__total-label'>已选菜品</Text>
            <Text className='cart-sheet__total-value'>{total} 份</Text>
          </View>
          <Text className='cart-sheet__submit'>确认下单</Text>
        </View>
      </View>
    </PageShell>
      <GlobalAssistant />
    </>
  )
}


