// index.js
const frameUtils = require('../../utils/frameUtils.js')

Page({
  data: {
    processing: false, // 是否正在处理视频
    extractVideoPath: '', // 用于提取帧的视频路径
    videoDuration: 0, // 视频时长
    extractingFrames: false // 是否正在提取帧
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
          // 检查云开发是否可用
          if (!wx.cloud || !wx.cloud.uploadFile || !wx.cloud.callFunction) {
            console.warn('云开发未初始化，直接进入测试模式')
            wx.hideLoading()
            this.enterTestMode(tempFilePath, duration)
            return
          }

          wx.showLoading({
            title: '正在上传视频...',
            mask: true
          })

          // 先上传视频到云存储
          let uploadRes
          try {
            uploadRes = await new Promise((resolve, reject) => {
              wx.cloud.uploadFile({
                cloudPath: `videos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`,
                filePath: tempFilePath,
                success: resolve,
                fail: (err) => {
                  console.error('视频上传失败:', err)
                  reject(err)
                }
              })
            })
          } catch (uploadError) {
            wx.hideLoading()
            console.error('视频上传失败，进入测试模式:', uploadError)
            // 上传失败，直接进入测试模式
            this.enterTestMode(tempFilePath, duration)
            return
          }

          wx.showLoading({
            title: '正在生成序列帧...',
            mask: true
          })

          // 调用云函数生成序列帧
          let framesResult
          try {
            console.log('开始调用云函数 videoToFrames...')
            framesResult = await frameUtils.videoToFrames({
              videoPath: uploadRes.fileID,
              fps: 12,
              width: 240,
              height: 240
            })
            console.log('云函数调用结果:', framesResult)
          } catch (cloudError) {
            // 云函数调用失败，直接进入测试模式
            console.error('云函数调用失败，进入测试模式:', cloudError)
            wx.hideLoading()
            
            // 检查是否是测试模式标记
            if (cloudError.message === 'USE_TEST_MODE') {
              // 用户选择了测试模式，直接进入
              this.enterTestMode(tempFilePath, duration)
              return
            }
            
            // 其他错误，也进入测试模式（不弹窗，直接进入）
            console.warn('自动进入测试模式')
            this.enterTestMode(tempFilePath, duration)
            return
          }
          
          if (!framesResult || !framesResult.success || !framesResult.frameUrls || framesResult.frameUrls.length === 0) {
            // 检查是否应该使用本地处理
            if (framesResult && framesResult.useLocalProcessing) {
              console.log('云函数返回本地处理标记，使用Canvas API提取视频帧')
              wx.hideLoading()
              
              // 使用本地Canvas API处理
              try {
                const localFramesResult = await this.extractFramesLocally(tempFilePath, duration, 12, 240, 240)
                
                if (localFramesResult && localFramesResult.success && localFramesResult.frameUrls && localFramesResult.frameUrls.length > 0) {
                  // 本地处理成功，继续后续流程
                  framesResult = localFramesResult
                } else {
                  // 本地处理失败，进入测试模式
                  console.warn('本地处理失败，进入测试模式')
                  this.enterTestMode(tempFilePath, duration)
                  return
                }
              } catch (localError) {
                console.error('本地处理失败:', localError)
                this.enterTestMode(tempFilePath, duration)
                return
              }
            } else {
              // 云函数返回失败，直接进入测试模式
              console.warn('序列帧生成失败，自动进入测试模式')
              wx.hideLoading()
              this.enterTestMode(tempFilePath, duration)
              return
            }
          }

          wx.showLoading({
            title: '正在识别背景并抠图...',
            mask: true
          })

          // 自动识别大面积纯色背景并抠除
          console.log('开始自动识别背景并抠图，序列帧数量:', framesResult.frameUrls.length)
          const processedResult = await this.autoDetectAndRemoveBackground(framesResult.frameUrls)
          console.log('背景识别完成，检测到的颜色:', processedResult.detectedColor)
          console.log('处理后的序列帧数量:', processedResult.processedFrames.length)
          
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
            url: `/pages/video-edit/video-edit?processedFrames=${encodeURIComponent(processedFramesStr)}&originalFrames=${encodeURIComponent(originalFramesStr)}&detectedColor=${encodeURIComponent(colorInfoStr)}&threshold=60&originalVideoPath=${encodeURIComponent(originalVideoPath)}`
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
            // 然后处理（使用更大的阈值，确保能抠除背景）
            const processedFrame = await this.processFrameWithChromaKey(
              localFrameUrl,
              detectedColor,
              60 // 增加默认阈值到60，更容易抠除背景
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
              60 // 增加默认阈值到60
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

  // 检测背景颜色（简化版：直接获取边缘区域的所有像素）
  detectBackgroundColor(frameUrls) {
    return new Promise((resolve, reject) => {
      const ctx = wx.createCanvasContext('bgDetectCanvas', this)
      
      // 使用第一帧进行分析
      const imagePath = frameUrls[0]
      console.log('开始检测背景颜色，图片路径:', imagePath)
      
      ctx.drawImage(imagePath, 0, 0, 240, 240)
      ctx.draw(false, () => {
        setTimeout(() => {
          // 直接获取整个边缘区域（上下左右各10像素宽的区域）
          // 这样能获取更多样本，更准确
          const edgeRegions = [
            { x: 0, y: 0, w: 240, h: 10 },      // 上边缘
            { x: 0, y: 230, w: 240, h: 10 },   // 下边缘
            { x: 0, y: 0, w: 10, h: 240 },     // 左边缘
            { x: 230, y: 0, w: 10, h: 240 }    // 右边缘
          ]
          
          const colorCounts = {}
          let processedCount = 0
          
          edgeRegions.forEach((region, index) => {
            wx.canvasGetImageData({
              canvasId: 'bgDetectCanvas',
              x: region.x,
              y: region.y,
              width: region.w,
              height: region.h,
              success: (res) => {
                const data = res.data
                const pixelCount = region.w * region.h
                
                console.log(`区域${index + 1}采样: ${pixelCount}个像素`)
                
                // 处理所有像素
                for (let i = 0; i < data.length; i += 4) {
                  const r = data[i]
                  const g = data[i + 1]
                  const b = data[i + 2]
                  
                  // 将颜色量化（容差±20，更宽松）
                  const rQuantized = Math.round(r / 20) * 20
                  const gQuantized = Math.round(g / 20) * 20
                  const bQuantized = Math.round(b / 20) * 20
                  const colorKey = `${rQuantized},${gQuantized},${bQuantized}`
                  
                  colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1
                }
                
                processedCount++
                if (processedCount === edgeRegions.length) {
                  this.findMostCommonColor(colorCounts, resolve)
                }
              },
              fail: (err) => {
                console.error(`区域${index + 1}采样失败:`, err)
                processedCount++
                if (processedCount === edgeRegions.length) {
                  this.findMostCommonColor(colorCounts, resolve)
                }
              }
            })
          })
        }, 500) // 增加延迟确保Canvas绘制完成
      })
    })
  },

  // 找出最常见的颜色（简化版）
  findMostCommonColor(colorCounts, resolve) {
    console.log('颜色统计:', colorCounts)
    
    let maxCount = 0
    let mostCommonColor = null
    
    // 找出出现次数最多的颜色
    for (const [colorKey, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count
        mostCommonColor = colorKey
      }
    }
    
    if (mostCommonColor && maxCount > 10) {
      const [r, g, b] = mostCommonColor.split(',').map(Number)
      console.log(`✅ 检测到背景颜色: RGB(${r}, ${g}, ${b}), 匹配像素数: ${maxCount}`)
      resolve({ r, g, b })
      return
    }
    
    // 如果没有找到明显的纯色，尝试检测是否为绿色或蓝色
    console.log('未找到明显的纯色背景，尝试检测绿色或蓝色')
    
    let greenCount = 0
    let blueCount = 0
    let greenColor = { r: 0, g: 255, b: 0 }
    let blueColor = { r: 0, g: 0, b: 255 }
    
    for (const [colorKey, count] of Object.entries(colorCounts)) {
      const [r, g, b] = colorKey.split(',').map(Number)
      
      // 检查是否为绿色（G值高，R和B值低）
      if (g > 150 && r < 150 && b < 150) {
        greenCount += count
        // 记录最接近纯绿色的颜色
        if (g > greenColor.g) {
          greenColor = { r, g, b }
        }
      }
      
      // 检查是否为蓝色（B值高，R和G值低）
      if (b > 150 && r < 150 && g < 150) {
        blueCount += count
        // 记录最接近纯蓝色的颜色
        if (b > blueColor.b) {
          blueColor = { r, g, b }
        }
      }
    }
    
    console.log(`绿色像素数: ${greenCount}, 蓝色像素数: ${blueCount}`)
    
    if (greenCount > blueCount && greenCount > 20) {
      console.log(`✅ 检测到绿色背景，使用颜色: RGB(${greenColor.r}, ${greenColor.g}, ${greenColor.b})`)
      resolve(greenColor)
    } else if (blueCount > greenCount && blueCount > 20) {
      console.log(`✅ 检测到蓝色背景，使用颜色: RGB(${blueColor.r}, ${blueColor.g}, ${blueColor.b})`)
      resolve(blueColor)
    } else {
      console.log('⚠️ 未明确检测到纯色背景，使用默认绿色背景 RGB(0, 255, 0)')
      resolve({ r: 0, g: 255, b: 0 })
    }
  },

  // 使用色度键处理单帧
  processFrameWithChromaKey(frameUrl, targetColor, threshold) {
    return new Promise((resolve, reject) => {
      const ctx = wx.createCanvasContext('processCanvas', this)
      
      ctx.drawImage(frameUrl, 0, 0, 240, 240)
      ctx.draw(false, () => {
        // 延迟确保图片绘制完成
        setTimeout(() => {
          wx.canvasGetImageData({
            canvasId: 'processCanvas',
            x: 0,
            y: 0,
            width: 240,
            height: 240,
            success: (res) => {
              const imageData = res.data
              const data = new Uint8ClampedArray(imageData)
              
              // 计算颜色距离阈值（使用更激进的阈值）
              // threshold是0-100，转换为颜色距离
              // 基础阈值100，最大可达300（非常宽松）
              const baseThreshold = 100 // 基础阈值100
              const maxDistance = baseThreshold + (threshold / 100) * 200 // 最大300的容差
              
              console.log(`🎨 抠图参数: 目标颜色 RGB(${targetColor.r}, ${targetColor.g}, ${targetColor.b}), 阈值: ${threshold}, 颜色距离阈值: ${maxDistance.toFixed(2)}`)
              
              let transparentPixels = 0
              let totalPixels = data.length / 4
              let sampleColors = [] // 采样前10个像素的颜色，用于调试
              
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]
                
                // 采样前10个像素的颜色
                if (transparentPixels < 10) {
                  sampleColors.push({ r, g, b })
                }
                
                // 计算颜色距离（欧氏距离）
                const colorDistance = Math.sqrt(
                  Math.pow(r - targetColor.r, 2) +
                  Math.pow(g - targetColor.g, 2) +
                  Math.pow(b - targetColor.b, 2)
                )
                
                // 如果颜色在阈值范围内，设置为透明
                if (colorDistance <= maxDistance) {
                  data[i + 3] = 0 // 设置alpha为0（透明）
                  transparentPixels++
                }
              }
              
              console.log(`前10个像素颜色样本:`, sampleColors.slice(0, 10))
              
              const transparentPercent = Math.round(transparentPixels/totalPixels*100)
              console.log(`✅ 处理帧完成，透明像素: ${transparentPixels}/${totalPixels} (${transparentPercent}%)`)
              
              // 如果透明像素太少，可能是检测不准确，给出警告
              if (transparentPercent < 10) {
                console.warn(`⚠️ 警告：透明像素比例过低(${transparentPercent}%)，可能背景颜色检测不准确`)
              }
              
              wx.canvasPutImageData({
                canvasId: 'processCanvas',
                x: 0,
                y: 0,
                width: 240,
                height: 240,
                data: data,
                success: () => {
                  // 延迟确保数据已写入
                  setTimeout(() => {
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
                      fail: (err) => {
                        console.error('导出图片失败:', err)
                        reject(err)
                      }
                    }, this)
                  }, 100)
                },
                fail: (err) => {
                  console.error('写入图片数据失败:', err)
                  reject(err)
                }
              })
            },
            fail: (err) => {
              console.error('获取图片数据失败:', err)
              reject(err)
            }
          })
        }, 200) // 增加延迟确保Canvas绘制完成
      })
    })
  }
})
