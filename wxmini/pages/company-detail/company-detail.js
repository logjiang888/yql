const { createNocoBaseAPI } = require('../../api/nocobase')
const { showLoading, hideLoading, formatDate } = require('../../utils/util')

const companyAPI = createNocoBaseAPI('company_info')

Page({
  data: {
    loading: true,
    company: null
  },

  onLoad(options) {
    const { id } = options
    if (id) {
      this.loadDetail(id)
    }
  },

  loadDetail(id) {
    this.setData({ loading: true })
    showLoading('加载中')
    companyAPI.get(id, [
      'annual_revenue_invoiced_image', 'recent_two_year_revenue_image', 'other_attachment',
      'company_debt_image', 'legal_rep_debt_image', 'credit_inquiry_6m_image'
    ]).then((res) => {
      hideLoading()
      const company = res.data || {}
      company._createdAtFormatted = formatDate(company.createdAt)
      this.setData({ company, loading: false })
    }).catch(() => {
      hideLoading()
      this.setData({ loading: false })
    })
  },

  onCallPhone() {
    const phone = this.data.company && this.data.company.contact_phone
    if (!phone) {
      wx.showToast({ title: '暂无电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({ urls: [url], current: url })
  },

  onStartChat() {
    const { user_id, company_name } = this.data.company || {}
    if (!user_id) {
      wx.showToast({ title: '无法发起聊天', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/chat/chat?toUserId=${user_id}&toUserName=${encodeURIComponent(company_name || '')}`
    })
  }
})