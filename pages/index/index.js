// index.js
const speechRecognition = require('../../utils/speechRecognition.js')

Page({
  data: {
    // 声母列表
    initials: ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'],
    // 韵母列表
    finals: ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er', 'an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong'],
    // 声调
    tones: ['', 'ˉ', 'ˊ', 'ˇ', 'ˋ'], // 空字符串表示轻声，1-4声
    toneNames: ['轻声', '一声', '二声', '三声', '四声'],
    
    // 当前抽取的拼音
    currentInitial: '', // 声母
    currentFinal: '', // 韵母
    currentTone: 0, // 声调索引（0-4）
    currentPinyin: '', // 完整拼音（带声调）
    currentPinyinDisplay: '', // 显示用的拼音（带声调符号）
    
    // 录音相关
    isRecording: false, // 是否正在录音
    recorderManager: null, // 录音管理器
    recordingTime: 0, // 录音时长（秒）
    recordingTimer: null, // 录音计时器
    
    // 识别结果
    recognitionResult: '', // 识别到的拼音
    isRecognizing: false, // 是否正在识别
    
    // 成功效果
    showSuccess: false, // 是否显示成功动画
    successAnimation: null // 成功动画定时器
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '拼音学习'
    })
    
    // 初始化录音管理器
    this.initRecorder()
    
    // 首次随机抽取
    this.generateRandomPinyin()
  },

  onUnload() {
    // 清理定时器
    if (this.data.recordingTimer) {
      clearInterval(this.data.recordingTimer)
    }
    if (this.data.successAnimation) {
      clearTimeout(this.data.successAnimation)
    }
    // 停止录音
    if (this.data.isRecording) {
      this.stopRecording()
    }
  },

  // 初始化录音管理器
  initRecorder() {
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStart(() => {
      console.log('录音开始')
      this.setData({ isRecording: true })
      this.startRecordingTimer()
    })
    
    recorderManager.onStop((res) => {
      console.log('录音结束', res)
      this.setData({ 
        isRecording: false,
        recordingTime: 0
      })
      this.stopRecordingTimer()
      
      // 处理录音文件
      this.handleRecordingResult(res.tempFilePath)
    })
    
    recorderManager.onError((err) => {
      console.error('录音错误', err)
      wx.showToast({
        title: '录音失败，请重试',
        icon: 'none'
      })
      this.setData({ 
        isRecording: false,
        recordingTime: 0
      })
      this.stopRecordingTimer()
    })
    
    this.setData({ recorderManager })
  },

  // 开始录音计时
  startRecordingTimer() {
    this.setData({ recordingTime: 0 })
    const timer = setInterval(() => {
      this.setData({
        recordingTime: this.data.recordingTime + 1
      })
    }, 1000)
    this.setData({ recordingTimer: timer })
  },

  // 停止录音计时
  stopRecordingTimer() {
    if (this.data.recordingTimer) {
      clearInterval(this.data.recordingTimer)
      this.setData({ recordingTimer: null })
    }
  },

  // 随机生成拼音
  generateRandomPinyin() {
    const { initials, finals, tones } = this.data
    
    // 随机选择声母（可能为空，因为有些拼音没有声母）
    const hasInitial = Math.random() > 0.3 // 70%概率有声母
    const initial = hasInitial ? initials[Math.floor(Math.random() * initials.length)] : ''
    
    // 随机选择韵母
    const final = finals[Math.floor(Math.random() * finals.length)]
    
    // 随机选择声调（0-4，0是轻声）
    const toneIndex = Math.floor(Math.random() * tones.length)
    
    // 组合完整拼音
    let pinyin = initial + final
    let pinyinDisplay = initial + final
    
    // 添加声调符号
    if (toneIndex > 0) {
      pinyinDisplay = this.addToneMark(pinyinDisplay, toneIndex)
    }
    
    // 完整拼音（用于验证）：声母+韵母+声调索引
    const fullPinyin = initial + final + (toneIndex > 0 ? toneIndex : '')
    
    this.setData({
      currentInitial: initial,
      currentFinal: final,
      currentTone: toneIndex,
      currentPinyin: fullPinyin,
      currentPinyinDisplay: pinyinDisplay,
      showSuccess: false,
      recognitionResult: ''
    })
    
    console.log('生成拼音:', {
      initial,
      final,
      tone: this.data.toneNames[toneIndex],
      pinyin: fullPinyin,
      display: pinyinDisplay
    })
  },

  // 添加声调符号到拼音
  addToneMark(pinyin, tone) {
    // 声调符号映射
    const toneMarks = {
      1: { a: 'ā', o: 'ō', e: 'ē', i: 'ī', u: 'ū', ü: 'ǖ' },
      2: { a: 'á', o: 'ó', e: 'é', i: 'í', u: 'ú', ü: 'ǘ' },
      3: { a: 'ǎ', o: 'ǒ', e: 'ě', i: 'ǐ', u: 'ǔ', ü: 'ǚ' },
      4: { a: 'à', o: 'ò', e: 'è', i: 'ì', u: 'ù', ü: 'ǜ' }
    }
    
    const marks = toneMarks[tone]
    if (!marks) return pinyin
    
    // 优先顺序：a > o > e > i > u > ü
    const priority = ['a', 'o', 'e', 'i', 'u', 'ü']
    
    for (let char of priority) {
      if (pinyin.includes(char)) {
        return pinyin.replace(char, marks[char])
      }
    }
    
    return pinyin
  },

  // 开始录音
  startRecording() {
    // 检查权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          // 未授权，请求授权
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.doStartRecording()
            },
            fail: () => {
              wx.showModal({
                title: '需要麦克风权限',
                content: '请允许使用麦克风进行语音识别',
                showCancel: false,
                success: () => {
                  wx.openSetting()
                }
              })
            }
          })
        } else {
          this.doStartRecording()
        }
      }
    })
  },

  // 执行开始录音
  doStartRecording() {
    const { recorderManager } = this.data
    if (!recorderManager) {
      wx.showToast({
        title: '录音功能初始化失败',
        icon: 'none'
      })
      return
    }
    
    recorderManager.start({
      duration: 10000, // 最长10秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3',
      frameSize: 50
    })
  },

  // 停止录音
  stopRecording() {
    const { recorderManager } = this.data
    if (recorderManager) {
      recorderManager.stop()
    }
  },

  // 处理录音结果
  async handleRecordingResult(tempFilePath) {
    this.setData({ isRecognizing: true })
    
    wx.showLoading({
      title: '正在识别...',
      mask: true
    })
    
    try {
      // 调用语音识别服务
      const result = await speechRecognition.recognizeSpeech(tempFilePath)
      
      if (result.success) {
        // 获取识别到的文本或拼音
        const recognizedText = result.text || ''
        const recognizedPinyin = result.pinyin || ''
        
        // 如果识别到的是汉字，需要转换为拼音
        // 如果识别到的是拼音，直接使用
        const finalPinyin = recognizedPinyin || this.textToPinyin(recognizedText)
        
        this.setData({ 
          recognitionResult: finalPinyin || recognizedText
        })
        
        // 验证是否正确
        this.verifyPinyin(finalPinyin || recognizedText)
      } else {
        throw new Error(result.error || '识别失败')
      }
      
    } catch (error) {
      console.error('识别失败:', error)
      
      // 如果云函数未配置，使用模拟识别作为降级方案
      if (error.message && error.message.includes('云开发')) {
        console.log('云开发未配置，使用模拟识别')
        await this.simulateRecognition(tempFilePath)
      } else {
        wx.showToast({
          title: error.message || '识别失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    } finally {
      wx.hideLoading()
      this.setData({ isRecognizing: false })
    }
  },

  // 模拟语音识别（降级方案，当云函数未配置时使用）
  async simulateRecognition(audioPath) {
    // 模拟识别延迟
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 为了演示，我们假设用户读对了
    // 实际项目中应该配置真实的语音识别服务
    const recognizedPinyin = this.data.currentPinyin
    
    this.setData({ 
      recognitionResult: recognizedPinyin,
      isRecognizing: false
    })
    
    // 验证是否正确
    this.verifyPinyin(recognizedPinyin)
    
    // 提示用户这是模拟结果
    wx.showToast({
      title: '当前为模拟识别，请配置云函数',
      icon: 'none',
      duration: 2000
    })
  },

  // 将汉字转换为拼音（简化版，用于验证）
  textToPinyin(text) {
    // 这里可以使用更完善的拼音库
    // 暂时返回原文本（实际项目中需要完整的拼音转换）
    return text.toLowerCase().trim()
  },

  // 验证拼音是否正确
  verifyPinyin(recognizedPinyin) {
    const { currentPinyin } = this.data
    
    // 标准化拼音（去除空格、转换为小写）
    const normalizedRecognized = recognizedPinyin.toLowerCase().trim()
    const normalizedCurrent = currentPinyin.toLowerCase().trim()
    
    // 简单的匹配逻辑（实际项目中可能需要更复杂的匹配算法）
    const isCorrect = normalizedRecognized === normalizedCurrent || 
                     normalizedRecognized.includes(normalizedCurrent) ||
                     normalizedCurrent.includes(normalizedRecognized)
    
    if (isCorrect) {
      // 读对了，显示成功效果
      this.showSuccessEffect()
    } else {
      // 读错了，提示重试
      wx.showToast({
        title: '读音不正确，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 显示成功效果
  showSuccessEffect() {
    this.setData({ showSuccess: true })
    
    // 2秒后自动隐藏成功效果并生成新的拼音
    const timer = setTimeout(() => {
      this.setData({ showSuccess: false })
      this.generateRandomPinyin()
    }, 2000)
    
    this.setData({ successAnimation: timer })
    
    // 播放成功提示音（可选）
    wx.showToast({
      title: '读对了！真棒！',
      icon: 'success',
      duration: 2000
    })
  },

  // 点击重新抽取
  onRegenerate() {
    this.generateRandomPinyin()
  },

  // 点击录音按钮
  onRecordTap() {
    if (this.data.isRecording) {
      // 正在录音，点击停止
      this.stopRecording()
    } else {
      // 开始录音
      this.startRecording()
    }
  }
})
