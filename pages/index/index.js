// index.js
Page({
  data: {
    
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '透明底表情包制作工具'
    })
  },

  // 首页直接选择视频（10秒）
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 10,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        const duration = res.tempFiles[0].duration

        if (duration > 10) {
          wx.showToast({
            title: '视频时长不能超过10秒',
            icon: 'none'
          })
          return
        }

        wx.navigateTo({
          url: `/pages/video-edit/video-edit?videoPath=${encodeURIComponent(tempFilePath)}`
        })
      },
      fail: () => {
        // 用户取消不提示
      }
    })
  }
})
