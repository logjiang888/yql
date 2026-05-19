const { createNocoBaseAPI } = require('../../api/nocobase')
const { showLoading, hideLoading, checkAuditInterceptor } = require('../../utils/util')

const bankAPI = createNocoBaseAPI('dim_bank_info')

Page({
  data: {
    branch: null
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.loadDetail(id)
    }
  },

  onShow() {
    if (!checkAuditInterceptor()) return
  },

  loadDetail(id) {
    showLoading('加载中')
    bankAPI.get(id).then((res) => {
      hideLoading()
      this.setData({ branch: res.data })
    }).catch(() => {
      hideLoading()
    })
  },

  onCallPhone() {
    const phone = this.data.branch && this.data.branch.phone
    if (!phone) {
      wx.showToast({ title: '暂无电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  onNavigate() {
    const { latitude, longitude, bank_name } = this.data.branch || {}
    if (!latitude || !longitude) {
      wx.showToast({ title: '暂无位置信息', icon: 'none' })
      return
    }
    wx.openLocation({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: bank_name,
      scale: 14
    })
  },

  onCopyAddress() {
    const address = this.data.branch && this.data.branch.address
    if (!address) return
    wx.setClipboardData({
      data: address,
      success: () => {
        wx.showToast({ title: '地址已复制', icon: 'none' })
      }
    })
  }
})