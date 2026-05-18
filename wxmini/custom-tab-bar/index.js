const { getRole, isLogin } = require('../stores/auth')
const { getPagePath } = require('../utils/util')

const TAB_CONFIG = {
  company: [
    { pagePath: '/pages/home/home', text: '银行', icon: 'home-o', activeIcon: 'home', iconImage: '/assets/tabbar/bank.png', activeIconImage: '/assets/tabbar/bank-active.png' },
    { pagePath: '/pages/branch-query/branch-query', text: '网点', icon: 'location-o', activeIcon: 'location' },
    { pagePath: '/pages/message-list/message-list', text: '消息', icon: 'comment-o', activeIcon: 'comment' },
    { pagePath: '/pages/profile/profile', text: '我的', icon: 'user-o', activeIcon: 'user' }
  ],
  bank: [
    { pagePath: '/pages/home-bank/home-bank', text: '工作台', icon: 'desktop-o', activeIcon: 'desktop', iconImage: '/assets/tabbar/workbench.png', activeIconImage: '/assets/tabbar/workbench-active.png' },
    { pagePath: '/pages/company-list/company-list', text: '企业', icon: 'shop-o', activeIcon: 'shop', iconImage: '/assets/tabbar/enterprise.png', activeIconImage: '/assets/tabbar/enterprise-active.png' },
    { pagePath: '/pages/message-list/message-list', text: '消息', icon: 'comment-o', activeIcon: 'comment' },
    { pagePath: '/pages/profile/profile', text: '我的', icon: 'user-o', activeIcon: 'user' }
  ],
  salesperson: [
    { pagePath: '/pages/home-bank/home-bank', text: '工作台', icon: 'desktop-o', activeIcon: 'desktop', iconImage: '/assets/tabbar/workbench.png', activeIconImage: '/assets/tabbar/workbench-active.png' },
    { pagePath: '/pages/company-list/company-list', text: '企业', icon: 'shop-o', activeIcon: 'shop', iconImage: '/assets/tabbar/enterprise.png', activeIconImage: '/assets/tabbar/enterprise-active.png' },
    { pagePath: '/pages/profile/profile', text: '我的', icon: 'user-o', activeIcon: 'user' }
  ]
}

Component({
  data: {
    list: [],
    selected: 0
  },

  lifetimes: {
    attached() {
      this.updateTabList()
    }
  },

  pageLifetimes: {
    show() {
      this.updateTabList()
      // 延迟执行，避免 switchTab 动画期间 getCurrentPages() 仍返回旧页面导致 selected 被重置
      clearTimeout(this._selectTimer)
      this._selectTimer = setTimeout(() => {
        this.updateSelected()
      }, 100)
    }
  },

  methods: {
    updateTabList() {
      const role = getRole() || 'company'
      const list = TAB_CONFIG[role] || TAB_CONFIG.company
      this.setData({ list: list })
    },

    updateTabListAndSelect() {
      const role = getRole() || 'company'
      const list = TAB_CONFIG[role] || TAB_CONFIG.company
      this.setData({ list: list }, () => {
        this.updateSelected()
      })
    },

    updateSelected() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (!currentPage) return
      const route = '/' + currentPage.route
      let index = -1
      for (let i = 0; i < this.data.list.length; i++) {
        if (this.data.list[i].pagePath === route) {
          index = i
          break
        }
      }
      // 只有索引变化时才 setData，避免覆盖 switchTab 已设置的正确值
      if (index !== -1 && this.data.selected !== index) {
        this.setData({ selected: index })
      }
    },

    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const path = e.currentTarget.dataset.path
      this.setData({ selected: index })
      wx.switchTab({
        url: path,
        complete: () => {
          this.updateSelected()
        }
      })
    }
  }
})
