// index.js
const frameUtils = require('../../utils/frameUtils.js')

Page({
  data: {
    processing: false // 是否正在处理视频
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '透明底表情包制作工具'
    })
    
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      })
    }
  },

  // 首页直接选择视频（10秒）
  chooseVideo() {
    if (this.data.processing) {
      wx.showToast({
        title: '正在处理视频，请稍候',
        icon: 'none'
      })
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 10,
      camera: 'back',
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        const duration = res.tempFiles[0].duration

        if (duration > 10) {
          wx.showToast({
            title: '视频时长不能超过10秒',
            icon: 'none'
          })
          return
        }

        // 自动将视频转换为12fps的240x240序列帧，并自动识别和抠除背景
        this.setData({ processing: true })
        
        try {
          wx.showLoading({
            title: '正在上传视频...',
            mask: true
          })

          // 先上传视频到云存储
          let uploadRes
          try {
            uploadRes = await new Promise((resolve, reject) => {
              if (!wx.cloud || !wx.cloud.uploadFile) {
                reject(new Error('云开发未初始化'))
                return
              }
              
              wx.cloud.uploadFile({
                cloudPath: `videos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`,
                filePath: tempFilePath,
                success: resolve,
                fail: reject
              })
            })
          } catch (uploadError) {
            wx.hideLoading()
            throw new Error('视频上传失败，请检查云开发配置')
          }

          wx.showLoading({
            title: '正在生成序列帧...',
            mask: true
          })

          // 调用云函数生成序列帧
          let framesResult
          try {
            framesResult = await frameUtils.videoToFrames({
              videoPath: uploadRes.fileID,
              fps: 12,
              width: 240,
              height: 240
            })
          } catch (cloudError) {
            // 云函数调用失败，检查是否是测试模式标记
            if (cloudError.message === 'USE_TEST_MODE') {
              // 用户选择了测试模式，直接进入测试模式
              wx.hideLoading()
              const estimatedFrames = Math.ceil(duration * 12)
              const testFrameUrls = []
              for (let i = 0; i < Math.min(estimatedFrames, 120); i++) {
                testFrameUrls.push(tempFilePath)
              }
              
              const frameUrlsStr = JSON.stringify(testFrameUrls)
              wx.navigateTo({
                url: `/pages/video-edit/video-edit?frameUrls=${encodeURIComponent(frameUrlsStr)}&videoPath=${encodeURIComponent(tempFilePath)}&isTestMode=true`
              })
              this.setData({ processing: false })
              return
            }
            
            // 其他错误，使用降级方案（测试模式）
            console.warn('云函数调用失败，使用测试模式:', cloudError)
            wx.hideLoading()
            
            // 提示用户，但允许使用测试模式
            wx.showModal({
              title: '提示',
              content: '云函数调用失败。\n\n当前使用测试模式，可以预览界面效果。\n\n要使用完整功能，请完善videoToFrames云函数代码。',
              showCancel: true,
              cancelText: '取消',
              confirmText: '继续测试',
              success: (res) => {
                if (res.confirm) {
                  // 使用测试模式，直接跳转
                  this.enterTestMode(tempFilePath, duration)
                } else {
                  this.setData({ processing: false })
                }
              },
              fail: () => {
                // 如果用户直接关闭弹窗，也进入测试模式
                this.enterTestMode(tempFilePath, duration)
              }
            })
            return
          }
          
          if (!framesResult.success || !framesResult.frameUrls || framesResult.frameUrls.length === 0) {
            // 云函数返回失败，也使用降级方案
            console.warn('序列帧生成失败，使用测试模式')
            wx.hideLoading()
            
            wx.showModal({
              title: '提示',
              content: '序列帧生成失败。\n\n当前使用测试模式，可以预览界面效果。\n\n要使用完整功能，请完善videoToFrames云函数代码。',
              showCancel: true,
              cancelText: '取消',
              confirmText: '继续测试',
              success: (res) => {
                if (res.confirm) {
                  this.enterTestMode(tempFilePath, duration)
                } else {
                  this.setData({ processing: false })
                }
              },
              fail: () => {
                this.enterTestMode(tempFilePath, duration)
              }
            })
            return
          }

          wx.showLoading({
            title: '正在识别背景并抠图...',
            mask: true
          })

          // 自动识别大面积纯色背景并抠除
          const processedResult = await this.autoDetectAndRemoveBackground(framesResult.frameUrls)
          
          wx.hideLoading()

          // 跳转到编辑页，传递已处理的序列帧和原始序列帧
          const processedFramesStr = JSON.stringify(processedResult.processedFrames)
          const originalFramesStr = JSON.stringify(framesResult.frameUrls) // 保存原始序列帧用于重新处理
          const colorInfoStr = JSON.stringify({
            r: processedResult.detectedColor.r,
            g: processedResult.detectedColor.g,
            b: processedResult.detectedColor.b
          })
          
          // 保存原始视频路径（从上传结果中获取）
          const originalVideoPath = uploadRes.fileID || tempFilePath
          
          wx.navigateTo({
            url: `/pages/video-edit/video-edit?processedFrames=${encodeURIComponent(processedFramesStr)}&originalFrames=${encodeURIComponent(originalFramesStr)}&detectedColor=${encodeURIComponent(colorInfoStr)}&threshold=30&originalVideoPath=${encodeURIComponent(originalVideoPath)}`
          })
          
        } catch (error) {
          wx.hideLoading()
          console.error('处理失败:', error)
          
          // 如果是云开发相关的错误，提供更友好的提示
          const errorMsg = error.message || '处理失败，请重试'
          let content = errorMsg
          
          if (errorMsg.includes('云开发') || errorMsg.includes('云函数') || errorMsg.includes('FFmpeg')) {
            content = `${errorMsg}\n\n当前功能需要配置云函数才能使用。\n\n您可以：\n1. 参考"云开发配置详细步骤.md"配置云函数\n2. 或使用测试模式预览界面效果`
            
            wx.showModal({
              title: '处理失败',
              content: content,
              showCancel: true,
              cancelText: '取消',
              confirmText: '使用测试模式',
              success: (res) => {
                if (res.confirm) {
                  // 使用测试模式
                  const estimatedFrames = Math.ceil(duration * 12)
                  const testFrameUrls = []
                  for (let i = 0; i < Math.min(estimatedFrames, 120); i++) {
                    testFrameUrls.push(tempFilePath)
                  }
                  
                  const frameUrlsStr = JSON.stringify(testFrameUrls)
                  wx.navigateTo({
                    url: `/pages/video-edit/video-edit?frameUrls=${encodeURIComponent(frameUrlsStr)}&videoPath=${encodeURIComponent(tempFilePath)}&isTestMode=true`
                  })
                }
              }
            })
          } else {
            wx.showModal({
              title: '处理失败',
              content: content,
              showCancel: false,
              confirmText: '我知道了'
            })
          }
        } finally {
          this.setData({ processing: false })
        }
      },
      fail: () => {
        // 用户取消不提示
        this.setData({ processing: false })
      }
    })
  },

  // 进入测试模式
  enterTestMode(videoPath, duration) {
    try {
      // 直接使用视频路径，不生成假的序列帧
      const videoPathEncoded = encodeURIComponent(videoPath)
      
      console.log('进入测试模式，视频路径:', videoPath)
      
      wx.navigateTo({
        url: `/pages/video-edit/video-edit?videoPath=${videoPathEncoded}&isTestMode=true&originalVideoPath=${videoPathEncoded}`,
        success: () => {
          console.log('跳转成功')
          this.setData({ processing: false })
        },
        fail: (err) => {
          console.error('跳转失败:', err)
          wx.showToast({
            title: '跳转失败，请重试',
            icon: 'none'
          })
          this.setData({ processing: false })
        }
      })
    } catch (error) {
      console.error('进入测试模式失败:', error)
      wx.showToast({
        title: '进入测试模式失败',
        icon: 'none'
      })
      this.setData({ processing: false })
    }
  },

  // 自动识别大面积纯色背景并抠除
  async autoDetectAndRemoveBackground(frameUrls) {
    return new Promise(async (resolve, reject) => {
      try {
        // 先下载第一帧用于检测背景颜色
        const firstFrameUrl = await this.downloadFrameToLocal(frameUrls[0])
        const detectedColor = await this.detectBackgroundColor([firstFrameUrl])
        
        console.log('检测到的背景颜色:', detectedColor)
        
        // 使用检测到的颜色和默认阈值处理所有帧
        const processedFrames = []
        for (let i = 0; i < frameUrls.length; i++) {
          try {
            // 先下载到本地
            const localFrameUrl = await this.downloadFrameToLocal(frameUrls[i])
            // 然后处理
            const processedFrame = await this.processFrameWithChromaKey(
              localFrameUrl,
              detectedColor,
              30 // 默认阈值
            )
            processedFrames.push(processedFrame)
          } catch (err) {
            console.error(`处理第${i}帧失败:`, err)
            // 失败时尝试下载原图
            try {
              const localFrameUrl = await this.downloadFrameToLocal(frameUrls[i])
              processedFrames.push(localFrameUrl)
            } catch (downloadErr) {
              processedFrames.push(frameUrls[i]) // 最后使用原URL
            }
          }
        }
        
        resolve({
          detectedColor: detectedColor,
          processedFrames: processedFrames
        })
      } catch (error) {
        console.error('自动识别背景失败:', error)
        // 如果识别失败，使用默认绿色背景
        const defaultColor = { r: 0, g: 255, b: 0 }
        const processedFrames = []
        for (let i = 0; i < frameUrls.length; i++) {
          try {
            const localFrameUrl = await this.downloadFrameToLocal(frameUrls[i])
            const processedFrame = await this.processFrameWithChromaKey(
              localFrameUrl,
              defaultColor,
              30
            )
            processedFrames.push(processedFrame)
          } catch (err) {
            try {
              const localFrameUrl = await this.downloadFrameToLocal(frameUrls[i])
              processedFrames.push(localFrameUrl)
            } catch (downloadErr) {
              processedFrames.push(frameUrls[i])
            }
          }
        }
        resolve({
          detectedColor: defaultColor,
          processedFrames: processedFrames
        })
      }
    })
  },

  // 下载帧到本地（如果是云存储URL）
  downloadFrameToLocal(frameUrl) {
    return new Promise((resolve, reject) => {
      // 如果是云存储路径（cloud://开头），需要先下载
      if (frameUrl.startsWith('cloud://') || frameUrl.startsWith('http://') || frameUrl.startsWith('https://')) {
        if (wx.cloud && wx.cloud.downloadFile) {
          wx.cloud.downloadFile({
            fileID: frameUrl,
            success: (res) => {
              resolve(res.tempFilePath)
            },
            fail: (err) => {
              console.error('下载图片失败:', err)
              // 如果下载失败，尝试使用原URL（可能是网络图片）
              resolve(frameUrl)
            }
          })
        } else {
          // 没有云开发，尝试直接使用（可能是网络图片）
          resolve(frameUrl)
        }
      } else {
        // 已经是本地路径
        resolve(frameUrl)
      }
    })
  },

  // 检测背景颜色（分析图片边缘和角落，找出最常见的颜色）
  detectBackgroundColor(frameUrls) {
    return new Promise((resolve, reject) => {
      // 简化实现：分析第一帧的边缘像素
      // 实际应该分析多帧的边缘和角落区域
      const ctx = wx.createCanvasContext('bgDetectCanvas', this)
      
      // 使用第一帧进行分析（frameUrls[0] 应该是本地路径）
      const imagePath = frameUrls[0]
      ctx.drawImage(imagePath, 0, 0, 240, 240)
      ctx.draw(false, () => {
        setTimeout(() => {
          // 获取边缘像素（四个角和边缘）
          const edgePoints = [
            { x: 0, y: 0 }, // 左上
            { x: 239, y: 0 }, // 右上
            { x: 0, y: 239 }, // 左下
            { x: 239, y: 239 }, // 右下
            { x: 120, y: 0 }, // 上中
            { x: 120, y: 239 }, // 下中
            { x: 0, y: 120 }, // 左中
            { x: 239, y: 120 } // 右中
          ]
          
          const colorCounts = {}
          let processedCount = 0
          
          edgePoints.forEach((point, index) => {
            wx.canvasGetImageData({
              canvasId: 'bgDetectCanvas',
              x: point.x,
              y: point.y,
              width: 1,
              height: 1,
              success: (res) => {
                const data = res.data
                if (data && data.length >= 4) {
                  const colorKey = `${data[0]},${data[1]},${data[2]}`
                  colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1
                }
                processedCount++
                
                if (processedCount === edgePoints.length) {
                  // 找出最常见的颜色
                  let maxCount = 0
                  let mostCommonColor = null
                  for (const [colorKey, count] of Object.entries(colorCounts)) {
                    if (count > maxCount) {
                      maxCount = count
                      mostCommonColor = colorKey
                    }
                  }
                  
                  if (mostCommonColor) {
                    const [r, g, b] = mostCommonColor.split(',').map(Number)
                    resolve({ r, g, b })
                  } else {
                    // 默认绿色
                    resolve({ r: 0, g: 255, b: 0 })
                  }
                }
              },
              fail: () => {
                processedCount++
                if (processedCount === edgePoints.length) {
                  resolve({ r: 0, g: 255, b: 0 }) // 默认绿色
                }
              }
            })
          })
        }, 200)
      })
    })
  },

  // 使用色度键处理单帧
  processFrameWithChromaKey(frameUrl, targetColor, threshold) {
    return new Promise((resolve, reject) => {
      const ctx = wx.createCanvasContext('processCanvas', this)
      
      ctx.drawImage(frameUrl, 0, 0, 240, 240)
      ctx.draw(false, () => {
        wx.canvasGetImageData({
          canvasId: 'processCanvas',
          x: 0,
          y: 0,
          width: 240,
          height: 240,
          success: (res) => {
            const imageData = res.data
            const data = new Uint8ClampedArray(imageData)
            
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              
              const colorDistance = Math.sqrt(
                Math.pow(r - targetColor.r, 2) +
                Math.pow(g - targetColor.g, 2) +
                Math.pow(b - targetColor.b, 2)
              )
              
              const maxDistance = (threshold / 100) * 441
              
              if (colorDistance <= maxDistance) {
                data[i + 3] = 0 // 设置为透明
              }
            }
            
            wx.canvasPutImageData({
              canvasId: 'processCanvas',
              x: 0,
              y: 0,
              width: 240,
              height: 240,
              data: data,
              success: () => {
                wx.canvasToTempFilePath({
                  canvasId: 'processCanvas',
                  x: 0,
                  y: 0,
                  width: 240,
                  height: 240,
                  destWidth: 240,
                  destHeight: 240,
                  fileType: 'png',
                  quality: 1,
                  success: (res) => {
                    resolve(res.tempFilePath)
                  },
                  fail: reject
                })
              },
              fail: reject
            })
          },
          fail: reject
        })
      })
    })
  }
})
