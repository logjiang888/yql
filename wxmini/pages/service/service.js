const { getUserId } = require('../../stores/auth')
const { createNocoBaseAPI, BASE_URL } = require('../../api/nocobase')
const { PAGE_SIZE } = require('../../constants/index')
const { showToast } = require('../../utils/util')

const userAPI = createNocoBaseAPI('users')

Page({
  data: {
    loading: true,
    list: [],
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadList()
  },

  onShow() {
    // TabBar 页面 switchTab 不会重复触发 onLoad，需要在 onShow 中刷新
    this.setData({ page: 1 })
    this.loadList()
    var tabBar = this.getTabBar()
    if (tabBar && typeof tabBar.updateSelected === 'function') {
      tabBar.updateSelected()
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, list: [], hasMore: true })
    this.loadList().then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadList()
  },

  loadList() {
    const that = this
    const { page } = this.data
    this.setData({ loading: true })

    const params = {
      page: page,
      pageSize: PAGE_SIZE,
      sort: '-createdAt',
      filter: {
        $and: [
          { user_type: { $eq: 'plat_salesperson' } },
          { audit_status: { $eq: 'approved' } }
        ]
      }
    }

    console.log('[service] 请求参数:', JSON.stringify(params))
    return userAPI.list(params, true).then(function(res) {
      console.log('[service] 响应数据条数:', (res.data || []).length)
      const items = (res.data || []).map(function(item) {
        const newItem = {}
        for (const k in item) { newItem[k] = item[k] }
        // 头像 URL 补全
        if (newItem.head_image && newItem.head_image.indexOf('http') !== 0 && newItem.head_image.indexOf('/storage/') === 0) {
          newItem.head_image = BASE_URL.replace('/api', '') + newItem.head_image
        }
        // 头像文字回退
        const name = newItem.nickname || newItem.real_name || newItem.username || '用'
        newItem._avatarText = name.charAt(0)
        return newItem
      })
      const meta = res.meta || {}
      const totalPage = Math.ceil((meta.count || 0) / PAGE_SIZE)
      const list = page === 1 ? items : that.data.list.concat(items)
      that.setData({
        list: list,
        loading: false,
        hasMore: page < totalPage
      })
    }).catch(function(err) {
      console.error('[service] 请求失败:', err)
      that.setData({ loading: false })
      showToast(err.message || '加载失败')
    })
  },

  onPhoneTap(e) {
    const phone = e.currentTarget.dataset.phone
    if (!phone) {
      showToast('暂无电话')
      return
    }
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: function() {
        showToast('拨打电话失败')
      }
    })
  },

  onDeepServiceTap(e) {
    const userId = e.currentTarget.dataset.userId
    const name = e.currentTarget.dataset.name
    const myId = getUserId()
    if (!myId) {
      showToast('请先登录')
      return
    }
    wx.navigateTo({
      url: '/pages/chat/chat?toUserId=' + userId + '&toUserName=' + encodeURIComponent(name || '')
    })
  }
})
