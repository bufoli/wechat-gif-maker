// utils/speechRecognition.js
// 语音识别工具函数

/**
 * 调用云函数进行语音识别
 * @param {string} audioPath - 录音文件路径
 * @returns {Promise} 识别结果
 */
const recognizeSpeech = (audioPath) => {
  return new Promise((resolve, reject) => {
    // 检查云开发是否可用
    if (!wx.cloud || !wx.cloud.callFunction) {
      reject(new Error('云开发未初始化，请先配置云开发环境'))
      return
    }

    // 先上传录音文件到云存储
    const cloudPath = `speech/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: audioPath,
      success: (uploadRes) => {
        console.log('录音文件上传成功:', uploadRes.fileID)
        
        // 调用云函数进行语音识别
        wx.cloud.callFunction({
          name: 'speechRecognition',
          data: {
            fileID: uploadRes.fileID,
            format: 'mp3',
            sampleRate: 16000
          },
          success: (res) => {
            console.log('语音识别结果:', res.result)
            if (res.result && res.result.success) {
              resolve({
                success: true,
                text: res.result.text || '',
                pinyin: res.result.pinyin || ''
              })
            } else {
              reject(new Error(res.result?.error || '识别失败'))
            }
          },
          fail: (err) => {
            console.error('云函数调用失败:', err)
            reject(new Error('语音识别服务调用失败'))
          }
        })
      },
      fail: (err) => {
        console.error('录音文件上传失败:', err)
        reject(new Error('录音文件上传失败'))
      }
    })
  })
}

/**
 * 使用第三方API进行语音识别（示例：百度语音识别）
 * 注意：需要配置API密钥
 */
const recognizeSpeechWithBaidu = (audioPath) => {
  return new Promise((resolve, reject) => {
    // 这里需要调用百度语音识别API
    // 实际使用时需要：
    // 1. 在云函数中配置百度API密钥
    // 2. 将录音文件转换为base64或直接上传
    // 3. 调用百度语音识别接口
    
    // 示例代码（需要在云函数中实现）：
    wx.cloud.callFunction({
      name: 'baiduSpeechRecognition',
      data: {
        audioPath: audioPath
      },
      success: (res) => {
        if (res.result && res.result.success) {
          resolve({
            success: true,
            text: res.result.text,
            pinyin: res.result.pinyin
          })
        } else {
          reject(new Error(res.result?.error || '识别失败'))
        }
      },
      fail: reject
    })
  })
}

/**
 * 将汉字转换为拼音（用于验证）
 * 这是一个简化的拼音转换，实际项目中可以使用更完善的拼音库
 */
const textToPinyin = (text) => {
  // 简化的拼音映射表（仅示例，实际需要完整的拼音库）
  const pinyinMap = {
    '啊': 'a', '哦': 'o', '额': 'e', '一': 'yi', '五': 'wu',
    '爸': 'ba', '怕': 'pa', '妈': 'ma', '发': 'fa',
    '大': 'da', '他': 'ta', '那': 'na', '拉': 'la',
    '嘎': 'ga', '卡': 'ka', '哈': 'ha',
    '家': 'jia', '恰': 'qia', '下': 'xia',
    '炸': 'zha', '查': 'cha', '沙': 'sha', '日': 'ri',
    '杂': 'za', '擦': 'ca', '撒': 'sa',
    '呀': 'ya', '哇': 'wa'
  }
  
  // 实际项目中应该使用完整的拼音库，如 pinyin-pro
  return text.split('').map(char => pinyinMap[char] || char).join('')
}

module.exports = {
  recognizeSpeech,
  recognizeSpeechWithBaidu,
  textToPinyin
}
