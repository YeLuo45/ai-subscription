export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/subscriptions/index',
    'pages/settings/index',
    'pages/detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1a1a2e',
    navigationBarTitleText: 'AI 订阅',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#6c63ff',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '摘要',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png'
      },
      {
        pagePath: 'pages/subscriptions/index',
        text: '订阅',
        iconPath: 'assets/icons/sub.png',
        selectedIconPath: 'assets/icons/sub-active.png'
      },
      {
        pagePath: 'pages/settings/index',
        text: '设置',
        iconPath: 'assets/icons/settings.png',
        selectedIconPath: 'assets/icons/settings-active.png'
      }
    ]
  }
})
