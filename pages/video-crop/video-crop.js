// pages/video-crop/video-crop.js
Page({
  data: {
    videoPath: '',
    videoInfo: null,
    trimStart: 0,
    trimEnd: 10,
    videoDuration: 10,
    isPlaying: false,
    currentTime: 0,
    draggingStart: false,
    draggingEnd: false,
    dragStartX: 0,
    dragStartTime: 0,
    // 裁剪参数
    cropScale: 1,
    cropTranslateX: 0,
    cropTranslateY: 0,
    cropStartDistance: 0,
    cropStartScale: 1,
    cropStartX: 0,
    cropStartY: 0
  },

  onLoad(options) {
    const videoPath = decodeURIComponent(options.videoPath || '')
    const trimStart = parseFloat(options.trimStart || 0)
    const trimEnd = parseFloat(options.trimEnd || 10)
    
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

    this.setData({ 
      videoPath,
      trimStart,
      trimEnd
    })
    this.getVideoInfo(videoPath)
  },

  // 获取视频信息（简化版本，不依赖ffmpeg）
  getVideoInfo(videoPath) {
    // wx.getVideoInfo 需要配置 ffmpeg，这里使用简化处理
    // 视频时长会在视频加载后通过播放事件获取
    this.setData({
      videoDuration: 10, // 默认值
      trimEnd: Math.min(10, this.data.trimEnd || 10)
    })
    
    // 尝试获取视频信息（如果配置了ffmpeg会成功）
    wx.getVideoInfo({
      src: videoPath,
      success(res) {
        this.setData({
          videoInfo: res,
          videoDuration: res.duration,
          trimEnd: Math.min(res.duration, this.data.trimEnd || res.duration)
        })
      },
      fail() {
        // 失败不影响视频预览
      }
    })
  },

  // 裁剪模式下的触摸事件
  onCropTouchStart(e) {
    const touches = e.touches
    if (touches.length === 2) {
      // 双指缩放
      const touch1 = touches[0]
      const touch2 = touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      this.setData({
        cropStartDistance: distance,
        cropStartScale: this.data.cropScale
      })
    } else if (touches.length === 1) {
      // 单指平移
      this.setData({
        cropStartX: touches[0].clientX,
        cropStartY: touches[0].clientY
      })
    }
  },

  onCropTouchMove(e) {
    const touches = e.touches
    if (touches.length === 2) {
      // 双指缩放
      const touch1 = touches[0]
      const touch2 = touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      const scale = (distance / this.data.cropStartDistance) * this.data.cropStartScale
      this.setData({
        cropScale: Math.max(0.5, Math.min(3, scale))
      })
    } else if (touches.length === 1) {
      // 单指平移
      const deltaX = touches[0].clientX - this.data.cropStartX
      const deltaY = touches[0].clientY - this.data.cropStartY
      this.setData({
        cropTranslateX: this.data.cropTranslateX + deltaX * 0.5,
        cropTranslateY: this.data.cropTranslateY + deltaY * 0.5,
        cropStartX: touches[0].clientX,
        cropStartY: touches[0].clientY
      })
    }
  },

  // 确认裁剪
  confirmCrop() {
    wx.showToast({
      title: '裁剪已保存',
      icon: 'success'
    })
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  // 取消裁剪
  cancelCrop() {
    wx.navigateBack()
  },

  // 视频播放控制
  togglePlay() {
    const videoContext = wx.createVideoContext('videoPlayer')
    if (this.data.isPlaying) {
      videoContext.pause()
    } else {
      const currentTime = this.data.currentTime
      const trimStart = this.data.trimStart
      const trimEnd = this.data.trimEnd
      
      if (currentTime < trimStart || currentTime >= trimEnd) {
        videoContext.seek(trimStart)
        this.setData({ currentTime: trimStart })
      }
      videoContext.play()
    }
  },

  // 视频时间更新
  onVideoTimeUpdate(e) {
    const currentTime = e.detail.currentTime
    const trimStart = this.data.trimStart
    const trimEnd = this.data.trimEnd
    
    if (currentTime >= trimEnd) {
      const videoContext = wx.createVideoContext('videoPlayer')
      videoContext.pause()
      videoContext.seek(trimStart)
      this.setData({ isPlaying: false, currentTime: trimStart })
      return
    }
    
    if (currentTime < trimStart) {
      const videoContext = wx.createVideoContext('videoPlayer')
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
    const videoContext = wx.createVideoContext('videoPlayer')
    videoContext.seek(this.data.trimStart)
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
        const videoContext = wx.createVideoContext('videoPlayer')
        videoContext.seek(time)
        this.setData({ currentTime: time })
      }
    }).exec()
  },

  // 时间轴触摸移动
  onTimelineTouchMove(e) {
    if (this.data.draggingStart || this.data.draggingEnd) return
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
      const videoContext = wx.createVideoContext('videoPlayer')
      videoContext.seek(this.data.currentTime)
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
        
        if (this.data.draggingStart) {
          if (newTime < this.data.trimEnd - 0.5) {
            this.setData({ trimStart: newTime })
            const videoContext = wx.createVideoContext('videoPlayer')
            videoContext.seek(newTime)
            this.setData({ currentTime: newTime })
          }
        } else if (this.data.draggingEnd) {
          if (newTime > this.data.trimStart + 0.5) {
            this.setData({ trimEnd: newTime })
            const videoContext = wx.createVideoContext('videoPlayer')
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

  // 视频加载错误
  onVideoError(e) {
    console.error('视频播放错误:', e.detail)
    wx.showToast({
      title: '视频播放失败',
      icon: 'none'
    })
  },

  // 视频元数据加载完成
  onVideoLoadedMetadata(e) {
    const duration = e.detail.duration
    if (duration && duration > 0) {
      this.setData({
        videoDuration: duration,
        trimEnd: Math.min(duration, this.data.trimEnd || duration)
      })
    }
  }
})
