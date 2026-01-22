// 云函数：将视频转换为序列帧
// 注意：由于微信云函数默认环境不支持FFmpeg，此云函数返回一个标记
// 前端会自动使用Canvas API在本地处理视频
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const {
    videoPath, // 视频文件路径
    fps = 12, // 帧率
    width = 240, // 宽度
    height = 240 // 高度
  } = event

  try {
    console.log('开始处理视频:', videoPath)
    console.log('参数: fps=', fps, 'width=', width, 'height=', height)
    
    // 下载视频文件到本地（用于验证）
    let downloadRes
    try {
      downloadRes = await cloud.downloadFile({
        fileID: videoPath
      })
      console.log('视频文件下载成功:', downloadRes.tempFilePath)
    } catch (downloadErr) {
      console.error('视频文件下载失败:', downloadErr)
      return {
        success: false,
        error: '视频文件下载失败',
        message: downloadErr.message || '无法下载视频文件',
        frameUrls: []
      }
    }
    
    // 由于云函数环境不支持FFmpeg，返回一个特殊标记
    // 前端会检测到这个标记，自动使用Canvas API在本地处理
    console.log('⚠️ 云函数环境不支持FFmpeg，返回标记让前端使用本地处理')
    
    return {
      success: false,
      error: 'USE_LOCAL_PROCESSING',
      message: '云函数环境不支持FFmpeg，将使用前端Canvas API处理视频',
      frameUrls: [],
      useLocalProcessing: true, // 标记使用本地处理
      videoInfo: {
        tempFilePath: downloadRes.tempFilePath,
        fileID: videoPath
      }
    }
    
  } catch (error) {
    console.error('视频处理失败:', error)
    return {
      success: false,
      error: error.message,
      frameUrls: []
    }
  }
}
