const { getUserId } = require('../../stores/auth')
const { createNocoBaseAPI } = require('../../api/nocobase')
const { PAGE_SIZE } = require('../../constants/index')
const { checkAuditInterceptor } = require('../../utils/util')
const { debounce, formatDate, maskCreditCode } = require('../../utils/util')

const companyAPI = createNocoBaseAPI('company_info')
const myCustAPI = createNocoBaseAPI('my_cust_list')

Page({
  data: {
    loading: true,
    keyword: '',
    list: [],
    page: 1,
    hasMore: true,
    loadStatus: 'loading'
  },

  onLoad() {
    this.loadList()
  },

  onShow() {
    if (!checkAuditInterceptor()) return
    var tabBar = this.getTabBar()
    if (tabBar && typeof tabBar.updateSelected === 'function') {
      tabBar.updateSelected()
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, list: [], hasMore: true })
    this.loadList().then(() => {}, () => {}).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ page: this.data.page + 1, loadStatus: 'loading' })
    this.loadList()
  },

  loadList() {
    const { page, keyword } = this.data
    this.setData({ loading: page === 1 })

    const params = {
      page,
      pageSize: PAGE_SIZE,
      sort: '-createdAt',
      filter: { audit_status: { $eq: 'approved' } }
    }
    if (keyword) {
      params.filter = {
        $and: [
          { audit_status: { $eq: 'approved' } },
          { company_name: { $includes: keyword } }
        ]
      }
    }

    console.log('[company-list] 请求参数:', JSON.stringify(params))
    return companyAPI.list(params, true).then((res) => {
      console.log('[company-list] 响应数据条数:', (res.data || []).length)
      const items = (res.data || []).map(item => {
        const newItem = {}
        for (const k in item) { newItem[k] = item[k] }
        newItem._creditCodeMasked = maskCreditCode(item.credit_code)
        newItem._createdAtFormatted = formatDate(item.createdAt)
        return newItem
      })
      const meta = res.meta || {}
      const totalPage = Math.ceil((meta.count || 0) / PAGE_SIZE)
      const list = page === 1 ? items : this.data.list.concat(items)
      this.setData({
        list,
        loading: false,
        hasMore: page < totalPage,
        loadStatus: page >= totalPage ? 'noMore' : 'done'
      })
    }).catch((err) => {
      console.error('[company-list] 请求失败:', err)
      this.setData({ loading: false, loadStatus: 'done' })
    })
  },

  onSearchInput: debounce(function(e) {
    const keyword = (typeof e.detail === 'string') ? e.detail : (e.detail.value || '')
    console.log('[company-list] 搜索关键词:', keyword)
    this.setData({ keyword: keyword, page: 1, list: [] })
    this.loadList()
  }, 500),

  onItemTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/company-detail/company-detail?id=${id}` })
  },

  onChatTap(e) {
    const { userId, name } = e.currentTarget.dataset
    if (!userId) {
      wx.showToast({ title: '该客户未绑定用户', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/chat/chat?toUserId=${userId}&toUserName=${encodeURIComponent(name || '')}`
    })
  },

  onAddIntentionTap(e) {
    const { id, name } = e.currentTarget.dataset
    const myId = getUserId()
    if (!myId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.showLoading({ title: '处理中', mask: true })
    // 先查重
    myCustAPI.list({
      pageSize: 1,
      filter: {
        $and: [
          { user_id: { $eq: myId } },
          { company_id: { $eq: id } }
        ]
      }
    }, true).then((res) => {
      const items = res.data || []
      if (items.length > 0) {
        wx.hideLoading()
        wx.showToast({ title: '该客户已是意向客户', icon: 'none' })
        return
      }
      myCustAPI.create({
        user_id: myId,
        company_id: id
      }, true).then(() => {
        wx.hideLoading()
        wx.showToast({ title: '已添加意向客户', icon: 'success' })
        wx.setStorageSync('refreshMyCust', true)
      }).catch((err) => {
        wx.hideLoading()
        wx.showToast({ title: err.message || '添加失败', icon: 'none' })
      })
    }).catch((err) => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '查询失败', icon: 'none' })
    })
  }
})