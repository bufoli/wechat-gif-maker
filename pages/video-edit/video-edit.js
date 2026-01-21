// pages/video-edit/video-edit.js
const videoUtils = require('../../utils/videoUtils.js')

Page({
  data: {
    videoPath: '',
    videoDuration: 10,
    // 剪辑参数
    trimStart: 0,
    trimEnd: 10,
    // 视频播放状态
    isPlaying: false,
    currentTime: 0,
    // 时间轴拖动状态
    draggingStart: false,
    draggingEnd: false,
    dragStartX: 0,
    dragStartTime: 0
  },

  onLoad(options) {
    const videoPath = decodeURIComponent(options.videoPath || '')
    console.log('接收到的视频路径:', videoPath)
    console.log('原始参数:', options)
    
    if (!videoPath) {
      wx.showToast({
        title: '视频路径错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 验证视频路径格式
    if (!videoPath.startsWith('http://') && !videoPath.startsWith('https://') && !videoPath.startsWith('wxfile://') && !videoPath.startsWith('file://')) {
      console.warn('视频路径格式可能不正确:', videoPath)
    }

    // 设置视频路径
    this.setData({ 
      videoPath: videoPath,
      trimEnd: Math.min(this.data.videoDuration, 10)
    })
    
    // 延迟初始化视频上下文，确保组件已渲染
    this.videoContext = null
    setTimeout(() => {
      try {
        this.videoContext = wx.createVideoContext('videoPlayer', this)
        if (this.videoContext) {
          console.log('视频上下文创建成功')
          // 设置初始时间
          this.videoContext.seek(0)
        } else {
          console.error('视频上下文创建失败')
        }
      } catch (e) {
        console.error('创建视频上下文异常:', e)
      }
    }, 800)
  },

  // 视频元数据加载完成
  onVideoLoadedMetadata(e) {
    console.log('视频元数据加载完成:', e.detail)
    const duration = e.detail.duration
    if (duration && duration > 0) {
      console.log('视频时长:', duration, '秒')
      this.setData({
        videoDuration: duration,
        trimEnd: Math.min(duration, 10)
      })
    } else {
      console.warn('视频时长获取失败，使用默认值')
    }
  },

  // 视频加载完成
  onVideoLoad(e) {
    console.log('视频加载完成:', e.detail)
    console.log('当前视频路径:', this.data.videoPath)
    // 确保视频上下文已创建
    if (!this.videoContext) {
      this.videoContext = wx.createVideoContext('videoPlayer', this)
      console.log('视频加载时创建视频上下文')
    }
  },

  // 视频等待加载
  onVideoWaiting(e) {
    console.log('视频等待加载:', e.detail)
  },

  // 视频加载错误
  onVideoError(e) {
    console.error('视频播放错误:', e.detail)
    console.error('错误详情:', JSON.stringify(e.detail))
    console.error('视频路径:', this.data.videoPath)
    wx.showModal({
      title: '视频加载失败',
      content: `错误信息: ${e.detail.errMsg || '未知错误'}\n\n视频路径: ${this.data.videoPath}`,
      showCancel: false
    })
  },

  // 视频播放控制 - 只播放选中区域
  togglePlay() {
    if (!this.videoContext) {
      this.videoContext = wx.createVideoContext('videoPlayer', this)
    }
    
    const videoContext = this.videoContext
    if (this.data.isPlaying) {
      videoContext.pause()
    } else {
      // 先跳转到选中区域的开始位置
      const currentTime = this.data.currentTime
      const trimStart = this.data.trimStart
      const trimEnd = this.data.trimEnd
      
      // 如果当前时间不在选中区域内，跳转到开始位置
      if (currentTime < trimStart || currentTime >= trimEnd) {
        videoContext.seek(trimStart)
        this.setData({ currentTime: trimStart })
      }
      
      // 播放视频
      videoContext.play()
    }
  },

  // 视频时间更新
  onVideoTimeUpdate(e) {
    const currentTime = e.detail.currentTime
    const trimStart = this.data.trimStart
    const trimEnd = this.data.trimEnd
    
    if (!this.videoContext) {
      this.videoContext = wx.createVideoContext('videoPlayer', this)
    }
    const videoContext = this.videoContext
    
    // 如果播放到选中区域的结束位置，自动停止并回到开始位置
    if (currentTime >= trimEnd) {
      videoContext.pause()
      videoContext.seek(trimStart)
      this.setData({ isPlaying: false, currentTime: trimStart })
      return
    }
    
    // 如果播放时间小于选中区域的开始位置，跳转到开始位置
    if (currentTime < trimStart) {
      videoContext.seek(trimStart)
      this.setData({ currentTime: trimStart })
      return
    }
    
    this.setData({ currentTime })
  },

  // 视频播放
  onVideoPlay() {
    this.setData({ isPlaying: true })
  },

  // 视频暂停
  onVideoPause() {
    this.setData({ isPlaying: false })
  },

  // 视频结束
  onVideoEnded() {
    if (!this.videoContext) {
      this.videoContext = wx.createVideoContext('videoPlayer', this)
    }
    this.videoContext.seek(this.data.trimStart)
    this.setData({ isPlaying: false, currentTime: this.data.trimStart })
  },

  // 时间轴触摸开始
  onTimelineTouchStart(e) {
    const touch = e.touches[0]
    const query = wx.createSelectorQuery().in(this)
    query.select('.timeline-track').boundingClientRect((rect) => {
      if (rect) {
        const percent = (touch.clientX - rect.left) / rect.width
        const time = Math.max(0, Math.min(this.data.videoDuration, percent * this.data.videoDuration))
        
        // 跳转到指定时间
        if (!this.videoContext) {
          this.videoContext = wx.createVideoContext('videoPlayer', this)
        }
        this.videoContext.seek(time)
        this.setData({ currentTime: time })
      }
    }).exec()
  },

  // 时间轴触摸移动
  onTimelineTouchMove(e) {
    if (this.data.draggingStart || this.data.draggingEnd) {
      return
    }
    const touch = e.touches[0]
    const query = wx.createSelectorQuery().in(this)
    query.select('.timeline-track').boundingClientRect((rect) => {
      if (rect) {
        const percent = (touch.clientX - rect.left) / rect.width
        const time = Math.max(0, Math.min(this.data.videoDuration, percent * this.data.videoDuration))
        this.setData({ currentTime: time })
      }
    }).exec()
  },

  // 时间轴触摸结束
  onTimelineTouchEnd(e) {
    if (!this.data.draggingStart && !this.data.draggingEnd) {
      if (!this.videoContext) {
        this.videoContext = wx.createVideoContext('videoPlayer', this)
      }
      this.videoContext.seek(this.data.currentTime)
    }
  },

  // 选择框手柄触摸开始
  onHandleTouchStart(e) {
    const type = e.currentTarget.dataset.type
    const touch = e.touches[0]
    
    this.setData({
      draggingStart: type === 'start',
      draggingEnd: type === 'end',
      dragStartX: touch.clientX,
      dragStartTime: type === 'start' ? this.data.trimStart : this.data.trimEnd
    })
    
    e.stopPropagation()
  },

  // 选择框手柄触摸移动
  onHandleTouchMove(e) {
    if (!this.data.draggingStart && !this.data.draggingEnd) return
    
    const touch = e.touches[0]
    const query = wx.createSelectorQuery().in(this)
    query.select('.timeline-track').boundingClientRect((rect) => {
      if (rect) {
        const deltaX = touch.clientX - this.data.dragStartX
        const deltaTime = (deltaX / rect.width) * this.data.videoDuration
        const newTime = Math.max(0, Math.min(this.data.videoDuration, this.data.dragStartTime + deltaTime))
        
        if (!this.videoContext) {
          this.videoContext = wx.createVideoContext('videoPlayer', this)
        }
        const videoContext = this.videoContext
        
        if (this.data.draggingStart) {
          // 拖动开始手柄
          if (newTime < this.data.trimEnd - 0.5) {
            this.setData({ trimStart: newTime })
            videoContext.seek(newTime)
            this.setData({ currentTime: newTime })
          }
        } else if (this.data.draggingEnd) {
          // 拖动结束手柄
          if (newTime > this.data.trimStart + 0.5) {
            this.setData({ trimEnd: newTime })
            videoContext.seek(newTime)
            this.setData({ currentTime: newTime })
          }
        }
      }
    }).exec()
  },

  onHandleTouchEnd(e) {
    this.setData({
      draggingStart: false,
      draggingEnd: false
    })
  },

  // 抠图按钮点击
  onRemoveBgClick() {
    wx.navigateTo({
      url: `/pages/video-removebg/video-removebg?videoPath=${encodeURIComponent(this.data.videoPath)}&trimStart=${this.data.trimStart}&trimEnd=${this.data.trimEnd}`
    })
  },

  // 裁剪按钮点击
  onCropClick() {
    wx.navigateTo({
      url: `/pages/video-crop/video-crop?videoPath=${encodeURIComponent(this.data.videoPath)}&trimStart=${this.data.trimStart}&trimEnd=${this.data.trimEnd}`
    })
  },

  // 添加文字按钮点击
  onAddTextClick() {
    wx.navigateTo({
      url: `/pages/video-text/video-text?videoPath=${encodeURIComponent(this.data.videoPath)}&trimStart=${this.data.trimStart}&trimEnd=${this.data.trimEnd}`
    })
  },

  // 导出GIF
  onExportGIF() {
    wx.showLoading({
      title: '正在导出GIF...',
      mask: true
    })

    // 调用导出工具函数
    videoUtils.exportVideoToGIF({
      videoPath: this.data.videoPath,
      startTime: this.data.trimStart,
      endTime: this.data.trimEnd,
      fps: 12,
      width: 240,
      height: 240,
      maxSize: 500 * 1024 // 500kb
    }).then((result) => {
      wx.hideLoading()
      if (result.success) {
        // 保存到相册
        wx.saveImageToPhotosAlbum({
          filePath: result.filePath,
          success: () => {
            wx.showToast({
              title: 'GIF已保存到相册',
              icon: 'success'
            })
          },
          fail: (err) => {
            console.error('保存失败:', err)
            if (err.errMsg && err.errMsg.includes('auth deny')) {
              wx.showModal({
                title: '需要授权',
                content: '需要授权保存到相册',
                showCancel: false
              })
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              })
            }
          }
        })
      }
    }).catch((err) => {
      wx.hideLoading()
      console.error('导出失败:', err)
    })
  }
})
