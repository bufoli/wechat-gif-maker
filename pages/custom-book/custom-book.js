// custom-book.js
Page({
  data: {
    step: 1,
    templates: [],
    selectedTemplate: null,
    photos: [],
    progress: 0,
    resultBook: null
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '私人订制绘本'
    })

    // 加载模板列表
    this.loadTemplates()
  },

  // 加载模板列表
  loadTemplates() {
    // 这里应该从服务器加载模板数据
    const templates = [
      {
        id: 1,
        name: '成长日记',
        preview: '/images/templates/chengzhang.jpg',
        photoCount: 5
      },
      {
        id: 2,
        name: '生日纪念',
        preview: '/images/templates/shengri.jpg',
        photoCount: 8
      },
      {
        id: 3,
        name: '旅行回忆',
        preview: '/images/templates/lvxing.jpg',
        photoCount: 6
      }
    ]

    this.setData({ templates })
  },

  // 选择模板
  selectTemplate(e) {
    const template = e.currentTarget.dataset.template
    this.setData({
      selectedTemplate: template,
      photos: new Array(template.photoCount || 5).fill(null),
      step: 2
    })
  },

  // 选择照片
  choosePhoto(e) {
    const index = e.currentTarget.dataset.index
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        const photos = this.data.photos
        photos[index] = tempFilePath
        this.setData({ photos })
      },
      fail: (err) => {
        console.error('选择照片失败:', err)
        wx.showToast({
          title: '选择照片失败',
          icon: 'none'
        })
      }
    })
  },

  // 下一步
  nextStep() {
    if (this.data.step === 2) {
      // 检查是否所有照片都已上传
      const allPhotosUploaded = this.data.photos.every(photo => photo !== null)
      if (!allPhotosUploaded) {
        wx.showToast({
          title: '请上传所有照片',
          icon: 'none'
        })
        return
      }

      // 进入生成步骤
      this.setData({ step: 3 })
      this.generateBook()
    }
  },

  // 生成绘本
  generateBook() {
    wx.showLoading({
      title: '生成中...',
      mask: true
    })

    // 模拟生成进度
    let progress = 0
    const timer = setInterval(() => {
      progress += 10
      this.setData({ progress })

      if (progress >= 100) {
        clearInterval(timer)
        wx.hideLoading()

        // 生成完成
        const resultBook = {
          id: Date.now(),
          title: this.data.selectedTemplate.name,
          cover: this.data.photos[0], // 使用第一张照片作为封面
          pages: this.data.photos.map((photo, index) => ({
            image: photo,
            text: `第${index + 1}页`
          }))
        }

        this.setData({ resultBook })
      }
    }, 300)
  },

  // 预览绘本
  previewBook() {
    if (!this.data.resultBook) {
      return
    }

    // 跳转到阅读页面
    wx.navigateTo({
      url: `/pages/book-reader/book-reader?bookId=${this.data.resultBook.id}&section=custom&title=${encodeURIComponent(this.data.resultBook.title)}`
    })
  },

  // 保存绘本
  saveBook() {
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  }
})
