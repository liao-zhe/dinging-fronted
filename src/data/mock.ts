const dishPlaceholder = '/assets/icons/tab-home-active.png'

export type Category = {
  id: string
  label: string
}

export type Dish = {
  id: string
  name: string
  desc: string
  tag: string
  image: string
  category: string
  selected?: boolean
}

export type CartItem = {
  id: string
  name: string
  qty: number
  image: string
}

export type Order = {
  id: string
  status: string
  date: string
  meal: string
  people: string
  dishName: string
  time: string
  image: string
}

export const categories: Category[] = [
  { id: 'all', label: '全部' },
  { id: 'signature', label: '招牌菜' },
  { id: 'hot', label: '热菜' },
  { id: 'cold', label: '凉菜' },
  { id: 'dessert', label: '点心' },
  { id: 'staple', label: '主食' },
  { id: 'seafood', label: '海鲜' }
]

export const featuredDishes: Dish[] = [
  {
    id: 'dish-1',
    name: '北京烤鸭',
    desc: '传统挂炉烤制，皮酥肉嫩，配荷叶饼、甜面酱',
    tag: '热销',
    category: 'signature',
    image: '/assets/icons/tab-home-active.png',
    selected: true
  },
  {
    id: 'dish-2',
    name: '宫保鸡丁',
    desc: '川菜经典，鸡肉嫩滑，花生香脆，酸甜微辣',
    tag: '热销',
    category: 'hot',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-3',
    name: '麻婆豆腐',
    desc: '豆腐细嫩入味，麻香浓郁，适合配米饭',
    tag: '热销',
    category: 'hot',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-4',
    name: '咕咾肉',
    desc: '酸甜开胃，外酥里嫩，适合全家共享',
    tag: '推荐',
    category: 'hot',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-5',
    name: '凉拌黄瓜',
    desc: '清爽开胃，蒜香浓郁，夏日必备凉菜',
    tag: '清爽',
    category: 'cold',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-6',
    name: '皮蛋豆腐',
    desc: '经典凉菜，口感细腻，配特制酱汁',
    tag: '经典',
    category: 'cold',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-7',
    name: '蛋挞',
    desc: '酥脆外皮，香滑蛋奶馅，下午茶首选',
    tag: '甜品',
    category: 'dessert',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-8',
    name: '芒果布丁',
    desc: '新鲜芒果制作，口感顺滑，甜而不腻',
    tag: '人气',
    category: 'dessert',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-9',
    name: '扬州炒饭',
    desc: '粒粒分明，配料丰富，经典主食',
    tag: '主食',
    category: 'staple',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-10',
    name: '葱油拌面',
    desc: '葱香四溢，面条劲道，简单美味',
    tag: '主食',
    category: 'staple',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-11',
    name: '清蒸鲈鱼',
    desc: '新鲜鲈鱼，清蒸保留原味，鲜嫩可口',
    tag: '海鲜',
    category: 'seafood',
    image: '/assets/icons/tab-home-active.png'
  },
  {
    id: 'dish-12',
    name: '蒜蓉粉丝蒸扇贝',
    desc: '扇贝鲜美，蒜香浓郁，粉丝入味',
    tag: '海鲜',
    category: 'seafood',
    image: '/assets/icons/tab-home-active.png'
  }
]

export const cartItems: CartItem[] = [
  {
    id: 'cart-1',
    name: '北京烤鸭',
    qty: 1,
    image: featuredDishes[0].image
  }
]

export const orders: Order[] = [
  {
    id: '36180640',
    status: '待确认',
    date: '04月14日',
    meal: '午餐',
    people: '2人',
    dishName: '北京烤鸭',
    time: '2026-04-14 11:09',
    image: featuredDishes[0].image
  }
]

export const familyHeader = {
  title: '家庭私厨',
  subtitle: '精选食材 · 匠心烹制'
}

export const homeInfo = [
  { label: '日期', value: '04月14日' },
  { label: '餐期', value: '午餐' },
  { label: '人数', value: '2' }
]


