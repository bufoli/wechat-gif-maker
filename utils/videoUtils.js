// utils/videoUtils.js

/**
 * 导出视频为GIF
 * 参数：
 * - videoPath: 视频路径
 * - startTime: 开始时间（秒）
 * - endTime: 结束时间（秒）
 * - fps: 帧率（默认12）
 * - width: 宽度（默认240）
 * - height: 高度（默认240）
 * - maxSize: 最大文件大小（字节，默认500KB）
 * 
 * 返回：Promise，resolve时返回 { success: true, filePath: '...' } 或 { success: false, error: '...' }
 */
const exportVideoToGIF = (params) => {
  return new Promise((resolve, reject) => {
    const {
      videoPath,
      startTime = 0,
      endTime = 10,
      fps = 12,
      width = 240,
      height = 240,
      maxSize = 500 * 1024
    } = params

    // 检查参数
    if (!videoPath) {
      reject(new Error('视频路径不能为空'))
      return
    }

    if (endTime <= startTime) {
      reject(new Error('结束时间必须大于开始时间'))
      return
    }

    // 注意：完整的GIF生成需要云函数支持
    // 小程序端无法直接生成GIF文件
    // 这里提供一个调用云函数的框架
    
    // 检查是否配置了云函数
    if (typeof wx.cloud !== 'undefined' && wx.cloud.callFunction) {
      // 调用云函数生成GIF
      wx.cloud.callFunction({
        name: 'videoToGif',
        data: {
          videoPath: videoPath,
          startTime: startTime,
          endTime: endTime,
          fps: fps,
          width: width,
          height: height,
          maxSize: maxSize
        },
        success: (res) => {
          if (res.result && res.result.success) {
            resolve({
              success: true,
              filePath: res.result.filePath
            })
          } else {
            reject(new Error(res.result?.error || '云函数返回错误'))
          }
        },
        fail: (err) => {
          console.error('云函数调用失败:', err)
          // 如果云函数未配置，提供降级方案提示
          wx.showModal({
            title: '提示',
            content: 'GIF导出功能需要配置云函数支持。\n\n请参考文档配置videoToGif云函数，或使用其他视频处理服务。',
            showCancel: false,
            success: () => {
              reject(new Error('需要配置云函数'))
            }
          })
        }
      })
    } else {
      // 未配置云函数，提示用户
      wx.showModal({
        title: '提示',
        content: 'GIF导出功能需要配置云函数支持。\n\n请在小程序管理后台配置云开发环境，并创建videoToGif云函数。',
        showCancel: false,
        success: () => {
          reject(new Error('需要配置云函数'))
        }
      })
    }
  })
}

/**
 * 使用Canvas处理视频帧（简化版本，仅用于演示）
 * 实际项目中建议使用云函数
 */
const processVideoFrame = (videoPath, frameTime, canvasId) => {
  return new Promise((resolve, reject) => {
    const ctx = wx.createCanvasContext(canvasId)
    // 这里需要视频播放到指定时间点并截图
    // 由于小程序限制，实际实现较复杂
    // 建议使用云函数处理
    resolve()
  })
}

module.exports = {
  exportVideoToGIF,
  processVideoFrame
}
