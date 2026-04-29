import { api } from '../utils/request'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'completed' | 'cancelled'

export interface OrderItem {
  dishId: string
  dishName: string
  quantity: number
}

export interface CreateOrderParams {
  items: OrderItem[]
  date: string
  meal: string
  peopleCount: number
  remark?: string
}

interface BackendCreateOrderParams {
  order_date: string
  meal_type: string
  people_count: number
  items: { dish_id: string; quantity: number }[]
}

export interface Order {
  id: string
  order_no: string
  user_id: string
  order_date: string
  meal_type: string
  people_count: number
  status: OrderStatus
  remark: string
  created_at: string
  updated_at: string
  items: {
    id: string
    order_id: string
    dish_id: string
    dish_name: string
    dish_image: string
    quantity: number
    created_at: string
  }[]
}

export function createOrder(params: CreateOrderParams) {
  if (!params.date) {
    return Promise.reject(new Error('请选择用餐日期'))
  }

  if (!params.meal) {
    return Promise.reject(new Error('请选择餐期'))
  }

  if (!params.peopleCount || params.peopleCount < 1) {
    return Promise.reject(new Error('人数至少为 1'))
  }

  if (!params.items.length) {
    return Promise.reject(new Error('请先选择菜品'))
  }

  const backendParams: BackendCreateOrderParams = {
    order_date: params.date,
    meal_type: params.meal,
    people_count: params.peopleCount,
    items: params.items.map((item) => ({
      dish_id: item.dishId,
      quantity: item.quantity
    }))
  }

  return api
    .post<{ code: number; data: Order; message: string }>('/orders', backendParams)
    .then((res) => res.data)
}

export function getOrderList() {
  return api.get<{ code: number; data: Order[]; message: string }>('/orders').then((res) => res.data)
}

export function getOrderById(id: string) {
  return api.get<{ code: number; data: Order; message: string }>(`/orders/${id}`).then((res) => res.data)
}

export function cancelOrder(id: string) {
  return api.put<{ code: number; message: string }>(`/orders/${id}/cancel`).then((res) => res)
}

export function deleteOrder(id: string) {
  return api
    .delete<{ code: number; data: { id: string }; message: string }>(`/orders/${id}`)
    .then((res) => res.data)
}

export function getAllOrders() {
  return api.get<{ code: number; data: Order[]; message: string }>('/orders/admin/all').then((res) => res.data)
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return api
    .put<{ code: number; data: { id: string; status: OrderStatus }; message: string }>(
      `/orders/admin/${id}/status`,
      { status }
    )
    .then((res) => res.data)
}
