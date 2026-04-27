import { api } from '../utils/request'
import type { Category } from './dish'

export interface ManagedDish {
  id: string
  category_id: string
  name: string
  description: string
  image_url: string
  tag: string
  is_active: number
  sort_order: number
  created_at: string
  updated_at?: string
  category?: Category
}

export interface CreateManagedDishParams {
  category_id: string
  name?: string
  dish_name?: string
  description?: string
  remark?: string
  image_url?: string
  tag?: string
  sort_order?: number
  is_active?: number
}

export type UpdateManagedDishParams = Partial<CreateManagedDishParams>

export function getManagedDishes() {
  return api
    .get<{ code: number; data: ManagedDish[]; message: string }>('/dishes')
    .then((res) => res.data)
}

export function createManagedDish(params: CreateManagedDishParams) {
  return api
    .post<{ code: number; data: ManagedDish; message: string }>('/dishes', params)
    .then((res) => res.data)
}

export function deleteManagedDish(id: string) {
  return api.delete<{ code: number; data: { id: string }; message: string }>(`/dishes/${id}`)
}

export function updateManagedDish(id: string, params: UpdateManagedDishParams) {
  return api
    .put<{ code: number; data: ManagedDish; message: string }>(`/dishes/${id}`, params)
    .then((res) => res.data)
}

export function getAllManagedDishes() {
  return api
    .get<{ code: number; data: ManagedDish[]; message: string }>('/wishlists/admin/all')
    .then((res) => res.data)
}
