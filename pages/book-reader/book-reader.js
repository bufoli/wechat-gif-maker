// book-reader.js
Page({
  data: {
    bookId: '',
    section: '',
    title: '',
    pages: [],
    currentPage: 0,
    totalPages: 0,
    autoPlaying: false,
    autoPlayTimer: null
  },

  onLoad(options) {
    const bookId = options.bookId || ''
    const section = options.section || ''
    const title = decodeURIComponent(options.title || '')

    this.setData({
      bookId,
      section,
      title
    })

    wx.setNavigationBarTitle({
      title: title || '阅读绘本'
    })

    // 加载绘本内容
    this.loadBookContent(bookId, section)
  },

  onUnload() {
    // 清除自动播放定时器
    if (this.data.autoPlayTimer) {
      clearInterval(this.data.autoPlayTimer)
    }
  },

  // 加载绘本内容
  loadBookContent(bookId, section) {
    // 这里应该从服务器或本地加载绘本数据
    // 暂时使用示例数据
    const bookContent = {
      public: {
        1: {
          // 小红帽
          pages: [
            { image: '/images/books/public/hongmaozi/page1.jpg', text: '从前，有一个可爱的小女孩，大家都叫她小红帽。' },
            { image: '/images/books/public/hongmaozi/page2.jpg', text: '一天，妈妈让小红帽给生病的奶奶送一些食物。' },
            { image: '/images/books/public/hongmaozi/page3.jpg', text: '小红帽走在森林里，遇到了大灰狼。' },
            { image: '/images/books/public/hongmaozi/page4.jpg', text: '大灰狼先到了奶奶家，把奶奶藏了起来。' },
            { image: '/images/books/public/hongmaozi/page5.jpg', text: '小红帽到了奶奶家，发现"奶奶"有些奇怪。' },
            { image: '/images/books/public/hongmaozi/page6.jpg', text: '猎人及时赶到，救出了小红帽和奶奶。' }
          ]
        }
      },
      original: {
        1: {
          // 小朵的冒险
          pages: [
            { image: '/images/books/original/xiaoduo/page1.jpg', text: '小朵是一个勇敢的小女孩，她喜欢探索未知的世界。' },
            { image: '/images/books/original/xiaoduo/page2.jpg', text: '一天，小朵发现了一个神秘的魔法门。' },
            { image: '/images/books/original/xiaoduo/page3.jpg', text: '小朵推开门，来到了一个充满神奇生物的世界。' },
            { image: '/images/books/original/xiaoduo/page4.jpg', text: '在这个世界里，小朵遇到了很多新朋友。' },
            { image: '/images/books/original/xiaoduo/page5.jpg', text: '小朵帮助朋友们解决了困难，成为了英雄。' }
          ]
        }
      }
    }

    const book = bookContent[section] && bookContent[section][bookId]
    if (book && book.pages) {
      this.setData({
        pages: book.pages,
        totalPages: book.pages.length
      })
    } else {
      // 如果没有数据，显示提示
      wx.showToast({
        title: '绘本内容加载失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 页面切换
  onPageChange(e) {
    const currentPage = e.detail.current
    this.setData({ currentPage })
  },

  // 上一页
  prevPage() {
    if (this.data.currentPage > 0) {
      this.setData({
        currentPage: this.data.currentPage - 1
      })
    }
  },

  // 下一页
  nextPage() {
    if (this.data.currentPage < this.data.totalPages - 1) {
      this.setData({
        currentPage: this.data.currentPage + 1
      })
    }
  },

  // 切换自动播放
  toggleAutoPlay() {
    if (this.data.autoPlaying) {
      // 停止自动播放
      if (this.data.autoPlayTimer) {
        clearInterval(this.data.autoPlayTimer)
      }
      this.setData({
        autoPlaying: false,
        autoPlayTimer: null
      })
    } else {
      // 开始自动播放
      const timer = setInterval(() => {
        if (this.data.currentPage < this.data.totalPages - 1) {
          this.setData({
            currentPage: this.data.currentPage + 1
          })
        } else {
          // 播放完毕，停止
          clearInterval(timer)
          this.setData({
            autoPlaying: false,
            autoPlayTimer: null
          })
          wx.showToast({
            title: '播放完毕',
            icon: 'success'
          })
        }
      }, 3000) // 每3秒翻一页

      this.setData({
        autoPlaying: true,
        autoPlayTimer: timer
      })
    }
  }
})
