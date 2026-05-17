const { createNocoBaseAPI } = require('../../api/nocobase')
const { getUserInfo } = require('../../stores/auth')
const { PAGE_SIZE } = require('../../constants/index')

const userAPI = createNocoBaseAPI('users')
const configAPI = createNocoBaseAPI('dim_data_config')

Page({
  data: {
    loading: true,
    banners: [],
    features: [
      { name: '联系银行人员', icon: '👔', path: '/pages/bank-staff-list/bank-staff-list' },
      { name: '查询网点', icon: '🏦', path: '/pages/branch-query/branch-query' }
    ],
    staffList: [],
    currentBanner: 0
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    const userInfo = getUserInfo()
    this.setData({ userInfo })
  },

  onPullDownRefresh() {
    this.loadData().then(() => {}, () => {}).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadData() {
    this.setData({ loading: true })
    return Promise.all([
      this.loadBanners(),
      this.loadStaffList()
    ]).then(() => {
      this.setData({ loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  loadBanners() {
    return configAPI.list({
      filter: { data_type: { $eq: 'image' } },
      pageSize: 5,
      sort: '-createdAt'
    }, true).then((res) => {
      const banners = (res.data || []).map(item => item.data_url).filter(Boolean)
      this.setData({ banners })
    })
  },

  loadStaffList() {
    return userAPI.list({
      page: 1,
      pageSize: 6,
      filter: {
        $and: [
          { user_type: 'bank' },
          { audit_status: { $eq: 'approved' } }
        ]
      },
      sort: '-createdAt',
      appends: ['to_dim_bank_info']
    }, true).then((res) => {
      const users = res.data || []
      const list = users.map(function (u) {
        const item = {}
        for (const k in u) { item[k] = u[k] }
        const bankInfo = u.to_dim_bank_info || {}
        item.bank_name = bankInfo.bank_name || u.bank_name || ''
        return item
      })
      this.setData({ staffList: list })
    })
  },

  onBannerChange(e) {
    this.setData({ currentBanner: e.detail.current })
  },

  onFeatureTap(e) {
    const { path } = e.currentTarget.dataset
    if (!path) {
      wx.showToast({ title: '功能开发中', icon: 'none' })
      return
    }
    wx.navigateTo({ url: path })
  },

  onStaffTap(e) {
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