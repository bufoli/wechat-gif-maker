// index.js
Page({
  data: {
    sections: {
      public: {
        name: '公共版权免费绘本',
        icon: '📚',
        desc: '经典童话故事，免费阅读'
      },
      original: {
        name: '朵吉原创绘本',
        icon: '✨',
        desc: '独家原创故事，精彩纷呈'
      },
      custom: {
        name: '私人订制绘本',
        icon: '🎨',
        desc: '专属定制，独一无二'
      }
    }
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '朵吉儿童绘本屋'
    })
  },

  // 选择板块
  selectSection(e) {
    const section = e.currentTarget.dataset.section
    console.log('选择板块:', section)
    
    // 根据板块跳转到不同页面
    if (section === 'custom') {
      // 私人订制直接跳转到定制页面
      wx.navigateTo({
        url: '/pages/custom-book/custom-book'
      })
    } else {
      // 公共版权和原创绘本跳转到列表页面
      wx.navigateTo({
        url: `/pages/book-list/book-list?section=${section}`
      })
    }
  }
})
