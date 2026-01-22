// pages/video-edit/video-edit.js
const frameUtils = require('../../utils/frameUtils.js')

Page({
  data: {
    frameUrls: [], // 序列帧URL数组
    currentFrameIndex: 0, // 当前显示的帧索引
    currentFrameUrl: '', // 当前显示的帧URL
    isPlaying: false, // 是否正在播放
    playTimer: null, // 播放定时器
    isTestMode: false, // 是否为测试模式
    videoPath: '', // 测试模式下的视频路径
    originalVideoPath: '', // 原始视频路径（用于左侧显示）
    
    // 抠图参数
    isColorPicking: false, // 是否正在使用吸管工具
    selectedColor: { r: 0, g: 255, b: 0 }, // 选中的颜色（默认绿色）
    colorThreshold: 30, // 抠除范围（0-100）
    showColorPicker: false, // 是否显示颜色选择指示器
    pickerX: 0, // 颜色选择器X坐标
    pickerY: 0, // 颜色选择器Y坐标
    
    // 处理后的帧（已抠图）
    processedFrames: [], // 存储处理后的帧URL
    originalFrames: [], // 保存原始已处理帧，用于重新处理
    hasProcessed: false, // 是否已进行抠图处理
    isProcessing: false // 是否正在处理中
  },

  onLoad(options) {
    // 检查是否为测试模式
    const isTestMode = options.isTestMode === 'true'
    const videoPath = options.videoPath ? decodeURIComponent(options.videoPath) : ''
    
    // 优先使用已处理的序列帧（新流程）
    let processedFrames = []
    let originalFrames = []
    let detectedColor = { r: 0, g: 255, b: 0 }
    let threshold = 30
    
    try {
      if (options.processedFrames) {
        processedFrames = JSON.parse(decodeURIComponent(options.processedFrames))
      }
      if (options.originalFrames) {
        originalFrames = JSON.parse(decodeURIComponent(options.originalFrames))
      }
      if (options.detectedColor) {
        detectedColor = JSON.parse(decodeURIComponent(options.detectedColor))
      }
      if (options.threshold) {
        threshold = parseInt(options.threshold) || 30
      }
    } catch (e) {
      console.error('解析参数失败:', e)
    }

    // 如果已有处理后的序列帧（新流程）
    if (processedFrames && processedFrames.length > 0) {
      console.log('接收到的已处理序列帧数量:', processedFrames.length)
      this.setData({
        processedFrames: processedFrames,
        currentFrameUrl: processedFrames[0] || '',
        frameUrls: processedFrames,
        originalFrames: originalFrames.length > 0 ? originalFrames : processedFrames, // 保存原始序列帧用于重新处理
        hasProcessed: true,
        selectedColor: detectedColor,
        colorThreshold: threshold,
        originalVideoPath: originalVideoPath || videoPath // 保存原始视频路径用于左侧显示
      })
      // 自动开始播放
      setTimeout(() => {
        this.startPlay()
      }, 300)
      return
    }

    // 兼容旧流程：测试模式
    if (isTestMode) {
      console.log('测试模式：isTestMode=', isTestMode, 'videoPath=', videoPath)
      
      if (!videoPath) {
        wx.showToast({
          title: '测试模式：视频路径为空',
          icon: 'none',
          duration: 2000
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
        return
      }
      
      console.log('测试模式：使用视频预览，视频路径:', videoPath)
      this.setData({
        isTestMode: true,
        videoPath: videoPath,
        originalVideoPath: videoPath, // 测试模式下，原始视频就是上传的视频
        currentFrameUrl: videoPath,
        frameUrls: [videoPath],
        processedFrames: [videoPath],
        hasProcessed: false,
        isPlaying: false
      })
      console.log('测试模式数据设置完成，当前数据:', this.data)
      return
    }

    // 兼容旧流程：未处理的序列帧
    let frameUrls = []
    try {
      if (options.frameUrls) {
        frameUrls = JSON.parse(decodeURIComponent(options.frameUrls))
      }
    } catch (e) {
      console.error('解析序列帧URL失败:', e)
    }

    if (!frameUrls || frameUrls.length === 0) {
      wx.showToast({
        title: '序列帧数据错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    console.log('接收到的序列帧数量:', frameUrls.length)
    
    // 设置序列帧数据
    this.setData({
      frameUrls: frameUrls,
      currentFrameUrl: frameUrls[0] || '',
      processedFrames: frameUrls,
      hasProcessed: false,
      originalVideoPath: originalVideoPath || videoPath // 如果有原始视频路径，保存它
    })
  },

  onUnload() {
    // 页面卸载时清除定时器
    this.stopPlay()
  },

  // 原始视频播放事件
  onOriginalVideoPlay() {
    console.log('原始视频开始播放')
    // 同步播放序列帧
    if (!this.data.isPlaying) {
      this.startPlay()
    }
  },

  // 视频播放事件
  onVideoPlay() {
    console.log('视频开始播放')
    this.setData({ isPlaying: true })
  },

  // 视频错误事件
  onVideoError(e) {
    console.error('视频播放错误:', e.detail)
    wx.showToast({
      title: '视频加载失败',
      icon: 'none'
    })
  },

  // 切换播放/暂停
  togglePlay() {
    // 如果有原始视频，同时控制原始视频和序列帧
    if (this.data.originalVideoPath) {
      const originalVideoContext = wx.createVideoContext('originalVideo', this)
      if (this.data.isPlaying) {
        originalVideoContext.pause()
        this.stopPlay()
      } else {
        originalVideoContext.play()
        this.startPlay()
      }
    } else if (this.data.isTestMode) {
      // 测试模式：使用视频播放
      const videoContext = wx.createVideoContext('testVideo', this)
      if (this.data.isPlaying) {
        videoContext.pause()
        this.setData({ isPlaying: false })
      } else {
        videoContext.play()
        this.setData({ isPlaying: true })
      }
    } else {
      // 正常模式：播放序列帧
      if (this.data.isPlaying) {
        this.stopPlay()
      } else {
        this.startPlay()
      }
    }
  },

  // 开始播放
  startPlay() {
    if (this.data.frameUrls.length === 0) return

    this.setData({ isPlaying: true })
    
    // 计算每帧显示时间（12fps = 每帧约83ms）
    const frameInterval = 1000 / 12 // 约83ms

    this.playTimer = setInterval(() => {
      let nextIndex = (this.data.currentFrameIndex + 1) % this.data.frameUrls.length
      this.setData({
        currentFrameIndex: nextIndex,
        currentFrameUrl: this.data.processedFrames[nextIndex] || this.data.frameUrls[nextIndex]
      })
    }, frameInterval)
  },

  // 停止播放
  stopPlay() {
    if (this.playTimer) {
      clearInterval(this.playTimer)
      this.playTimer = null
    }
    this.setData({ isPlaying: false })
  },

  // 切换吸取颜色工具
  toggleColorPicker() {
    const newState = !this.data.isColorPicking
    this.setData({
      isColorPicking: newState,
      showColorPicker: false
    })
    
    if (newState) {
      if (this.data.isTestMode) {
        wx.showToast({
          title: '测试模式：可预览功能',
          icon: 'none',
          duration: 2000
        })
      } else {
        wx.showToast({
          title: '按住图片区域选择颜色',
          icon: 'none',
          duration: 2000
        })
        // 初始化Canvas（用于获取像素颜色）
        this.initColorPickerCanvas()
      }
    }
  },

  // 初始化颜色选择Canvas
  initColorPickerCanvas() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#frameImage').boundingClientRect((rect) => {
      if (rect) {
        this.imageRect = rect
        // 创建Canvas上下文
        this.canvasContext = wx.createCanvasContext('colorPickerCanvas', this)
        this.canvasWidth = rect.width
        this.canvasHeight = rect.height
      }
    }).exec()
  },

  // 预览区域触摸开始
  onPreviewTouchStart(e) {
    if (!this.data.isColorPicking) return
    
    const touch = e.touches[0]
    this.updateColorPicker(touch.clientX, touch.clientY)
  },

  // 预览区域触摸移动
  onPreviewTouchMove(e) {
    if (!this.data.isColorPicking) return
    
    const touch = e.touches[0]
    this.updateColorPicker(touch.clientX, touch.clientY)
  },

  // 预览区域触摸结束
  onPreviewTouchEnd(e) {
    if (!this.data.isColorPicking) return
    
    // 保持指示器显示，直到用户再次点击或关闭工具
    // this.setData({ showColorPicker: false })
  },

  // 更新颜色选择器
  updateColorPicker(clientX, clientY) {
    const query = wx.createSelectorQuery().in(this)
    query.select('.preview-wrapper').boundingClientRect((rect) => {
      if (!rect) return
      
      // 计算相对于预览区域的坐标
      const x = clientX - rect.left
      const y = clientY - rect.top
      
      // 更新指示器位置
      this.setData({
        pickerX: x,
        pickerY: y,
        showColorPicker: true
      })
      
      // 获取颜色（如果是图片模式）
      if (!this.data.isTestMode && this.data.currentFrameUrl) {
        this.getColorFromImage(x, y, rect)
      } else if (this.data.isTestMode) {
        // 测试模式下，使用默认颜色或提示
        // 视频模式下无法直接获取像素颜色，需要截图
        this.setData({
          selectedColor: { r: 0, g: 255, b: 0 } // 默认绿色
        })
      }
    }).exec()
  },

  // 从图片获取颜色
  getColorFromImage(x, y, rect) {
    if (!this.data.currentFrameUrl) return
    
    // 计算图片在预览区域中的位置和缩放
    const imageQuery = wx.createSelectorQuery().in(this)
    imageQuery.select('#frameImage').boundingClientRect((imageRect) => {
      if (!imageRect) return
      
      // 计算图片实际显示区域（aspectFit模式）
      const imageAspect = 1 // 假设是正方形 240x240
      const containerAspect = rect.width / rect.height
      
      let imageDisplayWidth, imageDisplayHeight, imageX, imageY
      
      if (imageAspect > containerAspect) {
        // 图片更宽，以宽度为准
        imageDisplayWidth = rect.width
        imageDisplayHeight = rect.width / imageAspect
        imageX = 0
        imageY = (rect.height - imageDisplayHeight) / 2
      } else {
        // 图片更高，以高度为准
        imageDisplayHeight = rect.height
        imageDisplayWidth = rect.height * imageAspect
        imageX = (rect.width - imageDisplayWidth) / 2
        imageY = 0
      }
      
      // 检查触摸点是否在图片区域内
      if (x < imageX || x > imageX + imageDisplayWidth || 
          y < imageY || y > imageY + imageDisplayHeight) {
        return
      }
      
      // 计算相对于图片的坐标（原图是240x240）
      const relativeX = ((x - imageX) / imageDisplayWidth) * 240
      const relativeY = ((y - imageY) / imageDisplayHeight) * 240
      
      // 使用Canvas获取像素颜色
      const ctx = wx.createCanvasContext('colorPickerCanvas', this)
      
      // 清空并绘制图片（直接使用图片路径）
      ctx.clearRect(0, 0, 240, 240)
      ctx.drawImage(this.data.currentFrameUrl, 0, 0, 240, 240)
      ctx.draw(false, () => {
        // 延迟获取像素数据，确保绘制完成
        setTimeout(() => {
          wx.canvasGetImageData({
            canvasId: 'colorPickerCanvas',
            x: Math.max(0, Math.min(239, Math.floor(relativeX))),
            y: Math.max(0, Math.min(239, Math.floor(relativeY))),
            width: 1,
            height: 1,
            success: (res) => {
                      const data = res.data
                      if (data && data.length >= 4) {
                        const newColor = {
                          r: data[0],
                          g: data[1],
                          b: data[2]
                        }
                        this.setData({
                          selectedColor: newColor
                        })
                        console.log('实时获取到颜色:', newColor)
                        
                        // 实时触发抠除（使用防抖优化性能）
                        if (!this.data.isTestMode && this.data.frameUrls.length > 0) {
                          this.debouncedProcessChromaKey()
                        }
                      }
            },
            fail: (err) => {
              console.error('获取颜色失败:', err)
              // 如果获取失败，保持当前颜色不变
            }
          })
        }, 150) // 延迟150ms确保Canvas绘制完成
      })
    }).exec()
  },

  // 抠除范围变化
  onThresholdChange(e) {
    const threshold = e.detail.value
    this.setData({ colorThreshold: threshold })
    
    // 如果已经处理过，范围变化时重新处理所有帧
    if (this.data.hasProcessed && this.data.originalFrames && this.data.originalFrames.length > 0) {
      this.reprocessWithNewThreshold(threshold)
    }
  },

  // 使用新阈值重新处理序列帧
  async reprocessWithNewThreshold(threshold) {
    if (this.data.isProcessing) return
    
    this.setData({ isProcessing: true })
    
    wx.showLoading({
      title: '正在调整...',
      mask: true
    })

    try {
      const selectedColor = this.data.selectedColor
      const processedFrames = []
      
      // 使用原始已处理帧重新处理
      const sourceFrames = this.data.originalFrames || this.data.frameUrls
      
      for (let i = 0; i < sourceFrames.length; i++) {
        try {
          const processedFrame = await this.processSingleFrame(
            sourceFrames[i],
            selectedColor,
            threshold
          )
          processedFrames.push(processedFrame)
        } catch (err) {
          console.error(`重新处理第${i}帧失败:`, err)
          processedFrames.push(sourceFrames[i])
        }
      }

      this.setData({
        processedFrames: processedFrames,
        currentFrameUrl: processedFrames[this.data.currentFrameIndex] || processedFrames[0]
      })
    } catch (error) {
      console.error('重新处理失败:', error)
      wx.showToast({
        title: '调整失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
      this.setData({ isProcessing: false })
    }
  },

  // 抠除颜色按钮点击
  onRemoveColor() {
    if (!this.data.selectedColor) {
      wx.showToast({
        title: '请先吸取颜色',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在处理...',
      mask: true
    })

    // 处理当前帧（如果是序列帧，需要处理所有帧）
    this.processChromaKey().then(() => {
      wx.hideLoading()
      wx.showToast({
        title: '抠除完成',
        icon: 'success'
      })
    }).catch((err) => {
      wx.hideLoading()
      console.error('抠除失败:', err)
      wx.showToast({
        title: '抠除失败，请重试',
        icon: 'none'
      })
    })
  },

  // 处理色度键抠图
  async processChromaKey() {
    const selectedColor = this.data.selectedColor
    const threshold = this.data.colorThreshold

    if (this.data.isTestMode) {
      // 测试模式：处理视频的当前帧
      wx.showLoading({
        title: '正在处理视频帧...',
        mask: true
      })

      try {
        // 对视频进行截图处理
        const processedFrame = await this.processVideoFrame(
          this.data.videoPath,
          selectedColor,
          threshold
        )

        // 测试模式下，使用处理后的单帧
        this.setData({
          processedFrames: [processedFrame],
          hasProcessed: true,
          currentFrameUrl: processedFrame,
          frameUrls: [processedFrame] // 更新为处理后的帧
        })

        wx.hideLoading()
        wx.showToast({
          title: '处理完成（测试模式）',
          icon: 'success'
        })

        return Promise.resolve()
      } catch (err) {
        wx.hideLoading()
        console.error('测试模式处理失败:', err)
        wx.showModal({
          title: '处理失败',
          content: '测试模式下无法处理视频。\n\n实际功能需要配置云函数生成序列帧。',
          showCancel: false
        })
        return Promise.reject(err)
      }
    }

    if (this.data.frameUrls.length === 0) {
      return Promise.reject(new Error('没有可处理的序列帧'))
    }

    // 处理所有序列帧
    const processedFrames = []
    
    for (let i = 0; i < this.data.frameUrls.length; i++) {
      try {
        const processedFrame = await this.processSingleFrame(
          this.data.frameUrls[i],
          selectedColor,
          threshold
        )
        processedFrames.push(processedFrame)
      } catch (err) {
        console.error(`处理第${i}帧失败:`, err)
        // 如果处理失败，使用原始帧
        processedFrames.push(this.data.frameUrls[i])
      }
    }

    // 更新处理后的帧
    this.setData({
      processedFrames: processedFrames,
      hasProcessed: true,
      currentFrameUrl: processedFrames[this.data.currentFrameIndex] || processedFrames[0]
    })

    return Promise.resolve()
  },

  // 处理视频帧（测试模式用）
  processVideoFrame(videoPath, targetColor, threshold) {
    return new Promise((resolve, reject) => {
      // 测试模式说明
      wx.showModal({
        title: '功能说明',
        content: '当前为测试模式。\n\n抠除颜色功能需要序列帧数据。\n\n要使用完整功能，需要：\n1. 配置云开发环境\n2. 创建并部署videoToFrames云函数\n3. 视频会自动转换为序列帧\n\n参考文档：云开发配置详细步骤.md',
        showCancel: false,
        confirmText: '我知道了',
        success: () => {
          reject(new Error('需要配置云函数'))
        }
      })
    })
  },

  // 处理单帧图片（色度键抠图）
  processSingleFrame(frameUrl, targetColor, threshold) {
    return new Promise((resolve, reject) => {
      // 创建Canvas处理图片
      const ctx = wx.createCanvasContext('chromaCanvas', this)
      
      // 绘制原始图片
      ctx.drawImage(frameUrl, 0, 0, 240, 240)
      ctx.draw(false, () => {
        // 获取图片数据
        wx.canvasGetImageData({
          canvasId: 'chromaCanvas',
          x: 0,
          y: 0,
          width: 240,
          height: 240,
          success: (res) => {
            const imageData = res.data
            const data = new Uint8ClampedArray(imageData)
            
            // 处理每个像素
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              
              // 计算颜色距离（欧氏距离）
              const colorDistance = Math.sqrt(
                Math.pow(r - targetColor.r, 2) +
                Math.pow(g - targetColor.g, 2) +
                Math.pow(b - targetColor.b, 2)
              )
              
              // 如果颜色在阈值范围内，设置为透明
              // threshold是0-100，转换为0-441的颜色距离（RGB最大距离是sqrt(255^2*3)≈441）
              const maxDistance = (threshold / 100) * 441
              
              if (colorDistance <= maxDistance) {
                data[i + 3] = 0 // 设置alpha为0（透明）
              }
            }
            
            // 将处理后的数据绘制回Canvas
            wx.canvasPutImageData({
              canvasId: 'chromaCanvas',
              x: 0,
              y: 0,
              width: 240,
              height: 240,
              data: data,
              success: () => {
                // 延迟导出，确保数据已写入
                setTimeout(() => {
                  // 导出为临时文件
                  wx.canvasToTempFilePath({
                    canvasId: 'chromaCanvas',
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
              fail: reject
            })
          },
          fail: reject
        })
      })
    })
  },

  // 导出GIF
  async onExportGIF() {
    // 测试模式提示
    if (this.data.isTestMode) {
      wx.showModal({
        title: '测试模式',
        content: '当前为测试模式，实际导出功能需要配置云函数。\n\n请参考"云开发配置详细步骤.md"文档配置framesToGif云函数。',
        showCancel: false,
        confirmText: '我知道了'
      })
      return
    }

    if (this.data.frameUrls.length === 0) {
      wx.showToast({
        title: '没有可导出的序列帧',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在导出GIF...',
      mask: true
    })

    try {
      // 调用云函数合成GIF
      const result = await frameUtils.framesToGif({
        frameUrls: this.data.processedFrames.length > 0 
          ? this.data.processedFrames 
          : this.data.frameUrls,
        chromaKey: {
          enabled: true,
          color: this.data.selectedColor,
          threshold: this.data.colorThreshold
        },
        fps: 12,
        maxSize: 500 * 1024
      })

      if (result.success) {
        // 下载GIF文件
        const downloadRes = await new Promise((resolve, reject) => {
          wx.cloud.downloadFile({
            fileID: result.filePath,
            success: resolve,
            fail: reject
          })
        })

        // 保存到相册
        await new Promise((resolve, reject) => {
          wx.saveImageToPhotosAlbum({
            filePath: downloadRes.tempFilePath,
            success: () => {
              wx.showToast({
                title: 'GIF已保存到相册',
                icon: 'success'
              })
              resolve()
            },
            fail: (err) => {
              if (err.errMsg && err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '需要授权',
                  content: '需要授权保存到相册',
                  showCancel: false,
                  success: () => {
                    wx.openSetting()
                  }
                })
              }
              reject(err)
            }
          })
        })
      } else {
        throw new Error(result.error || '导出失败')
      }
    } catch (error) {
      console.error('GIF导出失败:', error)
      wx.showModal({
        title: '导出失败',
        content: error.message || '请检查云函数配置',
        showCancel: false
      })
    } finally {
      wx.hideLoading()
    }
  }
})
