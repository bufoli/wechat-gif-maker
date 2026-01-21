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
      videoPath: videoPath,
      trimEnd: Math.min(this.data.videoDuration, 10)
    })
  },

  // 视频元数据加载完成
  onVideoLoadedMetadata(e) {
    console.log('视频元数据加载完成:', e.detail)
    const duration = e.detail.duration
    if (duration && duration > 0) {
      this.setData({
        videoDuration: duration,
        trimEnd: Math.min(duration, 10)
      })
    }
  },

  // 视频加载完成
  onVideoLoad(e) {
    console.log('视频加载完成:', e.detail)
  },

  // 视频加载错误
  onVideoError(e) {
    console.error('视频播放错误:', e.detail)
    wx.showToast({
      title: '视频加载失败',
      icon: 'none'
    })
  },

  // 视频播放控制 - 只播放选中区域
  togglePlay() {
    const videoContext = wx.createVideoContext('videoPlayer', this)
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
    
    // 如果播放到选中区域的结束位置，自动停止并回到开始位置
    if (currentTime >= trimEnd) {
      const videoContext = wx.createVideoContext('videoPlayer', this)
      videoContext.pause()
      videoContext.seek(trimStart)
      this.setData({ isPlaying: false, currentTime: trimStart })
      return
    }
    
    // 如果播放时间小于选中区域的开始位置，跳转到开始位置
    if (currentTime < trimStart) {
      const videoContext = wx.createVideoContext('videoPlayer', this)
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
    const videoContext = wx.createVideoContext('videoPlayer', this)
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
        
        // 跳转到指定时间
        const videoContext = wx.createVideoContext('videoPlayer', this)
        videoContext.seek(time)
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
      const videoContext = wx.createVideoContext('videoPlayer', this)
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
          // 拖动开始手柄
          if (newTime < this.data.trimEnd - 0.5) {
            this.setData({ trimStart: newTime })
            const videoContext = wx.createVideoContext('videoPlayer', this)
            videoContext.seek(newTime)
            this.setData({ currentTime: newTime })
          }
        } else if (this.data.draggingEnd) {
          // 拖动结束手柄
          if (newTime > this.data.trimStart + 0.5) {
            this.setData({ trimEnd: newTime })
            const videoContext = wx.createVideoContext('videoPlayer', this)
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
