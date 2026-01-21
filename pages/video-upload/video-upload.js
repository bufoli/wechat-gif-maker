// pages/video-upload/video-upload.js
Page({
  data: {
    videoPath: '',
    videoInfo: null,
    uploading: false
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '上传视频'
    })
  },

  // 选择视频
  chooseVideo() {
    const that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 10, // 限制10秒
      camera: 'back',
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath
        const duration = res.tempFiles[0].duration
        
        // 检查视频时长
        if (duration > 10) {
          wx.showToast({
            title: '视频时长不能超过10秒',
            icon: 'none',
            duration: 2000
          })
          return
        }

        // 获取视频信息
        that.getVideoInfo(tempFilePath)
      },
      fail(err) {
        console.error('选择视频失败', err)
        wx.showToast({
          title: '选择视频失败',
          icon: 'none'
        })
      }
    })
  },

  // 获取视频信息
  getVideoInfo(videoPath) {
    const that = this
    wx.getVideoInfo({
      src: videoPath,
      success(res) {
        that.setData({
          videoPath: videoPath,
          videoInfo: {
            duration: res.duration,
            width: res.width,
            height: res.height,
            size: res.size
          }
        })
      },
      fail(err) {
        console.error('获取视频信息失败', err)
        that.setData({
          videoPath: videoPath,
          videoInfo: {
            duration: 0,
            width: 0,
            height: 0,
            size: 0
          }
        })
      }
    })
  },

  // 进入编辑页面
  goToEdit() {
    if (!this.data.videoPath) {
      wx.showToast({
        title: '请先上传视频',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/video-edit/video-edit?videoPath=${encodeURIComponent(this.data.videoPath)}`
    })
  },

  // 重新选择
  reselect() {
    this.setData({
      videoPath: '',
      videoInfo: null
    })
    this.chooseVideo()
  }
})
