const { createNocoBaseAPI, BASE_URL } = require('../../api/nocobase')
const { PAGE_SIZE } = require('../../constants/index')
const { showToast } = require('../../utils/util')

const userAPI = createNocoBaseAPI('users')

const AUDIT_STATUS_MAP = {
  unreviewed: { text: '未审核', color: '#9CA3AF' },
  under_review: { text: '审核中', color: '#D97706' },
  rejected: { text: '已驳回', color: '#DC2626' },
  disabled: { text: '禁用', color: '#DC2626' }
}

Page({
  data: {
    activeTab: 0,
    tabs: ['银行', '企业'],
    loading: true,
    list: [],
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadList()
  },

  onShow() {
    this.setData({ page: 1 })
    this.loadList()
  },

  onTabChange(e) {
    const index = e.detail.index
    this.setData({ activeTab: index, page: 1, list: [], hasMore: true })
    this.loadList()
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
    const { page, activeTab } = this.data
    this.setData({ loading: true })

    const userType = activeTab === 0 ? 'bank' : 'company'
    const params = {
      page: page,
      pageSize: PAGE_SIZE,
      sort: '-createdAt',
      filter: {
        $and: [
          { user_type: { $eq: userType } },
          { audit_status: { $ne: 'approved' } }
        ]
      }
    }

    console.log('[audit] 请求参数:', JSON.stringify(params))
    return userAPI.list(params, true).then(function(res) {
      console.log('[audit] 响应数据条数:', (res.data || []).length)
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
        // 审核状态
        const statusConfig = AUDIT_STATUS_MAP[newItem.audit_status] || { text: newItem.audit_status || '-', color: '#9CA3AF' }
        newItem._auditStatusText = statusConfig.text
        newItem._auditStatusColor = statusConfig.color
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
      console.error('[audit] 请求失败:', err)
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

  onAuditTap(e) {
    const userId = e.currentTarget.dataset.userId
    const role = e.currentTarget.dataset.role
    wx.navigateTo({
      url: '/pages/audit-detail/audit-detail?userId=' + userId + '&role=' + role
    })
  },

  onAuditBtnTap() {
    // 阻止冒泡，避免同时触发 onCardTap
  },

  onCardTap(e) {
    const userId = e.currentTarget.dataset.userId
    const role = e.currentTarget.dataset.role
    wx.navigateTo({
      url: '/pages/audit-detail/audit-detail?userId=' + userId + '&role=' + role
    })
  }
})
