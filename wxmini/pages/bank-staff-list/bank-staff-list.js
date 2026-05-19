const { createNocoBaseAPI } = require('../../api/nocobase')
const { PAGE_SIZE } = require('../../constants/index')
const { debounce, showLoading, hideLoading, checkAuditInterceptor } = require('../../utils/util')

const userAPI = createNocoBaseAPI('users')

Page({
  data: {
    loading: true,
    keyword: '',
    filterTags: ['全部', '对公', '税贷', '科技贷', '抵押贷', '流水贷'],
    activeTag: '全部',
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
    const { page, keyword, activeTag } = this.data
    this.setData({ loading: page === 1 })

    const filter = {
      $and: [
        { user_type: 'bank' },
        { phone: { $nEmpty: true } },
        { audit_status: { $eq: 'approved' } }
      ]
    }

    if (keyword) {
      filter.$and.push({
        $or: [
          { nickname: { $like: '%' + keyword + '%' } },
          { username: { $like: '%' + keyword + '%' } }
        ]
      })
    }

    if (activeTag && activeTag !== '全部') {
      filter.$and.push({
        business_scope: { $like: '%' + activeTag + '%' }
      })
    }

    return userAPI.list({
      page,
      pageSize: PAGE_SIZE,
      filter,
      sort: '-createdAt',
      appends: ['to_dim_bank_info']
    }, true).then((res) => {
      const users = res.data || []
      users.forEach(function (u) {
        const bankInfo = u.to_dim_bank_info || {}
        u.bank_name = bankInfo.bank_name || u.bank_name || ''
      })
      const meta = res.meta || {}
      const totalPage = Math.ceil((meta.count || 0) / PAGE_SIZE)
      const list = page === 1 ? users : this.data.list.concat(users)
      this.setData({
        list,
        loading: false,
        hasMore: page < totalPage,
        loadStatus: page >= totalPage ? 'noMore' : 'done'
      })
    }).catch(() => {
      this.setData({ loading: false, loadStatus: 'done' })
    })
  },

  onSearchInput: debounce(function(e) {
    this.setData({ keyword: e.detail.value, page: 1, list: [] })
    this.loadList()
  }, 500),

  onTagTap(e) {
    const { tag } = e.currentTarget.dataset
    this.setData({ activeTag: tag, page: 1, list: [] })
    this.loadList()
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/bank-staff-detail/bank-staff-detail?id=${id}` })
  },

  onCallPhone(e) {
    const phone = e.currentTarget.dataset.phone
    if (!phone) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  onChat(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    wx.navigateTo({
      url: `/pages/chat/chat?toUserId=${id}&toUserName=${encodeURIComponent(name || '')}`
    })
  }
})