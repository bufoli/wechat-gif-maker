// 序列帧处理工具函数

/**
 * 将视频转换为序列帧
 * @param {Object} params - 参数对象
 * @param {String} params.videoPath - 视频路径
 * @param {Number} params.fps - 帧率（默认12）
 * @param {Number} params.width - 宽度（默认240）
 * @param {Number} params.height - 高度（默认240）
 * @returns {Promise} 返回序列帧URL数组
 */
const videoToFrames = (params) => {
  return new Promise((resolve, reject) => {
    const {
      videoPath,
      fps = 12,
      width = 240,
      height = 240
    } = params

    if (!videoPath) {
      reject(new Error('视频路径不能为空'))
      return
    }

    // 检查云函数是否可用
    if (typeof wx.cloud === 'undefined' || !wx.cloud.callFunction) {
      wx.showModal({
        title: '需要云开发支持',
        content: '视频转序列帧功能需要配置云开发环境。\n\n请在小程序管理后台开启云开发服务。',
        showCancel: false,
        success: () => {
          reject(new Error('需要配置云开发'))
        }
      })
      return
    }

    wx.showLoading({
      title: '正在生成序列帧...',
      mask: true
    })

    // 调用云函数
    wx.cloud.callFunction({
      name: 'videoToFrames',
      data: {
        videoPath: videoPath,
        fps: fps,
        width: width,
        height: height
      },
              success: (res) => {
                wx.hideLoading()
                
                // 优先检查是否应该使用本地处理
                if (res.result && (res.result.useLocalProcessing || res.result.error === 'USE_LOCAL_PROCESSING')) {
                  console.log('✅ 云函数返回本地处理标记，返回给前端处理')
                  // 返回一个特殊结果，让前端知道要使用本地处理
                  resolve({
                    success: false,
                    useLocalProcessing: true,
                    videoInfo: res.result?.videoInfo,
                    frameUrls: []
                  })
                  return
                }
                
                if (res.result && res.result.success) {
                  // 如果是测试模式，显示提示
                  if (res.result.message && res.result.message.includes('测试模式')) {
                    wx.showToast({
                      title: '测试模式：使用模拟数据',
                      icon: 'none',
                      duration: 2000
                    })
                  }
                  resolve({
                    success: true,
                    frameUrls: res.result.frameUrls || []
                  })
                } else {
                  const errorMsg = res.result?.error || res.result?.message || '序列帧生成失败'
                  
                  // 检查是否是FFmpeg未配置的错误
                  if (errorMsg.includes('FFmpeg') || errorMsg.includes('需要配置') || errorMsg.includes('需要完善') || res.result?.needsFFmpeg) {
                    console.log('云函数代码未完善，自动进入测试模式')
                    // 直接返回测试模式标记，不弹窗
                    reject(new Error('USE_TEST_MODE'))
                  } else {
                    wx.showToast({
                      title: errorMsg,
                      icon: 'none',
                      duration: 3000
                    })
                    reject(new Error(errorMsg))
                  }
                }
              },
      fail: (err) => {
        wx.hideLoading()
        console.error('云函数调用失败:', err)
        
        // 检查是否是云函数未找到的错误
        const errMsg = err.errMsg || err.errCode || ''
        const isFunctionNotFound = 
          errMsg.includes('not found') || 
          errMsg.includes('FUNCTION_NOT_FOUND') ||
          errMsg.includes('FunctionName parameter could not be found') ||
          err.errCode === -501000
        
        if (isFunctionNotFound) {
          wx.showModal({
            title: '云函数未配置',
            content: '视频转序列帧功能需要配置云函数。\n\n请按照以下步骤操作：\n1. 在微信开发者工具中打开"云开发"控制台\n2. 创建并部署"videoToFrames"云函数\n3. 参考项目中的"云开发配置详细步骤.md"文档',
            showCancel: false,
            confirmText: '我知道了',
            success: () => {
              reject(new Error('云函数未配置'))
            }
          })
        } else {
          wx.showModal({
            title: '处理失败',
            content: `错误信息：${errMsg || '未知错误'}\n\n请检查云开发环境配置。`,
            showCancel: false,
            success: () => {
              reject(err)
            }
          })
        }
      }
    })
  })
}

