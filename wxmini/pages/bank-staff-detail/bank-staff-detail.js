const { createNocoBaseAPI, BASE_URL } = require('../../api/nocobase')
const { showLoading, hideLoading, checkAuditInterceptor } = require('../../utils/util')

const userAPI = createNocoBaseAPI('users')

// 附件域名（去掉 /api 后缀）
const BASE_DOMAIN = BASE_URL.replace(/\/api$/, '')

Page({
  data: {
    loading: true,
    staff: null
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
    this.setData({ loading: true })
    showLoading('加载中')
    userAPI.get(id, 'to_dim_bank_info,published_products,work_proof', true).then((res) => {
      hideLoading()
      const staff = res.data || {}
      const bankInfo = staff.to_dim_bank_info || {}
      staff.bank_name = bankInfo.bank_name || staff.bank_name || ''
      if (staff.head_image && staff.head_image.indexOf('http') !== 0 && staff.head_image.indexOf('/') === 0) {
        staff.head_image = BASE_DOMAIN + staff.head_image
      }

      // 处理发布的产品（兼容字符串或关联数组）
      let products = staff.published_products
      if (Array.isArray(products)) {
        staff.published_products_text = products.map(function (p) {
          return p.name || p.title || p.product_name || ''
        }).filter(Boolean).join('、')
      } else if (typeof products === 'string') {
        staff.published_products_text = products
      } else {
        staff.published_products_text = ''
      }

      // 处理工作证明附件（url 是相对路径，需要拼接域名）
      const workProofList = staff.work_proof || []
      staff.work_proof_urls = workProofList.map(function (item) {
        let url = item.url || item.preview || item.path || ''
        if (url && url.indexOf('/') === 0) {
          url = BASE_DOMAIN + url
        }
        return url
      }).filter(function (url) { return !!url })
      console.log('[work_proof] 附件URL:', staff.work_proof_urls)

      this.setData({ staff, loading: false })
    }).catch(() => {
      hideLoading()
      this.setData({ loading: false })
    })
  },

  onCallPhone() {
    const phone = this.data.staff && this.data.staff.phone
    if (!phone) return
    wx.makePhoneCall({ phoneNumber: phone })
  },

  onStartChat() {
    const { id, nickname } = this.data.staff
    wx.navigateTo({
      url: `/pages/chat/chat?toUserId=${id}&toUserName=${encodeURIComponent(nickname || '')}`
    })
  },

  onPreviewImage(e) {
    const { url, urls } = e.currentTarget.dataset
    wx.previewImage({
      current: url,
      urls: urls || [url]
    })
  },

  onImageError(e) {
    const url = e.currentTarget.dataset.url
    console.error('[work_proof] 图片加载失败:', url)
  }
})
