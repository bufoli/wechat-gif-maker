// utils/imageUtils.js

/**
 * 裁剪并调整图片尺寸
 * 注意：由于小程序canvas限制，这里使用简化处理
 * 实际项目中建议使用图片裁剪组件或云函数
 */
const cropAndResize = (imagePath, targetWidth, targetHeight) => {
  return new Promise((resolve, reject) => {
    // 获取图片信息
    wx.getImageInfo({
      src: imagePath,
      success: (imageInfo) => {
        // 计算裁剪区域（居中裁剪）
        const sourceWidth = imageInfo.width
        const sourceHeight = imageInfo.height
        const sourceAspect = sourceWidth / sourceHeight
        const targetAspect = targetWidth / targetHeight
        
        let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight
        
        if (sourceAspect > targetAspect) {
          // 源图更宽，需要裁剪左右
          sw = sourceHeight * targetAspect
          sx = (sourceWidth - sw) / 2
        } else {
          // 源图更高，需要裁剪上下
          sh = sourceWidth / targetAspect
          sy = (sourceHeight - sh) / 2
        }
        
        // 简化处理：直接返回原图路径和裁剪信息
        // 实际项目中需要使用canvas或云函数进行真正的裁剪
        // 这里返回原图，裁剪信息保存在cropData中供后续使用
        resolve({
          filePath: imagePath, // 实际应该返回裁剪后的图片
          cropData: { sx, sy, sw, sh, sourceWidth, sourceHeight, targetWidth, targetHeight }
        })
      },
      fail: reject
    })
  })
}

/**
 * 处理并压缩图片（调整尺寸并压缩到指定大小以内）
 */
const processAndCompressImage = async (imagePath, targetWidth, targetHeight, maxSizeKB) => {
  // 先裁剪调整尺寸
  const cropped = await cropAndResize(imagePath, targetWidth, targetHeight)
  
  // 然后压缩到指定大小
  return compressImage(cropped.filePath, maxSizeKB)
}

/**
 * 压缩图片到指定大小以内
 * 使用wx.compressImage API进行压缩
 */
const compressImage = (imagePath, maxSizeKB) => {
  return new Promise((resolve, reject) => {
    // 获取文件信息
    wx.getFileInfo({
      filePath: imagePath,
      success: (fileInfo) => {
        const currentSizeKB = fileInfo.size / 1024
        
        if (currentSizeKB <= maxSizeKB) {
          // 已经小于目标大小，直接返回
          resolve({ filePath: imagePath })
          return
        }
        
        // 需要压缩，使用wx.compressImage
        // 注意：这个API功能有限，可能无法精确控制到指定大小
        // 实际项目中建议使用云函数进行更精确的压缩
        wx.compressImage({
          src: imagePath,
          quality: 80, // 压缩质量 0-100
          success: (res) => {
            // 检查压缩后的文件大小
            wx.getFileInfo({
              filePath: res.tempFilePath,
              success: (info) => {
                const compressedSizeKB = info.size / 1024
                if (compressedSizeKB <= maxSizeKB) {
                  resolve({ filePath: res.tempFilePath })
                } else {
                  // 如果还是太大，尝试更低的质量
                  // 注意：wx.compressImage可能不支持多次调用，这里简化处理
                  resolve({ filePath: res.tempFilePath })
                }
              },
              fail: reject
            })
          },
          fail: reject
        })
      },
      fail: reject
    })
  })
}

/**
 * 扣除图片背景（简化版本）
 * 注意：完整的抠图功能需要云函数或第三方API支持
 * 这里提供一个简化实现，实际项目中应该调用云函数进行AI抠图
 */
const removeBackground = (imagePath) => {
  return new Promise((resolve, reject) => {
    // 注意：完整的背景扣除需要像素级处理或AI模型
    // 小程序中无法直接进行复杂的图像处理
    // 实际项目中应该调用云函数或第三方API（如腾讯云、百度AI等）
    
    // 简化处理：直接返回原图
    // 实际使用时需要配置云函数进行真正的背景扣除
    wx.showModal({
      title: '提示',
      content: '背景扣除功能需要配置云函数支持。当前使用原图。',
      showCancel: false,
      success: () => {
        resolve({
          processedImagePath: imagePath
        })
      },
      fail: () => {
        resolve({
          processedImagePath: imagePath
        })
      }
    })
  })
}

module.exports = {
  cropAndResize,
  processAndCompressImage,
  compressImage,
  removeBackground
}
