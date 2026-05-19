const { createNocoBaseAPI } = require('../../api/nocobase')
const { PAGE_SIZE } = require('../../constants/index')
const { debounce, checkAuditInterceptor } = require('../../utils/util')

const bankAPI = createNocoBaseAPI('dim_bank_info')

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

    const filter = {}
    if (keyword) {
      filter.$or = [
        { bank_name: { $like: `%${keyword}%` } },
        { bank_code: { $like: `%${keyword}%` } }
      ]
    }

    var params = {
      page: page,
      pageSize: PAGE_SIZE,
      sort: '-createdAt'
    }
    if (Object.keys(filter).length > 0) {
      params.filter = filter
    }
    return bankAPI.list(params, true).then((res) => {
      const items = res.data || []
      const meta = res.meta || {}
      const totalPage = Math.ceil((meta.count || 0) / PAGE_SIZE)
      const list = page === 1 ? items : this.data.list.concat(items)
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

  onItemTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/branch-detail/branch-detail?id=${id}` })
  },

  onNavigate(e) {
    const { lat, lng, name } = e.currentTarget.dataset
    if (!lat || !lng) {
      wx.showToast({ title: '暂无位置信息', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      name,
      scale: 14
    })
  }
})