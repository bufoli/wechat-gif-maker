// pages/video-text/video-text.js
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
    // 文字相关
    texts: [],
    currentTextIndex: -1,
    editingText: '',
    selectedFont: 'PingFang SC',
    fonts: [
      { name: '苹方', value: 'PingFang SC' },
      { name: '思源', value: 'Source Han Sans CN' },
      { name: '微软雅黑', value: 'Microsoft YaHei' },
      { name: 'Arial', value: 'Arial' }
    ],
    // 文字操作相关
    textStartX: 0,
    textStartY: 0,
    textStartPosX: 0,
    textStartPosY: 0,
    textStartScale: 1,
    textStartRotate: 0,
    textStartDistance: 0,
    isTextEditing: false
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

  // 文字输入
  onTextInput(e) {
    this.setData({
      editingText: e.detail.value
    })
  },

  // 选择字体
  selectFont(e) {
    const font = e.currentTarget.dataset.font
    this.setData({
      selectedFont: font
    })
  },

  // 确认添加文字
  confirmAddText() {
    if (!this.data.editingText.trim()) {
      wx.showToast({
        title: '请输入文字',
        icon: 'none'
      })
      return
    }
    
    const texts = this.data.texts
    
    if (this.data.currentTextIndex >= 0 && this.data.isTextEditing) {
      // 编辑现有文字
      texts[this.data.currentTextIndex].content = this.data.editingText
      texts[this.data.currentTextIndex].fontFamily = this.data.selectedFont
      this.setData({
        texts: texts,
        editingText: '',
        isTextEditing: false,
        currentTextIndex: -1
      })
    } else {
      // 添加新文字（居中显示）
      const query = wx.createSelectorQuery().in(this)
      query.select('.preview-wrapper').boundingClientRect((rect) => {
        if (rect) {
          const centerX = rect.width / 2
          const centerY = rect.height / 2
          const newText = {
            id: Date.now(),
            content: this.data.editingText,
            x: centerX,
            y: centerY,
            fontSize: 32,
            color: '#FFFFFF',
            fontFamily: this.data.selectedFont,
            scale: 1,
            rotate: 0
          }
          texts.push(newText)
          
          this.setData({
            texts: texts,
            currentTextIndex: texts.length - 1,
            editingText: ''
          })
        }
      }).exec()
    }
  },

  // 取消添加文字
  cancelAddText() {
    this.setData({
      editingText: ''
    })
  },

  // 文字触摸开始
  onTextTouchStart(e) {
    const index = e.currentTarget.dataset.index
    const touches = e.touches
    
    if (touches.length === 2) {
      // 双指缩放/旋转
      const touch1 = touches[0]
      const touch2 = touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI
      
      this.setData({
        currentTextIndex: index,
        textStartDistance: distance,
        textStartScale: this.data.texts[index].scale || 1,
        textStartRotate: this.data.texts[index].rotate || 0,
        textStartAngle: angle
      })
    } else if (touches.length === 1) {
      // 单指移动
      const touch = touches[0]
      this.setData({
        currentTextIndex: index,
        textStartX: touch.clientX,
        textStartY: touch.clientY,
        textStartPosX: this.data.texts[index].x,
        textStartPosY: this.data.texts[index].y
      })
    }
  },

  // 文字触摸移动
  onTextTouchMove(e) {
    if (this.data.currentTextIndex === -1) return
    
    const touches = e.touches
    const texts = this.data.texts
    const index = this.data.currentTextIndex
    
    if (touches.length === 2) {
      // 双指缩放/旋转
      const touch1 = touches[0]
      const touch2 = touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI
      
      const scale = (distance / this.data.textStartDistance) * this.data.textStartScale
      const rotate = this.data.textStartRotate + (angle - this.data.textStartAngle)
      
      texts[index].scale = Math.max(0.5, Math.min(3, scale))
      texts[index].rotate = rotate
    } else if (touches.length === 1) {
      // 单指移动
      const touch = touches[0]
      const query = wx.createSelectorQuery().in(this)
      query.select('.preview-wrapper').boundingClientRect((rect) => {
        if (rect) {
          const deltaX = (touch.clientX - this.data.textStartX) * (750 / rect.width)
          const deltaY = (touch.clientY - this.data.textStartY) * (750 / rect.width)
          
          texts[index].x = this.data.textStartPosX + deltaX
          texts[index].y = this.data.textStartPosY + deltaY
          
          this.setData({ texts })
        }
      }).exec()
      return
    }
    
    this.setData({ texts })
  },

  // 文字触摸结束
  onTextTouchEnd(e) {
    // 单击选中文字，双击编辑（简化实现为单击编辑）
    if (e.changedTouches.length === 1) {
      const index = this.data.currentTextIndex
      if (index >= 0 && !this.data.isTextEditing) {
        // 延迟判断是否为单击（非拖动）
        setTimeout(() => {
          const texts = this.data.texts
          if (index < texts.length) {
            this.setData({
              editingText: texts[index].content,
              selectedFont: texts[index].fontFamily,
              isTextEditing: true
            })
          }
        }, 200)
      }
    }
  },

  // 复制文字
  copyText(e) {
    const index = e.currentTarget.dataset.index || this.data.currentTextIndex
    if (index < 0) return
    
    const texts = this.data.texts
    const textToCopy = { ...texts[index] }
    textToCopy.id = Date.now()
    textToCopy.x += 20
    textToCopy.y += 20
    texts.push(textToCopy)
    
    this.setData({
      texts: texts,
      currentTextIndex: texts.length - 1
    })
    
    wx.showToast({
      title: '已复制',
      icon: 'success'
    })
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
