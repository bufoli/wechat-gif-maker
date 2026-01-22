// index.js
Page({
  data: {
    categories: {
      gongxifacai: {
        name: '恭喜发财',
        icon: '🎉',
        desc: '新年祝福，财源广进'
      },
      jixiangruyi: {
        name: '吉祥如意',
        icon: '✨',
        desc: '吉祥祝福，万事如意'
      },
      tongyongzhufu: {
        name: '通用祝福',
        icon: '🎊',
        desc: '通用祝福，适用广泛'
      }
    }
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '吉祥表情包制作工具'
    })
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    console.log('选择分类:', category)
    
    // 跳转到分类页面
    wx.navigateTo({
      url: `/pages/frame-select/frame-select?category=${category}`
    })
  }
})