/**
 * 将序列帧合成为透明底GIF
 * @param {Object} params - 参数对象
 * @param {Array} params.frameUrls - 序列帧URL数组
 * @param {Object} params.chromaKey - 抠图参数
 * @param {Number} params.fps - 帧率（默认12）
 * @param {Number} params.maxSize - 最大文件大小（默认500KB）
 * @returns {Promise} 返回GIF文件路径
 */
const framesToGif = (params) => {
  return new Promise((resolve, reject) => {
    const {
      frameUrls,
      chromaKey = {
        enabled: true,
        color: { r: 0, g: 255, b: 0 },
        threshold: 30
      },
      fps = 12,
      maxSize = 500 * 1024
    } = params

    if (!frameUrls || frameUrls.length === 0) {
      reject(new Error('序列帧不能为空'))
      return
    }

    // 检查云函数是否可用
    if (typeof wx.cloud === 'undefined' || !wx.cloud.callFunction) {
      wx.showModal({
        title: '需要云开发支持',
        content: 'GIF合成功能需要配置云开发环境。',
        showCancel: false,
        success: () => {
          reject(new Error('需要配置云开发'))
        }
      })
      return
    }

    wx.showLoading({
      title: '正在合成GIF...',
      mask: true
    })

    // 调用云函数
    wx.cloud.callFunction({
      name: 'framesToGif',
      data: {
        frameUrls: frameUrls,
        chromaKey: chromaKey,
        fps: fps,
        maxSize: maxSize
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          resolve({
            success: true,
            filePath: res.result.filePath
          })
        } else {
          const errorMsg = res.result?.error || res.result?.message || 'GIF合成失败'
          
          // 检查是否是云函数代码未完善
          if (errorMsg.includes('FFmpeg') || errorMsg.includes('需要配置') || res.result?.needsFFmpeg) {
            wx.showModal({
              title: '云函数代码需要完善',
              content: res.result?.message || 'framesToGif云函数已部署，但代码需要完善。\n\n当前代码只是框架，需要添加FFmpeg处理逻辑才能实际合成GIF。\n\n请参考项目中的"完善云函数代码-详细步骤.md"文档。',
              showCancel: false,
              confirmText: '我知道了',
              success: () => {
                reject(new Error(errorMsg))
              }
            })
          } else {
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 3000
            })
            reject(new Error(errorMsg))
          }
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('云函数调用失败:', err)
        
        // 检查是否是云函数未找到的错误
        const errMsg = err.errMsg || err.errCode || ''
        const isFunctionNotFound = 
          errMsg.includes('not found') || 
          errMsg.includes('FUNCTION_NOT_FOUND') ||
          errMsg.includes('FunctionName parameter could not be found') ||
          err.errCode === -501000
        
        if (isFunctionNotFound) {
          wx.showModal({
            title: '云函数未配置',
            content: 'GIF合成功能需要配置云函数。\n\n请按照以下步骤操作：\n1. 在微信开发者工具中打开"云开发"控制台\n2. 创建并部署"framesToGif"云函数\n3. 参考项目中的"云开发配置详细步骤.md"文档',
            showCancel: false,
            confirmText: '我知道了',
            success: () => {
              reject(new Error('云函数未配置'))
            }
          })
        } else {
          wx.showModal({
            title: '合成失败',
            content: `错误信息：${errMsg || '未知错误'}\n\n请检查云开发环境配置。`,
            showCancel: false,
            success: () => {
              reject(err)
            }
          })
        }
      }
    })
  })
}

module.exports = {
  videoToFrames,
  framesToGif
}
