const { getUserInfo, getRole, getUserId } = require('../../stores/auth')
const { createNocoBaseAPI } = require('../../api/nocobase')
const { PAGE_SIZE } = require('../../constants/index')
const { formatDate } = require('../../utils/util')

const companyAPI = createNocoBaseAPI('company_info')
const userAPI = createNocoBaseAPI('users')
const myCustAPI = createNocoBaseAPI('my_cust_list')

const CUST_TYPE_TABS = [
  { value: '1', label: '意向客户', icon: 'smile-o' },
  { value: '2', label: '满足要求', icon: 'passed' },
  { value: '9', label: '不满足要求', icon: 'close' }
]
const CUST_TYPE_MAP = { '1': '意向客户', '2': '满足要求', '9': '不满足要求' }
const CUST_LEVEL_MAP = { '1': '普通客户', '2': '大客户' }
const CUST_LEVEL_OPTIONS = [
  { value: '1', label: '普通客户' },
  { value: '2', label: '大客户' }
]

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
    myCustList: [],
    custTypeTabs: CUST_TYPE_TABS,
    custLevelOptions: CUST_LEVEL_OPTIONS,
    activeCustType: '1'
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    var userInfo = getUserInfo()
    var role = getRole()
    this.setData({ userInfo: userInfo, role: role })
    if (wx.getStorageSync('refreshMyCust')) {
      wx.removeStorageSync('refreshMyCust')
      this.loadMyCustList()
    }
  },

  onPullDownRefresh() {
    var that = this
    this.loadData().then(function() {}, function() {}).then(function() {
      wx.stopPullDownRefresh()
    })
  },

  loadData() {
    this.setData({ loading: true })
    var that = this
    return Promise.all([
      this.loadStats(),
      this.loadRecentList(),
      this.loadMyCustList()
    ]).then(function() {
      that.setData({ loading: false })
    }).catch(function() {
      that.setData({ loading: false })
    })
  },

  loadStats() {
    var that = this
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
    ]).then(function(results) {
      var totalRes = results[0]
      var monthRes = results[1]
      var total = (totalRes.meta && totalRes.meta.count) || 0
      var monthNew = (monthRes.meta && monthRes.meta.count) || 0
      that.setData({ 'stats.total': total, 'stats.monthNew': monthNew })
    })
  },

  loadRecentList() {
    var that = this
    return companyAPI.list({
      page: 1,
      pageSize: 5,
      sort: '-createdAt',
      filter: { audit_status: { $eq: 'approved' } }
    }, true).then(function(res) {
      var items = (res.data || []).map(function(item) {
        var newItem = {}
        for (var k in item) { newItem[k] = item[k] }
        newItem._createdAtFormatted = formatDate(item.createdAt)
        return newItem
      })
      that.setData({ recentList: items })
    })
  },

  loadMyCustList() {
    var myId = getUserId()
    if (!myId) return Promise.resolve()
    var that = this
    var activeCustType = this.data.activeCustType
    var filter = {
      $and: [
        { user_id: { $eq: myId } },
        { cust_type: { $eq: activeCustType } }
      ]
    }
    return myCustAPI.list({
      page: 1,
      pageSize: 5,
      filter: filter,
      sort: '-createdAt',
      appends: 'to_company_info'
    }, true).then(function(res) {
      var items = (res.data || []).map(function(item) {
        var companyInfo = item.to_company_info || item.company_info || item.companyInfo || {}
        return {
          id: item.id,
          companyId: item.company_id,
          companyName: companyInfo.company_name || '未命名客户',
          contactName: companyInfo.contact_name || '-',
          contactPhone: companyInfo.contact_phone || '-',
          custType: item.cust_type,
          custLevel: item.cust_level,
          remark: item.remark || '',
          createdAt: formatDate(item.createdAt)
        }
      })
      that.setData({ myCustList: items })
    })
  },

  onCustTypeTabChange(e) {
    var value = e.currentTarget.dataset.value
    this.setData({ activeCustType: value })
    this.loadMyCustList()
  },

  onRemarkTap(e) {
    var id = e.currentTarget.dataset.id
    var companyName = e.currentTarget.dataset.companyName || ''
    var custType = e.currentTarget.dataset.custType || '1'
    var custLevel = e.currentTarget.dataset.custLevel || '1'
    var remark = e.currentTarget.dataset.remark || ''
    wx.navigateTo({
      url: '/pages/cust-remark/cust-remark?id=' + id
        + '&companyName=' + encodeURIComponent(companyName)
        + '&custType=' + custType
        + '&custLevel=' + custLevel
        + '&remark=' + encodeURIComponent(remark)
    })
  },

  onFeatureTap(e) {
    var path = e.currentTarget.dataset.path
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
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/company-detail/company-detail?id=' + id })
  },

  onMyCustTap(e) {
    var companyId = e.currentTarget.dataset.companyId
    if (companyId) {
      wx.navigateTo({ url: '/pages/company-detail/company-detail?id=' + companyId })
    }
  }
})
