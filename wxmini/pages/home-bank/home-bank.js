const { getUserInfo, getRole, getUserId } = require('../../stores/auth')
const { createNocoBaseAPI } = require('../../api/nocobase')
const { PAGE_SIZE } = require('../../constants/index')
const { formatDate } = require('../../utils/util')

const companyAPI = createNocoBaseAPI('company_info')
const userAPI = createNocoBaseAPI('users')
const myCustAPI = createNocoBaseAPI('my_cust_list')

Page({
  data: {
    loading: true,
    userInfo: null,
    role: '',
    stats: {
      total: 0,
      monthNew: 0
    },
    recentList: [],
    myCustList: []
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    const userInfo = getUserInfo()
    const role = getRole()
    this.setData({ userInfo, role })
  },

  onPullDownRefresh() {
    this.loadData().then(() => {}, () => {}).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadData() {
    this.setData({ loading: true })
    return Promise.all([
      this.loadStats(),
      this.loadRecentList(),
      this.loadMyCustList()
    ]).then(() => {
      this.setData({ loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  loadStats() {
    return Promise.all([
      companyAPI.list({
        pageSize: 1,
        filter: { audit_status: { $eq: 'approved' } }
      }, true),
      companyAPI.list({
        pageSize: 1,
        filter: {
          $and: [
            { audit_status: { $eq: 'approved' } },
            { createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() } }
          ]
        }
      }, true)
    ]).then(([totalRes, monthRes]) => {
      const total = (totalRes.meta && totalRes.meta.count) || 0
      const monthNew = (monthRes.meta && monthRes.meta.count) || 0
      this.setData({ 'stats.total': total, 'stats.monthNew': monthNew })
    })
  },

  loadRecentList() {
    return companyAPI.list({
      page: 1,
      pageSize: 5,
      sort: '-createdAt',
      filter: { audit_status: { $eq: 'approved' } }
    }, true).then((res) => {
      const items = (res.data || []).map(item => {
        const newItem = {}
        for (const k in item) { newItem[k] = item[k] }
        newItem._createdAtFormatted = formatDate(item.createdAt)
        return newItem
      })
      this.setData({ recentList: items })
    })
  },

  loadMyCustList() {
    const myId = getUserId()
    if (!myId) return Promise.resolve()
    return myCustAPI.list({
      page: 1,
      pageSize: 5,
      filter: { user_id: { $eq: myId } },
      sort: '-createdAt',
      appends: 'to_company_info'
    }, true).then((res) => {
      const items = (res.data || []).map(item => {
        var companyInfo = item.to_company_info || item.company_info || item.companyInfo || {}
        return {
          id: item.id,
          companyId: item.company_id,
          companyName: companyInfo.company_name || '未命名客户',
          contactName: companyInfo.contact_name || '-',
          contactPhone: companyInfo.contact_phone || '-',
          custType: item.cust_type,
          custLevel: item.cust_level,
          createdAt: formatDate(item.createdAt)
        }
      })
      this.setData({ myCustList: items })
    })
  },

  onFeatureTap(e) {
    const { path } = e.currentTarget.dataset
    if (!path) {
      wx.showToast({ title: '功能开发中', icon: 'none' })
      return
    }
    if (path === '/pages/profile/profile') {
      wx.switchTab({ url: path })
    } else {
      wx.navigateTo({ url: path })
    }
  },

  onCompanyTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/company-detail/company-detail?id=${id}` })
  },

  onMyCustTap(e) {
    const { companyId } = e.currentTarget.dataset
    if (companyId) {
      wx.navigateTo({ url: `/pages/company-detail/company-detail?id=${companyId}` })
    }
  }
})