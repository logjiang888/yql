const { createNocoBaseAPI, BASE_URL } = require('../../api/nocobase')
const { getUserInfo } = require('../../stores/auth')
const { checkAuditInterceptor } = require('../../utils/util')

const userAPI = createNocoBaseAPI('users')

const SCOPE_TAGS = [
  { name: '对公', checked: false },
  { name: '税贷', checked: false },
  { name: '科技贷', checked: false },
  { name: '抵押贷', checked: false },
  { name: '流水贷', checked: false },
  { name: '贷抵贷', checked: false },
  { name: '房抵贷', checked: false },
  { name: '设备贷', checked: false }
]

Page({
  data: {
    loading: true,
    appName: '银企来',
    staffList: [],
    page: 1,
    pageSize: 100,
    hasMore: true,
    loadingMore: false,
    scopeFilterTags: JSON.parse(JSON.stringify(SCOPE_TAGS)),
    selectedScope: '',
    searchKeyword: ''
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    if (!checkAuditInterceptor()) return
    var userInfo = getUserInfo()
    var app = getApp()
    var appName = (app && app.globalData && app.globalData.appName) || wx.getStorageSync('appName') || '银企来'
    this.setData({ userInfo: userInfo, appName: appName })
    var tabBar = this.getTabBar()
    if (tabBar && typeof tabBar.updateSelected === 'function') {
      tabBar.updateSelected()
    }
  },

  onPullDownRefresh() {
    var that = this
    this.loadData().then(function() {}, function() {}).then(function() {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore && !this.data.loading) {
      this.loadStaffList()
    }
  },

  loadData() {
    this.setData({ loading: true })
    var that = this
    return this.loadStaffList(true).then(function() {
      that.setData({ loading: false })
    }).catch(function() {
      that.setData({ loading: false })
    })
  },

  loadStaffList(reset) {
    var page = reset ? 1 : this.data.page
    if (reset) {
      this.setData({ staffList: [], hasMore: true, page: 1, loadingMore: false })
      page = 1
    }
    if (this.data.loadingMore) return Promise.resolve()
    this.setData({ loadingMore: true })

    var filter = {
      $and: [
        { user_type: 'bank' },
        { audit_status: { $eq: 'approved' } }
      ]
    }
    var selectedScope = this.data.selectedScope || ''
    if (selectedScope) {
      filter.$and.push({ business_scope: { $includes: selectedScope } })
    }

    var that = this
    return userAPI.list({
      page: page,
      pageSize: this.data.pageSize,
      filter: filter,
      sort: '-createdAt',
      appends: ['to_dim_bank_info']
    }, true).then(function(res) {
      var users = res.data || []
      var list = users.map(function(u) {
        var item = {}
        for (var k in u) { item[k] = u[k] }
        var bankInfo = u.to_dim_bank_info || {}
        item.bank_name = bankInfo.bank_name || u.bank_name || ''
        return item
      })
      var keyword = that.data.searchKeyword || ''
      if (keyword) {
        list = list.filter(function(item) {
          var bankName = item.bank_name || ''
          return bankName.indexOf(keyword) >= 0
        })
      }
      var staffList = reset ? list : that.data.staffList.concat(list)
      var hasMore = users.length === that.data.pageSize
      that.setData({
        staffList: staffList,
        page: page + 1,
        hasMore: hasMore,
        loadingMore: false,
        loading: false
      })
    }).catch(function() {
      that.setData({ loadingMore: false, loading: false })
    })
  },

  onScopeFilterTap(e) {
    var name = e.currentTarget.dataset.name
    var scopeFilterTags = this.data.scopeFilterTags.map(function(tag) {
      var newTag = {}
      for (var k in tag) { newTag[k] = tag[k] }
      if (tag.name === name) {
        newTag.checked = !tag.checked
      } else {
        newTag.checked = false
      }
      return newTag
    })
    var selectedTag = null
    for (var i = 0; i < scopeFilterTags.length; i++) {
      if (scopeFilterTags[i].checked) {
        selectedTag = scopeFilterTags[i]
        break
      }
    }
    var selectedScope = selectedTag ? selectedTag.name : ''
    this.setData({ scopeFilterTags: scopeFilterTags, selectedScope: selectedScope })
    this.loadStaffList(true)
  },

  onSearch(e) {
    var keyword = (e.detail || '').trim()
    this.setData({ searchKeyword: keyword })
    this.loadStaffList(true)
  },

  onSearchClear() {
    this.setData({ searchKeyword: '' })
    this.loadStaffList(true)
  },

  onStaffTap(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/bank-staff-detail/bank-staff-detail?id=' + id })
  },

  onCallPhone(e) {
    var phone = e.currentTarget.dataset.phone
    if (!phone) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  onChat(e) {
    var id = e.currentTarget.dataset.id
    var name = e.currentTarget.dataset.name
    wx.navigateTo({
      url: '/pages/chat/chat?toUserId=' + id + '&toUserName=' + encodeURIComponent(name || '')
    })
  }
})
