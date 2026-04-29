import { Image, Picker, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import { GlobalAssistant } from '../../components/global-assistant'

import { PageShell } from '../../components/page-shell'
import { getCategories, getDishList, Category, Dish } from '../../services/dish'
import { createOrder, OrderItem } from '../../services/order'

import './index.scss'

const CART_CLOSE_MS = 220
const MEAL_OPTIONS = ['早餐', '午餐', '晚餐']

const formatDateLabel = (value: string) => {
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${month}月${day}日`
}

const familyHeader = {
  title: '哲哲私厨',
  subtitle: '精选食材 · 匠心烹制'
}

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = `${now.getMonth() + 1}`.padStart(2, '0')
    const day = `${now.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [mealIndex, setMealIndex] = useState(1)
  const [peopleCount, setPeopleCount] = useState(2)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [toastText, setToastText] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [cartDrawerVisible, setCartDrawerVisible] = useState(false)
  const [submittingOrder, setSubmittingOrder] = useState(false)

  // API数据
  const [categories, setCategories] = useState<Category[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const [categoriesRes, dishesRes] = await Promise.all([
        getCategories(),
        getDishList()
      ])
      setCategories(categoriesRes)
      setDishes(dishesRes)
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadData()
  })

  // 过滤菜品
  const filteredDishes = useMemo(() => {
    if (activeCategory === 'all') return dishes
    return dishes.filter((dish) => dish.category_id === activeCategory)
  }, [activeCategory, dishes])

  // 购物车项目
  const cartItems = useMemo(
    () =>
      dishes
        .filter((dish) => (quantities[dish.id] || 0) > 0)
        .map((dish) => ({
          id: dish.id,
          name: dish.name,
          qty: quantities[dish.id],
          image: dish.image_url
        })),
    [quantities, dishes]
  )

  const totalSelectedCount = useMemo(
    () => Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    [quantities]
  )

  useEffect(() => {
    if (!showToast) return
    const timer = setTimeout(() => setShowToast(false), 1400)
    return () => clearTimeout(timer)
  }, [showToast, toastText])

  useEffect(() => {
    if (totalSelectedCount === 0) {
      closeCartDrawer()
    }
  }, [totalSelectedCount])

  const openCartDrawer = () => {
    setShowCartDrawer(true)
    setTimeout(() => setCartDrawerVisible(true), 20)
  }

  const closeCartDrawer = () => {
    setCartDrawerVisible(false)
    setTimeout(() => setShowCartDrawer(false), CART_CLOSE_MS)
  }

  const updateQty = (dishId: string, nextQty: number, dishName: string) => {
    const safeQty = Math.max(0, nextQty)
    setQuantities((prev) => {
      const next = { ...prev, [dishId]: safeQty }
      if (safeQty === 0) {
        delete next[dishId]
      }
      return next
    })

    if (safeQty > 0) {
      setToastText(`已添加 ${dishName}`)
      setShowToast(true)
    }
  }

  const handleSubmitOrder = async () => {
    if (!cartItems.length || submittingOrder) return
    setSubmittingOrder(true)
    Taro.showLoading({ title: '提交中...', mask: true })

    try {
      // 构建订单数据
      const orderItems: OrderItem[] = cartItems.map(item => ({
        dishId: item.id,
        dishName: item.name,
        quantity: item.qty
      }))

      await createOrder({
        items: orderItems,
        date: selectedDate,
        meal: MEAL_OPTIONS[mealIndex],
        peopleCount: peopleCount
      })

      Taro.hideLoading()
      Taro.showToast({ title: '下单成功', icon: 'success' })
      setSubmittingOrder(false)
      closeCartDrawer()
      setQuantities({})
      setShowToast(false)
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/orders/index' })
      }, 350)
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({ title: '下单失败', icon: 'none' })
      setSubmittingOrder(false)
    }
  }

  if (loading) {
    return (
      <PageShell title={familyHeader.title} subtitle={familyHeader.subtitle}>
        <View className='loading-container'>
          <Text className='loading-text'>加载中...</Text>
        </View>
      </PageShell>
    )
  }

  return (
    <>
      <PageShell title={familyHeader.title} subtitle={familyHeader.subtitle}>
      <View className='home-info card home-enter'>
        <View className='home-info__grid'>
          <Picker className='home-info__picker' mode='date' value={selectedDate} onChange={(e) => setSelectedDate(e.detail.value)}>
            <View className='home-info__item home-info__item--picker'>
              <Text className='home-info__label'>日期</Text>
              <Text className='home-info__value'>{formatDateLabel(selectedDate)}</Text>
            </View>
          </Picker>
          <Picker
            className='home-info__picker'
            mode='selector'
            range={MEAL_OPTIONS}
            value={mealIndex}
            onChange={(e) => setMealIndex(Number(e.detail.value))}
          >
            <View className='home-info__item home-info__item--picker'>
              <Text className='home-info__label'>餐期</Text>
              <Text className='home-info__value'>{MEAL_OPTIONS[mealIndex]}</Text>
            </View>
          </Picker>
          <View className='home-info__item'>
            <Text className='home-info__label'>人数</Text>
            <View className='home-info__counter'>
              <Text className='home-info__circle pressable' onClick={() => setPeopleCount((count) => Math.max(1, count - 1))}>-</Text>
              <Text className='home-info__count'>{peopleCount}</Text>
              <Text className='home-info__circle pressable' onClick={() => setPeopleCount((count) => count + 1)}>+</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className='home-tabs home-enter home-enter--delay-1' scrollX enhanced showScrollbar={false}>
        <View className='home-tabs__row'>
          <Text
            className={`pill pressable ${activeCategory === 'all' ? 'pill--active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            全部
          </Text>
          {categories.map((category) => (
            <Text
              className={`pill pressable ${activeCategory === category.id ? 'pill--active' : ''}`}
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.name}
            </Text>
          ))}
        </View>
      </ScrollView>

      <View className='dish-grid'>
        {filteredDishes.map((dish, index) => {
          const qty = quantities[dish.id] || 0

          return (
            <View className={`dish-card card home-enter home-enter--delay-${Math.min(index + 2, 4)}`} key={dish.id}>
              <View className='dish-card__media'>
                <Image className='dish-card__image' src={dish.image_url} mode='aspectFill' />
                {dish.tag && <Text className='dish-card__tag'>{dish.tag}</Text>}
              </View>
              <View className='dish-card__body'>
                <Text className='dish-card__name'>{dish.name}</Text>
                <Text className='dish-card__desc'>{dish.description}</Text>
                <View className='dish-card__footer'>
                  {qty > 0 ? (
                    <View className='dish-card__stepper'>
                      <Text
                        className={`dish-card__step pressable ${qty <= 1 ? 'dish-card__step--disabled' : ''}`}
                        onClick={() => updateQty(dish.id, qty - 1, dish.name)}
                      >
                        -
                      </Text>
                      <Text className='dish-card__qty'>{qty}</Text>
                      <Text className='dish-card__step pressable' onClick={() => updateQty(dish.id, qty + 1, dish.name)}>+</Text>
                    </View>
                  ) : (
                    <Text className='accent-btn pressable' onClick={() => updateQty(dish.id, 1, dish.name)}>+ 选购</Text>
                  )}
                </View>
              </View>
            </View>
          )
        })}
      </View>

      {totalSelectedCount > 0 ? (
        <View className='floating-cart pressable floating-cart--show' onClick={openCartDrawer}>
          <Text className='floating-cart__badge'>{totalSelectedCount}</Text>
          <Text className='floating-cart__icon'>购物车</Text>
        </View>
      ) : null}

      {showToast ? (
        <View className={`home-notice ${showToast ? 'home-notice--show' : ''}`}>
          <Text className='home-notice__icon'>●</Text>
          <Text className='home-notice__text'>{toastText}</Text>
        </View>
      ) : null}

      {showCartDrawer ? (
        <View className={`drawer-mask ${cartDrawerVisible ? 'drawer-mask--show' : ''}`} onClick={closeCartDrawer}>
          <View className={`cart-drawer ${cartDrawerVisible ? 'cart-drawer--open' : ''}`} onClick={(e) => e.stopPropagation()}>
            <View className='cart-drawer__header'>
              <View>
                <Text className='cart-drawer__title'>购物车</Text>
                <Text className='cart-drawer__subtitle'>查看和管理您选择的菜品</Text>
              </View>
              <Text className='cart-drawer__close pressable' onClick={closeCartDrawer}>×</Text>
            </View>

            <View className='cart-drawer__list'>
              {cartItems.map((item) => (
                <View className='cart-drawer__item card' key={item.id}>
                  <Image className='cart-drawer__image' src={item.image} mode='aspectFill' />
                  <View className='cart-drawer__info'>
                    <Text className='cart-drawer__name'>{item.name}</Text>
                    <View className='cart-drawer__stepper'>
                      <Text
                        className={`cart-drawer__step pressable ${item.qty <= 1 ? 'cart-drawer__step--disabled' : ''}`}
                        onClick={() => updateQty(item.id, item.qty - 1, item.name)}
                      >
                        -
                      </Text>
                      <Text className='cart-drawer__qty'>{item.qty}</Text>
                      <Text className='cart-drawer__step pressable' onClick={() => updateQty(item.id, item.qty + 1, item.name)}>+</Text>
                    </View>
                  </View>
                  <Text className='cart-drawer__sum'>x{item.qty}</Text>
                </View>
              ))}
            </View>

            <View className='cart-drawer__footer'>
              <View className='cart-drawer__total'>
                <Text className='cart-drawer__total-label'>已选菜品</Text>
                <Text className='cart-drawer__total-value'>{totalSelectedCount} 份</Text>
              </View>
              <Text className={`cart-drawer__submit pressable ${submittingOrder ? 'cart-drawer__submit--loading' : ''}`} onClick={handleSubmitOrder}>
                {submittingOrder ? '提交中...' : '确认下单'}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
      </PageShell>
      <GlobalAssistant />
    </>
  )
}
