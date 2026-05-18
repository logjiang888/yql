const { createNocoBaseAPI, BASE_URL } = require('../../api/nocobase')
const { showLoading, hideLoading, formatDate } = require('../../utils/util')

const companyAPI = createNocoBaseAPI('company_info')
const ASSET_BASE = BASE_URL.replace('/api', '')

const INDUSTRY_MAP = {
  wholesale: '批发',
  production: '生产',
  construction: '建设',
  trade: '贸易',
  manufacturing: '制造',
  engineering: '工程',
  service: '服务',
  agriculture: '农业'
}

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
    ], true).then((res) => {
      hideLoading()
      // 深拷贝避免响应数据被框架冻结导致修改不生效
      var company = JSON.parse(JSON.stringify(res.data || {}))
      company._createdAtFormatted = formatDate(company.createdAt)
      company.industryLabel = INDUSTRY_MAP[company.industry] || company.industry || '-'

      // 附件 URL 补全前缀（兼容数组、对象、null）
      var imgFields = ['annual_revenue_invoiced_image', 'recent_two_year_revenue_image', 'other_attachment',
        'company_debt_image', 'legal_rep_debt_image', 'credit_inquiry_6m_image']
      imgFields.forEach(function(field) {
        var val = company[field]
        if (Array.isArray(val)) {
          company[field] = val.map(function(item) {
            if (item && typeof item === 'object') {
              var url = item.url || item.path || ''
              if (url && url.indexOf('/storage/') === 0) {
                item.url = ASSET_BASE + url
              }
            }
            return item
          })
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
          var url = val.url || val.path || ''
          if (url && url.indexOf('/storage/') === 0) {
            val.url = ASSET_BASE + url
          }
        }
      })

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