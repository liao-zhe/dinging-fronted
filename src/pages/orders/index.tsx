import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'

import { GlobalAssistant } from '../../components/global-assistant'
import { PageShell } from '../../components/page-shell'
import {
  cancelOrder,
  deleteOrder,
  getAllOrders,
  getOrderList,
  Order,
  OrderStatus,
  updateOrderStatus
} from '../../services/order'
import { checkAuth } from '../../services/user'
import { getUserRole, hasToken, type UserRole } from '../../utils/session'

import './index.scss'

const statusTextMap: Record<OrderStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  preparing: '制作中',
  completed: '已完成',
  cancelled: '已取消'
}

const statusClassMap: Record<OrderStatus, string> = {
  pending: 'order-card__status--pending',
  confirmed: 'order-card__status--confirmed',
  preparing: 'order-card__status--preparing',
  completed: 'order-card__status--completed',
  cancelled: 'order-card__status--cancelled'
}

const deletableOrderStatuses: OrderStatus[] = ['confirmed']
const cancellableOrderStatuses: OrderStatus[] = ['pending', 'preparing', 'completed']

type RequestError = Error & {
  statusCode?: number
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}月${day}日`
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function isForbiddenError(error: unknown): error is RequestError {
  return error instanceof Error && (error as RequestError).statusCode === 403
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(() => getUserRole())
  const [deletingOrderId, setDeletingOrderId] = useState('')
  const [cancellingOrderId, setCancellingOrderId] = useState('')
  const [confirmingOrderId, setConfirmingOrderId] = useState('')

  const loadOrders = async (currentRole: UserRole | null) => {
    const nextOrders =
      currentRole === 'chef' ? await getAllOrders() : await getOrderList()
    setOrders(nextOrders)
  }

  const syncRoleAndOrders = async () => {
    setLoading(true)

    try {
      const authInfo = await checkAuth()
      setRole(authInfo.role)
      await loadOrders(authInfo.role)
    } catch (error) {
      console.error('同步权限信息失败，使用本地角色继续加载订单:', error)
      const cachedRole = getUserRole()
      setRole(cachedRole)

      if (!hasToken() || !cachedRole) {
        setOrders([])
        return
      }

      try {
        await loadOrders(cachedRole)
      } catch (loadError) {
        console.error('加载订单失败:', loadError)
        Taro.showToast({ title: '加载订单失败', icon: 'none' })
      }
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void syncRoleAndOrders()
  })

  const canConfirmOrder = role === 'chef'

  const canDeleteOrder = (status: OrderStatus) => {
    return role !== 'chef' && deletableOrderStatuses.includes(status)
  }

  const canCancelOrder = (status: OrderStatus) => {
    return cancellableOrderStatuses.includes(status)
  }

  const canShowConfirmAction = (order: Order) => {
    return canConfirmOrder && order.status === 'pending'
  }

  const getTotalDishCount = (order: Order) => {
    return order.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const handleDeleteOrder = async (order: Order) => {
    const modalRes = await Taro.showModal({
      title: '删除订单',
      content: '删除后订单记录将从列表中移除，确认删除吗？',
      confirmColor: '#e26d5a'
    })

    if (!modalRes.confirm) {
      return
    }

    try {
      setDeletingOrderId(order.id)
      Taro.showLoading({ title: '删除中...', mask: true })
      await deleteOrder(order.id)
      await loadOrders(role)
      Taro.showToast({ title: '删除成功', icon: 'success' })
    } catch (error) {
      console.error('删除订单失败:', error)
      Taro.showToast({ title: '删除失败', icon: 'none' })
    } finally {
      setDeletingOrderId('')
      Taro.hideLoading()
    }
  }

  const handleCancelOrder = async (order: Order) => {
    const modalRes = await Taro.showModal({
      title: '取消订单',
      content: '确认取消该订单吗？取消后将通知主厨。',
      confirmColor: '#e26d5a'
    })

    if (!modalRes.confirm) {
      return
    }

    try {
      setCancellingOrderId(order.id)
      Taro.showLoading({ title: '取消中...', mask: true })
      await cancelOrder(order.id)
      await loadOrders(role)
      Taro.showToast({ title: '取消成功', icon: 'success' })
    } catch (error) {
      console.error('取消订单失败:', error)
      Taro.showToast({ title: '取消失败', icon: 'none' })
    } finally {
      setCancellingOrderId('')
      Taro.hideLoading()
    }
  }

  const handleConfirmOrder = async (order: Order) => {
    if (confirmingOrderId || !canShowConfirmAction(order)) {
      return
    }

    try {
      setConfirmingOrderId(order.id)
      Taro.showLoading({ title: '确认中...', mask: true })
      await updateOrderStatus(order.id, 'confirmed')
      await loadOrders(role)
      Taro.showToast({ title: '确认成功', icon: 'success' })
    } catch (error) {
      console.error('确认订单失败:', error)

      if (isForbiddenError(error)) {
        Taro.showToast({ title: '您没有确认订单权限', icon: 'none' })
      } else {
        Taro.showToast({ title: '确认订单失败', icon: 'none' })
      }
    } finally {
      setConfirmingOrderId('')
      Taro.hideLoading()
    }
  }

  if (loading) {
    return (
      <PageShell title='我的订单'>
        <View className='loading-container'>
          <Text className='loading-text'>加载中...</Text>
        </View>
      </PageShell>
    )
  }

  return (
    <>
      <PageShell title='我的订单'>
        {orders.length > 0 ? (
          <>
            {orders.map((order) => (
              <View className='order-card card' key={order.id}>
                <View className='order-card__top'>
                  <Text className='order-card__id'>订单号 #{order.order_no}</Text>
                  <Text
                    className={`order-card__status ${statusClassMap[order.status]}`}
                  >
                    {statusTextMap[order.status]}
                  </Text>
                </View>

                <View className='order-card__meta'>
                  <Text className='order-card__meta-item'>
                    {formatDate(order.order_date)}
                  </Text>
                  <Text className='order-card__meta-item'>{order.meal_type}</Text>
                  <Text className='order-card__meta-item'>
                    {order.people_count}人
                  </Text>
                </View>

                <View className='order-card__divider' />

                {order.items.map((item) => (
                  <View className='order-card__dish' key={item.id}>
                    <View className='order-card__dish-info'>
                      <Text className='order-card__dish-name'>
                        {item.dish_name}
                      </Text>
                      <Text className='order-card__dish-count'>
                        数量 x {item.quantity}
                      </Text>
                    </View>
                  </View>
                ))}

                <View className='order-card__divider' />

                <View className='order-card__summary'>
                  <Text className='order-card__summary-left'>
                    共 {getTotalDishCount(order)} 份菜品
                  </Text>
                  <Text className='order-card__summary-right'>
                    {order.items.length} 道菜
                  </Text>
                </View>

                <Text className='order-card__time'>
                  下单时间：{formatTime(order.created_at)}
                </Text>

                {(canShowConfirmAction(order) || canDeleteOrder(order.status) || canCancelOrder(order.status)) && (
                  <View className='order-card__actions'>
                    {canShowConfirmAction(order) ? (
                      <Text
                        className={`order-card__action order-card__action--primary ${confirmingOrderId === order.id ? 'order-card__action--disabled' : ''}`}
                        onClick={() => {
                          void handleConfirmOrder(order)
                        }}
                      >
                        {confirmingOrderId === order.id ? '确认中...' : '确认订单'}
                      </Text>
                    ) : null}

                    {canDeleteOrder(order.status) ? (
                      <Text
                        className={`order-card__action order-card__action--danger ${deletingOrderId === order.id ? 'order-card__action--disabled' : ''}`}
                        onClick={() => {
                          if (deletingOrderId === order.id) {
                            return
                          }

                          void handleDeleteOrder(order)
                        }}
                      >
                        {deletingOrderId === order.id ? '删除中...' : '删除订单'}
                      </Text>
                    ) : null}

                    {canCancelOrder(order.status) ? (
                      <Text
                        className={`order-card__action order-card__action--danger ${cancellingOrderId === order.id ? 'order-card__action--disabled' : ''}`}
                        onClick={() => {
                          if (cancellingOrderId === order.id) {
                            return
                          }

                          void handleCancelOrder(order)
                        }}
                      >
                        {cancellingOrderId === order.id ? '取消中...' : '取消订单'}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            ))}
          </>
        ) : (
          <View className='orders-empty'>
            <View className='orders-empty__icon'>
              <Text className='orders-empty__icon-text'>订单</Text>
            </View>
            <Text className='orders-empty__title'>暂无订单</Text>
            <Text className='orders-empty__desc'>
              您的订单记录将显示在这里
            </Text>
          </View>
        )}
      </PageShell>
      <GlobalAssistant />
    </>
  )
}
