const { createNocoBaseAPI } = require('../../api/nocobase')
const { PAGE_SIZE } = require('../../constants/index')
const { debounce } = require('../../utils/util')

const bankAPI = createNocoBaseAPI('dim_bank_info')

Page({
  data: {
    mode: 'list',
    loading: true,
    keyword: '',
    list: [],
    markers: [],
    page: 1,
    hasMore: true,
    loadStatus: 'loading'
  },

  onLoad() {
    this.loadList()
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

    return bankAPI.list({
      page,
      pageSize: PAGE_SIZE,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sort: '-createdAt'
    }).then((res) => {
      const items = res.data || []
      const meta = res.meta || {}
      const totalPage = Math.ceil((meta.count || 0) / PAGE_SIZE)
      const list = page === 1 ? items : this.data.list.concat(items)
      this.setData({
        list,
        markers: this.buildMarkers(list),
        loading: false,
        hasMore: page < totalPage,
        loadStatus: page >= totalPage ? 'noMore' : 'done'
      })
    }).catch(() => {
      this.setData({ loading: false, loadStatus: 'done' })
    })
  },

  buildMarkers(list) {
    return list.map(function(item) {
      return {
        id: item.id,
        latitude: item.latitude || 39.9,
        longitude: item.longitude || 116.4,
        title: item.bank_name,
        iconPath: '',
        width: 30,
        height: 30
      }
    })
  },

  onSwitchMode(e) {
    const mode = e.detail.name || e.currentTarget.dataset.mode
    this.setData({ mode })
    if (mode === 'map') {
      this.setData({ markers: this.buildMarkers(this.data.list) })
      this.loadMapMarkers()
    }
  },

  onSearchInput: debounce(function(e) {
    this.setData({ keyword: e.detail.value, page: 1, list: [] })
    this.loadList()
  }, 500),

  loadMapMarkers() {
    // 地图模式加载周边网点，需要获取当前位置
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude
        })
      },
      fail: () => {
        wx.showToast({ title: '请授权位置权限', icon: 'none' })
      }
    })
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/branch-detail/branch-detail?id=${id}` })
  },

  onMarkerTap(e) {
    const { markerId } = e.detail
    let branch = null
    for (let i = 0; i < this.data.list.length; i++) {
      if (this.data.list[i].id === markerId) {
        branch = this.data.list[i]
        break
      }
    }
    if (branch) {
      this.setData({ selectedBranch: branch, showBranchPopup: true })
    }
  },

  onClosePopup() {
    this.setData({ showBranchPopup: false })
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