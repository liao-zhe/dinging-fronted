import { api } from '../utils/request'

// 菜品分类
export interface Category {
  id: string
  name: string
  sort_order: number
  is_active: number
  created_at: string
}

// 菜品
export interface Dish {
  id: string
  category_id: string
  name: string
  description: string
  image_url: string
  tag: string
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string
  category: Category
}

// 获取所有分类
export function getCategories() {
  return api.get<{ code: number; data: Category[]; message: string }>('/dishes/categories').then(res => res.data)
}

// 获取菜品列表
export function getDishList() {
  return api.get<{ code: number; data: Dish[]; message: string }>('/dishes').then(res => res.data)
}

// 按分类获取菜品
export function getDishesByCategory(categoryId: string) {
  return api.get<{ code: number; data: Dish[]; message: string }>(`/dishes/category/${categoryId}`).then(res => res.data)
}

// 搜索菜品
export function searchDishes(keyword: string) {
  return api.get<{ code: number; data: Dish[]; message: string }>('/dishes/search', { keyword }).then(res => res.data)
}

// 获取单个菜品
export function getDishById(id: string) {
  return api.get<{ code: number; data: Dish; message: string }>(`/dishes/${id}`).then(res => res.data)
}
