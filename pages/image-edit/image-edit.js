// image-edit.js
Page({
  data: {
    category: '',
    frameId: '',
    frameName: '',
    framePreview: '',
    userImage: '',
    resultImage: '',
    generating: false
  },

  onLoad(options) {
    const category = options.category || ''
    const frameId = options.frameId || ''
    const frameName = decodeURIComponent(options.frameName || '')
    const framePreview = decodeURIComponent(options.framePreview || '')

    this.setData({
      category,
      frameId,
      frameName,
      framePreview
    })

    wx.setNavigationBarTitle({
      title: '制作表情包'
    })

    // 加载边框图片
    if (framePreview) {
      this.loadFrameImage(framePreview)
    }
  },

  // 加载边框图片
  loadFrameImage(framePreview) {
    // 这里应该加载真实的边框图片
    // 暂时使用占位符
    console.log('加载边框图片:', framePreview)
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        console.log('选择的图片:', tempFilePath)
        
        this.setData({ userImage: tempFilePath })
        
        // 自动裁剪为正方形并预览
        this.cropToSquare(tempFilePath).then(() => {
          // 裁剪完成后，生成预览
          this.generatePreview()
        })
      },
      fail: (err) => {
        console.error('选择图片失败:', err)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    })
  },

  // 裁剪为正方形（截取中间部分）
  cropToSquare(imagePath) {
    return new Promise((resolve, reject) => {
      // 获取图片信息
      wx.getImageInfo({
        src: imagePath,
        success: (res) => {
          const { width, height } = res
          console.log('图片尺寸:', width, height)

          // 计算裁剪区域（取中间正方形）
          const size = Math.min(width, height)
          const x = (width - size) / 2
          const y = (height - size) / 2

          // 使用Canvas裁剪
          const ctx = wx.createCanvasContext('cropCanvas', this)
          
          // 绘制裁剪后的图片
          ctx.drawImage(imagePath, x, y, size, size, 0, 0, 240, 240)
          ctx.draw(false, () => {
            setTimeout(() => {
              // 导出裁剪后的图片
              wx.canvasToTempFilePath({
                canvasId: 'cropCanvas',
                x: 0,
                y: 0,
                width: 240,
                height: 240,
                destWidth: 240,
                destHeight: 240,
                fileType: 'png',
                quality: 1,
                success: (res) => {
                  console.log('裁剪完成:', res.tempFilePath)
                  this.setData({ croppedImage: res.tempFilePath })
                  resolve(res.tempFilePath)
                },
                fail: reject
              }, this)
            }, 200)
          })
        },
        fail: reject
      })
    })
  },

  // 生成预览
  generatePreview() {
    if (!this.data.croppedImage || !this.data.framePath) {
      return
    }

    // 合成图片（用户照片 + 边框）
    this.compositeImages(this.data.croppedImage, this.data.framePath).then((resultPath) => {
      // 预览结果
      console.log('预览生成完成:', resultPath)
    }).catch((err) => {
      console.error('生成预览失败:', err)
    })
  },

  // 生成最终图片
  generateImage() {
    if (!this.data.croppedImage) {
      wx.showToast({
        title: '请先上传照片',
        icon: 'none'
      })
      return
    }

    this.setData({ generating: true })

    wx.showLoading({
      title: '生成中...',
      mask: true
    })

    // 合成图片
    this.compositeImages(this.data.croppedImage, this.data.framePath).then((resultPath) => {
      wx.hideLoading()
      this.setData({
        resultImage: resultPath,
        generating: false
      })
      wx.showToast({
        title: '生成成功',
        icon: 'success'
      })
    }).catch((err) => {
      wx.hideLoading()
      console.error('生成图片失败:', err)
      wx.showToast({
        title: '生成失败',
        icon: 'none'
      })
      this.setData({ generating: false })
    })
  },

  // 合成图片（用户照片 + 边框）
  compositeImages(userImagePath, frameImagePath) {
    return new Promise((resolve, reject) => {
      // 由于边框图片可能不存在，我们先用占位符
      // 实际项目中，边框图片应该已经下载到本地
      
      const ctx = wx.createCanvasContext('compositeCanvas', this)
      
      // 先绘制用户照片（作为底层）
      ctx.drawImage(userImagePath, 0, 0, 240, 240)
      
      // 再绘制边框（作为顶层，透明底PNG）
      // 注意：如果frameImagePath不存在，跳过边框绘制
      if (frameImagePath && frameImagePath !== '/images/placeholder.png') {
        ctx.drawImage(frameImagePath, 0, 0, 240, 240)
      }
      
      ctx.draw(false, () => {
        setTimeout(() => {
          // 导出合成后的图片
          wx.canvasToTempFilePath({
            canvasId: 'compositeCanvas',
            x: 0,
            y: 0,
            width: 240,
            height: 240,
            destWidth: 240,
            destHeight: 240,
            fileType: 'png',
            quality: 1,
            success: (res) => {
              console.log('合成完成:', res.tempFilePath)
              resolve(res.tempFilePath)
            },
            fail: reject
          }, this)
        }, 300)
      })
    })
  },

  // 保存图片到相册
  saveImage() {
    if (!this.data.resultImage) {
      wx.showToast({
        title: '没有可保存的图片',
        icon: 'none'
      })
      return
    }

    wx.saveImageToPhotosAlbum({
      filePath: this.data.resultImage,
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('保存失败:', err)
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要授权',
            content: '需要授权访问相册才能保存图片',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
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
})
