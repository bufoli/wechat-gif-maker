// book-list.js
Page({
  data: {
    section: '',
    sectionName: '',
    books: []
  },

  onLoad(options) {
    const section = options.section || 'public'
    this.setData({ section })
    
    // 设置标题
    const sectionNames = {
      public: '公共版权免费绘本',
      original: '朵吉原创绘本'
    }
    this.setData({ sectionName: sectionNames[section] || '绘本列表' })
    wx.setNavigationBarTitle({
      title: sectionNames[section] || '绘本列表'
    })

    // 加载绘本列表
    this.loadBooks(section)
  },

  // 加载绘本列表
  loadBooks(section) {
    // 这里应该从服务器或本地加载绘本数据
    // 暂时使用示例数据
    const bookData = {
      public: [
        {
          id: 1,
          title: '小红帽',
          author: '格林童话',
          cover: '/images/books/public/hongmaozi.jpg',
          tags: ['经典', '童话'],
          pages: []
        },
        {
          id: 2,
          title: '三只小猪',
          author: '经典童话',
          cover: '/images/books/public/sanzhixiaozhu.jpg',
          tags: ['经典', '童话'],
          pages: []
        },
        {
          id: 3,
          title: '白雪公主',
          author: '格林童话',
          cover: '/images/books/public/baixuegongzhu.jpg',
          tags: ['经典', '童话'],
          pages: []
        }
      ],
      original: [
        {
          id: 1,
          title: '小朵的冒险',
          author: '朵吉原创',
          cover: '/images/books/original/xiaoduo.jpg',
          tags: ['原创', '冒险'],
          pages: []
        },
        {
          id: 2,
          title: '森林里的秘密',
          author: '朵吉原创',
          cover: '/images/books/original/senlin.jpg',
          tags: ['原创', '自然'],
          pages: []
        }
      ]
    }

    const books = bookData[section] || []
    this.setData({ books })
  },

  // 选择绘本
  selectBook(e) {
    const book = e.currentTarget.dataset.book
    console.log('选择绘本:', book)
    
    // 跳转到阅读页面
    wx.navigateTo({
      url: `/pages/book-reader/book-reader?bookId=${book.id}&section=${this.data.section}&title=${encodeURIComponent(book.title)}`
    })
  }
})
