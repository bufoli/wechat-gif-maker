// pages/image-process/image-process.js
const imageUtils = require('../../utils/imageUtils.js')

Page({
  data: {
    // 横幅图片
    bannerImage: '',
    bannerCropped: false,
    bannerCropData: null,
    // 头像图片
    avatarImage: '',
    avatarCropped: false,
    avatarCropData: null,
    // 图标图片
    iconImage: '',
    iconCropped: false,
    iconCropData: null,
    // 裁剪相关
    showCropModal: false,
    currentCropType: '', // 'banner', 'avatar', 'icon'
    cropImagePath: '',
    // 导出状态
    exporting: false
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '图片处理'
    })
  },

  // 选择横幅图片
  chooseBanner() {
    this.chooseImage('banner', 750, 400)
  },

  // 选择头像图片
  chooseAvatar() {
    this.chooseImage('avatar', 240, 240)
  },

  // 选择图标图片
  chooseIcon() {
    this.chooseImage('icon', 50, 50)
  },

  // 选择图片通用方法
  chooseImage(type, targetWidth, targetHeight) {
    const that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFiles[0].path
        // 打开裁剪界面
        that.openCropModal(type, tempFilePath, targetWidth, targetHeight)
      },
      fail(err) {
        console.error('选择图片失败', err)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    })
  },

  // 打开裁剪模态框
  openCropModal(type, imagePath, targetWidth, targetHeight) {
    this.setData({
      showCropModal: true,
      currentCropType: type,
      cropImagePath: imagePath,
      targetWidth: targetWidth,
      targetHeight: targetHeight
    })
  },

  // 关闭裁剪模态框
  closeCropModal() {
    this.setData({
      showCropModal: false,
      currentCropType: '',
      cropImagePath: ''
    })
  },

  // 确认裁剪
  confirmCrop() {
    // 简化处理：直接使用原图，实际项目中应该使用裁剪组件
    const imagePath = this.data.cropImagePath
    const type = this.data.currentCropType
    const targetWidth = this.data.targetWidth
    const targetHeight = this.data.targetHeight

    // 调用工具函数进行裁剪和尺寸调整
    this.processCrop(imagePath, type, targetWidth, targetHeight)
  },

  // 处理裁剪
  async processCrop(imagePath, type, targetWidth, targetHeight) {
    wx.showLoading({
      title: '处理中...',
      mask: true
    })

    try {
      // 使用工具函数裁剪并调整尺寸
      const result = await imageUtils.cropAndResize(imagePath, targetWidth, targetHeight)
      
      if (type === 'banner') {
        this.setData({
          bannerImage: result.filePath,
          bannerCropped: true,
          bannerCropData: result.cropData
        })
      } else if (type === 'avatar') {
        this.setData({
          avatarImage: result.filePath,
          avatarCropped: true,
          avatarCropData: result.cropData
        })
      } else if (type === 'icon') {
        // 图标需要额外处理：扣除背景
        await this.processIconBackground(result.filePath, result.cropData)
      }

      wx.hideLoading()
      this.closeCropModal()
    } catch (error) {
      wx.hideLoading()
      console.error('裁剪失败', error)
      wx.showToast({
        title: '处理失败',
        icon: 'none'
      })
    }
  },

  // 阻止触摸移动
  preventTouchMove() {
    return false
  },

  // 裁剪完成
  onCropComplete(e) {
    const { croppedImagePath, cropData } = e.detail
    const type = this.data.currentCropType
    
    if (type === 'banner') {
      this.setData({
        bannerImage: croppedImagePath,
        bannerCropped: true,
        bannerCropData: cropData
      })
    } else if (type === 'avatar') {
      this.setData({
        avatarImage: croppedImagePath,
        avatarCropped: true,
        avatarCropData: cropData
      })
    } else if (type === 'icon') {
      // 图标需要额外处理：扣除背景
      this.processIconBackground(croppedImagePath, cropData)
    }

    this.closeCropModal()
  },

  // 处理图标背景（扣除背景）
  async processIconBackground(imagePath, cropData) {
    wx.showLoading({
      title: '处理中...',
      mask: true
    })

    try {
      // 调用工具函数扣除背景
      // 注意：完整的抠图功能需要云函数或第三方API支持
      const result = await imageUtils.removeBackground(imagePath)
      
      this.setData({
        iconImage: result.processedImagePath || imagePath,
        iconCropped: true,
        iconCropData: cropData
      })

      wx.hideLoading()
      wx.showToast({
        title: '处理完成',
        icon: 'success'
      })
    } catch (error) {
      wx.hideLoading()
      console.error('处理图标背景失败', error)
      // 如果抠图失败，使用原图
      this.setData({
        iconImage: imagePath,
        iconCropped: true,
        iconCropData: cropData
      })
      wx.showToast({
        title: '背景处理失败，使用原图',
        icon: 'none'
      })
    }
  },

  // 重新选择图片
  reselectImage(e) {
    const type = e.currentTarget.dataset.type
    if (type === 'banner') {
      this.chooseBanner()
    } else if (type === 'avatar') {
      this.chooseAvatar()
    } else if (type === 'icon') {
      this.chooseIcon()
    }
  },

  // 一键导出
  async exportAll() {
    if (this.data.exporting) return

    // 检查是否有图片
    if (!this.data.bannerImage && !this.data.avatarImage && !this.data.iconImage) {
      wx.showToast({
        title: '请至少上传一张图片',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '导出中...',
      mask: true
    })

    this.setData({ exporting: true })

    try {
      const exportTasks = []

      // 导出横幅
      if (this.data.bannerImage) {
        exportTasks.push(
          this.exportImage('banner', this.data.bannerImage, 750, 400, 'banner.png')
        )
      }

      // 导出头像
      if (this.data.avatarImage) {
        exportTasks.push(
          this.exportImage('avatar', this.data.avatarImage, 240, 240, 'avatar.png')
        )
      }

      // 导出图标
      if (this.data.iconImage) {
        exportTasks.push(
          this.exportImage('icon', this.data.iconImage, 50, 50, 'icon.png')
        )
      }

      // 等待所有导出完成
      await Promise.all(exportTasks)

      wx.hideLoading()
      wx.showToast({
        title: '导出成功',
        icon: 'success',
        duration: 2000
      })
    } catch (error) {
      wx.hideLoading()
      console.error('导出失败', error)
      wx.showToast({
        title: error.message || '导出失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      this.setData({ exporting: false })
    }
  },

  // 导出单张图片
  async exportImage(type, imagePath, targetWidth, targetHeight, fileName) {
    return new Promise(async (resolve, reject) => {
      try {
        // 使用工具函数处理图片：调整尺寸并压缩到500KB以内
        const result = await imageUtils.processAndCompressImage(
          imagePath,
          targetWidth,
          targetHeight,
          500 // 最大500KB
        )

        // 保存到相册
        await this.saveToAlbum(result.filePath)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  },

  // 保存到相册
  saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath: filePath,
        success: () => {
          resolve()
        },
        fail: (err) => {
          if (err.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '需要授权',
              content: '需要您授权保存图片到相册',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting()
                }
              }
            })
          }
          reject(err)
        }
      })
    })
  }
})
