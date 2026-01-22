// 视频抽帧工具函数
/**
 * 将视频抽帧为指定帧率
 * @param {Object} params - 参数对象
 * @param {String} params.videoPath - 视频路径
 * @param {Number} params.fps - 目标帧率（默认12）
 * @returns {Promise} 返回处理后的视频路径
 */
const resampleVideo = (params) => {
  return new Promise((resolve, reject) => {
    const {
      videoPath,
      fps = 12
    } = params

    if (!videoPath) {
      reject(new Error('视频路径不能为空'))
      return
    }

    // 检查云函数是否可用
    if (typeof wx.cloud === 'undefined' || !wx.cloud.callFunction) {
      wx.showModal({
        title: '需要云开发支持',
        content: '视频抽帧功能需要配置云开发环境。\n\n请在小程序管理后台开启云开发服务。',
        showCancel: false,
        success: () => {
          reject(new Error('需要配置云开发'))
        }
      })
      return
    }

    wx.showLoading({
      title: '正在处理视频...',
      mask: true
    })

    // 调用云函数
    wx.cloud.callFunction({
      name: 'videoResample',
      data: {
        videoPath: videoPath,
        fps: fps,
        uploadToCloud: false // 处理后的视频返回临时路径
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          resolve({
            success: true,
            filePath: res.result.filePath,
            message: res.result.message || '视频处理完成'
          })
        } else {
          const errorMsg = res.result?.error || res.result?.message || '视频处理失败'
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          })
          reject(new Error(errorMsg))
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('云函数调用失败:', err)
        
        // 如果云函数不存在，提示配置
        if (err.errMsg && err.errMsg.includes('not found')) {
          wx.showModal({
            title: '云函数未配置',
            content: '视频抽帧功能需要配置videoResample云函数。\n\n请参考文档创建云函数。',
            showCancel: false,
            success: () => {
              reject(new Error('云函数未配置'))
            }
          })
        } else {
          wx.showToast({
            title: '处理失败，请重试',
            icon: 'none'
          })
          reject(err)
        }
      }
    })
  })
}

module.exports = {
  resampleVideo
}
