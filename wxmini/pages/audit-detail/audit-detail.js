const { createNocoBaseAPI, BASE_URL } = require('../../api/nocobase')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

const userAPI = createNocoBaseAPI('users')
const companyAPI = createNocoBaseAPI('company_info')
const configAPI = createNocoBaseAPI('dim_data_config')
const ASSET_BASE = BASE_URL.replace('/api', '')

const AUDIT_STATUS_MAP = {
  unreviewed: { text: '未审核', color: '#9CA3AF' },
  under_review: { text: '审核中', color: '#D97706' },
  approved: { text: '已审核', color: '#059669' },
  rejected: { text: '已驳回', color: '#DC2626' },
  disabled: { text: '禁用', color: '#DC2626' }
}

const AUDIT_STATUS_OPTIONS = [
  { label: '未审核', value: 'unreviewed' },
  { label: '审核中', value: 'under_review' },
  { label: '已审核', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '禁用', value: 'disabled' }
]

const APPROVED_DEFAULT_RESULT = '恭喜您，已经审核通过，请退出重新登录解锁所有功能!'

const ROLE_TEXT_MAP = {
  bank: '银行人员',
  company: '企业客户'
}

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
    saving: false,
    userId: 0,
    role: '',
    roleText: '',
    userInfo: null,
    companyInfo: null,
    auditStatusText: '',
    auditStatusColor: '',
    auditStatusValue: '',
    auditStatusLabel: '',
    auditStatusColumns: ['未审核', '审核中', '已审核', '已驳回', '禁用'],
    auditStatusIndex: 0,
    showStatusPicker: false,
    auditResult: '',
    refImages: {}
  },

  onLoad(options) {
    const userId = parseInt(options.userId || 0)
    const role = options.role || ''
    this.setData({ userId: userId, role: role, roleText: ROLE_TEXT_MAP[role] || role })
    if (userId) {
      this.loadDetail(userId, role)
    }
  },

  loadDetail(userId, role) {
    const that = this
    this.setData({ loading: true })
    showLoading('加载中')

    userAPI.get(userId, [], true).then(function(res) {
      const userInfo = JSON.parse(JSON.stringify(res.data || {}))
      // 头像 URL 补全
      if (userInfo.head_image && userInfo.head_image.indexOf('http') !== 0 && userInfo.head_image.indexOf('/storage/') === 0) {
        userInfo.head_image = ASSET_BASE + userInfo.head_image
      }
      // 头像文字
      const name = userInfo.nickname || userInfo.real_name || userInfo.username || '用'
      userInfo._avatarText = name.charAt(0)
      // 审核状态
      const statusConfig = AUDIT_STATUS_MAP[userInfo.audit_status] || { text: userInfo.audit_status || '-', color: '#9CA3AF' }
      // 业务范围数组化
      if (typeof userInfo.business_scope === 'string' && userInfo.business_scope) {
        userInfo.business_scope = userInfo.business_scope.split(',')
      } else if (!Array.isArray(userInfo.business_scope)) {
        userInfo.business_scope = []
      }
      // 工作证件 URL 补全
      if (userInfo.work_proof && Array.isArray(userInfo.work_proof)) {
        userInfo.work_proof = userInfo.work_proof.map(function(item) {
          if (item && typeof item === 'object') {
            var url = item.url || item.path || ''
            if (url && url.indexOf('/storage/') === 0) {
              item.url = ASSET_BASE + url
            }
          }
          return item
        })
      }

      var statusIndex = 0
      for (var i = 0; i < AUDIT_STATUS_OPTIONS.length; i++) {
        if (AUDIT_STATUS_OPTIONS[i].value === userInfo.audit_status) {
          statusIndex = i
          break
        }
      }
      that.setData({
        userInfo: userInfo,
        auditStatusText: statusConfig.text,
        auditStatusColor: statusConfig.color,
        auditStatusValue: userInfo.audit_status || '',
        auditStatusLabel: statusConfig.text,
        auditStatusIndex: statusIndex,
        auditResult: userInfo.audit_result || ''
      })

      if (role === 'company') {
        return that.loadCompanyInfo(userId)
      }
      hideLoading()
      that.setData({ loading: false })
    }).catch(function(err) {
      hideLoading()
      that.setData({ loading: false })
      showToast(err.message || '加载失败')
    })
  },

  loadCompanyInfo(userId) {
    const that = this
    companyAPI.list({
      pageSize: 1,
      filter: { user_id: { $eq: userId } },
      appends: ['annual_revenue_invoiced_image', 'recent_two_year_revenue_image', 'company_debt_image', 'legal_rep_debt_image', 'credit_inquiry_6m_image', 'other_attachment']
    }, true).then(function(res) {
      hideLoading()
      var companyInfo = JSON.parse(JSON.stringify((res.data || [])[0] || {}))
      companyInfo.industryLabel = INDUSTRY_MAP[companyInfo.industry] || companyInfo.industry || '-'
      // 附件 URL 补全
      var imgFields = ['annual_revenue_invoiced_image', 'recent_two_year_revenue_image', 'company_debt_image', 'legal_rep_debt_image', 'credit_inquiry_6m_image', 'other_attachment']
      imgFields.forEach(function(field) {
        var arr = companyInfo[field]
        if (!Array.isArray(arr)) {
          companyInfo[field] = []
          return
        }
        companyInfo[field] = arr.map(function(item) {
          if (!item) return item
          if (typeof item === 'string') return item
          var url = item.url || ''
          if (url && url.indexOf('/storage/') === 0) {
            item.url = ASSET_BASE + url
          }
          return item
        })
      })
      that.setData({ companyInfo: companyInfo, loading: false })
      that.loadReferenceImages()
    }).catch(function(err) {
      hideLoading()
      that.setData({ loading: false })
      console.error('[audit-detail] 加载企业信息失败:', err)
    })
  },

  loadReferenceImages() {
    var that = this
    var types = ['company_debt_image', 'annual_revenue_invoiced_image', 'credit_inquiry_6m_image', 'legal_rep_debt_image']
    configAPI.list({
      filter: {
        $or: types.map(function(t) { return { data_code: { $eq: t } } })
      },
      pageSize: 10,
      sort: '-createdAt'
    }, true).then(function(res) {
      var items = res.data || []
      var refImages = {}
      items.forEach(function(item) {
        var type = item.data_code
        var url = item.data_url || ''
        if (url && url.indexOf('/storage/') === 0) {
          url = ASSET_BASE + url
        }
        if (types.indexOf(type) >= 0 && url) {
          refImages[type] = url
        }
      })
      that.setData({ refImages: refImages })
    })
  },

  onPreviewRefImage(e) {
    var url = e.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({ urls: [url], current: url })
  },

  onShowStatusPicker() {
    this.setData({ showStatusPicker: true })
  },

  onCloseStatusPicker() {
    this.setData({ showStatusPicker: false })
  },

  onStatusConfirm(e) {
    const index = e.detail.index
    const option = AUDIT_STATUS_OPTIONS[index]
    var updateData = {
      showStatusPicker: false,
      auditStatusValue: option.value,
      auditStatusLabel: option.label,
      auditStatusIndex: index
    }
    // 选中"已审核"且审核结果为空时，自动填充默认文案
    if (option.value === 'approved') {
      var currentResult = this.data.auditResult || ''
      if (!currentResult.trim()) {
        updateData.auditResult = APPROVED_DEFAULT_RESULT
      }
    }
    this.setData(updateData)
  },

  onAuditResultInput(e) {
    this.setData({ auditResult: e.detail })
  },

  onSave() {
    const that = this
    const { userId, auditStatusValue, auditResult } = this.data
    if (!userId) {
      showToast('用户ID为空')
      return
    }
    this.setData({ saving: true })
    showLoading('保存中')
    var updateData = {}
    if (auditStatusValue) {
      updateData.audit_status = auditStatusValue
    }
    updateData.audit_result = auditResult
    userAPI.update(userId, updateData, true).then(function() {
      hideLoading()
      that.setData({ saving: false })
      showToast('保存成功')
      // 更新本地显示状态
      var statusConfig = AUDIT_STATUS_MAP[auditStatusValue] || { text: auditStatusValue || '-', color: '#9CA3AF' }
      that.setData({ auditStatusText: statusConfig.text, auditStatusColor: statusConfig.color })
    }).catch(function(err) {
      hideLoading()
      that.setData({ saving: false })
      console.error('[audit-detail] 保存审核结果失败:', err)
      showToast(err.message || '保存失败')
    })
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({ urls: [url], current: url })
  }
})
