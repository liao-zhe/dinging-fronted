export default {
  pages: [
    'pages/login/index',
    'pages/home/index',
    'pages/orders/index',
    'pages/profile/index',
    'pages/cart/index'
  ],
  window: {
    navigationStyle: 'custom',
    backgroundTextStyle: 'light',
    backgroundColor: '#f9f0df'
  },
  tabBar: {
    color: '#697385',
    selectedColor: '#f59f54',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '点单',
        iconPath: 'assets/icons/tab-home.png',
        selectedIconPath: 'assets/icons/tab-home-active.png'
      },
      {
        pagePath: 'pages/orders/index',
        text: '订单',
        iconPath: 'assets/icons/tab-orders.png',
        selectedIconPath: 'assets/icons/tab-orders-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/tab-profile.png',
        selectedIconPath: 'assets/icons/tab-profile-active.png'
      }
    ]
  }
}
