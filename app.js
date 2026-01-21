// app.js
App({
  onLaunch() {
    // 初始化云开发（如果已配置）
    if (wx.cloud) {
      wx.cloud.init({
        // 如果已配置云开发环境ID，可以在这里指定
        // env: 'your-env-id',
        traceUser: true
      })
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null
  }
})
