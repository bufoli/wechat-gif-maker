// frame-select.js
Page({
  data: {
    category: '',
    categoryName: '',
    frames: []
  },

  onLoad(options) {
    const category = options.category || 'gongxifacai'
    this.setData({ category })
    
    // 设置标题
    const categoryNames = {
      gongxifacai: '恭喜发财',
      jixiangruyi: '吉祥如意',
      tongyongzhufu: '通用祝福'
    }
    this.setData({ categoryName: categoryNames[category] })
    wx.setNavigationBarTitle({
      title: categoryNames[category]
    })

    // 加载该分类下的边框
    this.loadFrames(category)
  },

  // 加载边框列表
  loadFrames(category) {
    // 这里应该从服务器或本地加载边框数据
    // 暂时使用示例数据，实际使用时需要替换为真实的边框图片路径
    const frameData = {
      gongxifacai: [
        { 
          id: 1, 
          name: '边框1', 
          preview: '/images/frames/gongxifacai/frame1.png',
          frame: '/images/frames/gongxifacai/frame1.png'  // 实际边框图片路径
        },
        { 
          id: 2, 
          name: '边框2', 
          preview: '/images/frames/gongxifacai/frame2.png',
          frame: '/images/frames/gongxifacai/frame2.png'
        },
        { 
          id: 3, 
          name: '边框3', 
          preview: '/images/frames/gongxifacai/frame3.png',
          frame: '/images/frames/gongxifacai/frame3.png'
        }
      ],
      jixiangruyi: [
        { 
          id: 1, 
          name: '边框1', 
          preview: '/images/frames/jixiangruyi/frame1.png',
          frame: '/images/frames/jixiangruyi/frame1.png'
        },
        { 
          id: 2, 
          name: '边框2', 
          preview: '/images/frames/jixiangruyi/frame2.png',
          frame: '/images/frames/jixiangruyi/frame2.png'
        },
        { 
          id: 3, 
          name: '边框3', 
          preview: '/images/frames/jixiangruyi/frame3.png',
          frame: '/images/frames/jixiangruyi/frame3.png'
        }
      ],
      tongyongzhufu: [
        { 
          id: 1, 
          name: '边框1', 
          preview: '/images/frames/tongyongzhufu/frame1.png',
          frame: '/images/frames/tongyongzhufu/frame1.png'
        },
        { 
          id: 2, 
          name: '边框2', 
          preview: '/images/frames/tongyongzhufu/frame2.png',
          frame: '/images/frames/tongyongzhufu/frame2.png'
        },
        { 
          id: 3, 
          name: '边框3', 
          preview: '/images/frames/tongyongzhufu/frame3.png',
          frame: '/images/frames/tongyongzhufu/frame3.png'
        }
      ]
    }

    // 获取该分类的边框列表
    const frames = frameData[category] || []
    
    // 如果没有边框，显示提示
    if (frames.length === 0) {
      wx.showToast({
        title: '该分类暂无边框',
        icon: 'none'
      })
    }

    this.setData({ frames })
  },

  // 选择边框
  selectFrame(e) {
    const frame = e.currentTarget.dataset.frame
    console.log('选择边框:', frame)
    
    // 跳转到图片编辑页面
    wx.navigateTo({
      url: `/pages/image-edit/image-edit?category=${this.data.category}&frameId=${frame.id}&frameName=${encodeURIComponent(frame.name)}&framePreview=${encodeURIComponent(frame.preview)}`
    })
  }
})
