const { createNocoBaseAPI, BASE_URL } = require('../../api/nocobase')
const { PAGE_SIZE } = require('../../constants/index')
const { showToast } = require('../../utils/util')

const userAPI = createNocoBaseAPI('users')

const AUDIT_STATUS_MAP = {
  unreviewed: { text: '未审核', color: '#9CA3AF' },
  under_review: { text: '审核中', color: '#D97706' },
  approved: { text: '已审核', color: '#059669' },
  rejected: { text: '已驳回', color: '#DC2626' },
  disabled: { text: '禁用', color: '#DC2626' }
}

const STATUS_TABS = [
  { label: '未审核', value: 'unreviewed', icon: '🕐' },
  { label: '审核中', value: 'under_review', icon: '⏳' },
  { label: '已审核', value: 'approved', icon: '✅' },
  { label: '已驳回', value: 'rejected', icon: '❌' },
  { label: '禁用', value: 'disabled', icon: '🚫' }
]

Page({
  data: {
    statusTabs: STATUS_TABS,
    bank: {
      activeStatus: 'under_review',
      list: [],
      page: 1,
      hasMore: true,
      loading: false
    },
    company: {
      activeStatus: 'under_review',
      list: [],
      page: 1,
      hasMore: true,
      loading: false
    }
  },

  onLoad() {
    this.loadSection('bank')
    this.loadSection('company')
  },

  onShow() {
    this.setData({
      'bank.page': 1,
      'bank.hasMore': true,
      'company.page': 1,
      'company.hasMore': true
    })
    this.loadSection('bank')
    this.loadSection('company')
    var tabBar = this.getTabBar()
    if (tabBar && typeof tabBar.updateTabListAndSelect === 'function') {
      tabBar.updateTabListAndSelect()
    }
  },

  onPullDownRefresh() {
    this.setData({
      'bank.page': 1,
      'bank.hasMore': true,
      'company.page': 1,
      'company.hasMore': true
    })
    Promise.all([
      this.loadSection('bank'),
      this.loadSection('company')
    ]).then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadSection(sectionKey) {
    const that = this
    const section = this.data[sectionKey]
    if (section.loading) return Promise.resolve()

    this.setData({ [sectionKey + '.loading']: true })

    const userType = sectionKey === 'bank' ? 'bank' : 'company'
    const params = {
      page: section.page,
      pageSize: PAGE_SIZE,
      sort: '-createdAt',
      filter: {
        $and: [
          { user_type: { $eq: userType } },
          { audit_status: { $eq: section.activeStatus } }
        ]
      }
    }

    return userAPI.list(params, true).then(function(res) {
      const items = (res.data || []).map(function(item) {
        const newItem = {}
        for (const k in item) { newItem[k] = item[k] }
        if (newItem.head_image && newItem.head_image.indexOf('http') !== 0 && newItem.head_image.indexOf('/storage/') === 0) {
          newItem.head_image = BASE_URL.replace('/api', '') + newItem.head_image
        }
        const name = newItem.nickname || newItem.real_name || newItem.username || '用'
        newItem._avatarText = name.charAt(0)
        const statusConfig = AUDIT_STATUS_MAP[newItem.audit_status] || { text: newItem.audit_status || '-', color: '#9CA3AF' }
        newItem._auditStatusText = statusConfig.text
        newItem._auditStatusColor = statusConfig.color
        return newItem
      })
      const meta = res.meta || {}
      const totalPage = Math.ceil((meta.count || 0) / PAGE_SIZE)
      const list = section.page === 1 ? items : section.list.concat(items)
      const updateData = {}
      updateData[sectionKey + '.list'] = list
      updateData[sectionKey + '.loading'] = false
      updateData[sectionKey + '.hasMore'] = section.page < totalPage
      that.setData(updateData)
    }).catch(function(err) {
      console.error('[audit] 请求失败:', err)
      const updateData = {}
      updateData[sectionKey + '.loading'] = false
      that.setData(updateData)
      showToast(err.message || '加载失败')
    })
  },

  onStatusTap(e) {
    const sectionKey = e.currentTarget.dataset.section
    const status = e.currentTarget.dataset.status
    const updateData = {}
    updateData[sectionKey + '.activeStatus'] = status
    updateData[sectionKey + '.page'] = 1
    updateData[sectionKey + '.hasMore'] = true
    updateData[sectionKey + '.list'] = []
    this.setData(updateData)
    this.loadSection(sectionKey)
  },

  onLoadMore(e) {
    const sectionKey = e.currentTarget.dataset.section
    const section = this.data[sectionKey]
    if (!section.hasMore || section.loading) return
    this.setData({ [sectionKey + '.page']: section.page + 1 })
    this.loadSection(sectionKey)
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

  onAuditTap(e) {
    const userId = e.currentTarget.dataset.userId
    const role = e.currentTarget.dataset.role
    wx.navigateTo({
      url: '/pages/audit-detail/audit-detail?userId=' + userId + '&role=' + role
    })
  },

  onAuditBtnTap() {
    // 阻止冒泡
  },

  onCardTap(e) {
    const userId = e.currentTarget.dataset.userId
    const role = e.currentTarget.dataset.role
    wx.navigateTo({
      url: '/pages/audit-detail/audit-detail?userId=' + userId + '&role=' + role
    })
  }
})
