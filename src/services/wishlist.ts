export {
  createManagedDish as addWishlist,
  deleteManagedDish as deleteWishlist,
  getAllManagedDishes as getAllWishlists,
  getManagedDishes as getWishlists,
  updateManagedDish as updateWishlist
} from './managed-dish'

export type {
  CreateManagedDishParams,
  ManagedDish,
  UpdateManagedDishParams
} from './managed-dish'
