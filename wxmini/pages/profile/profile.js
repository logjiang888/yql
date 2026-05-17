const { getUserInfo, getRole, getUserId, clearAuth, getToken } = require('../../stores/auth')
const { ROLE_TEXT } = require('../../constants/index')
const { showToast, showLoading, hideLoading } = require('../../utils/util')
const { createNocoBaseAPI, BASE_URL } = require('../../api/nocobase')

const userAPI = createNocoBaseAPI('users')
const companyAPI = createNocoBaseAPI('company_info')
const bankAPI = createNocoBaseAPI('dim_bank_info')

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
    isEditMode: false,
    loading: false,
    saving: false,
    userInfo: null,
    role: '',
    roleText: '',
    form: {},
    originalForm: {},
    companyId: null,
    bankList: [],
    bankSearchList: [],
    showBankCodePicker: false,
    bankSearchKeyword: '',
    scopeTags: JSON.parse(JSON.stringify(SCOPE_TAGS)),
    menuList: [
      { icon: '👤', title: '我的资料', path: '' },
      { icon: '🔒', title: '修改密码', path: '/pages/change-password/change-password' },
      { icon: '🔔', title: '消息提醒设置', path: '' },
      { icon: '❓', title: '帮助与反馈', path: '' },
      { icon: 'ℹ', title: '关于我们', path: '' }
    ]
  },

  onShow() {
    const userInfo = getUserInfo()
    const role = getRole()
    const roleConfig = ROLE_TEXT[role] || ROLE_TEXT.company
    this.setData({ userInfo: userInfo, role: role, roleText: roleConfig.text })
    if (!this.data.isEditMode) {
      this.loadProfile()
    }
  },

  loadProfile() {
    this.setData({ loading: true })
    var myId = getUserId()
    if (!myId) {
      this.setData({ loading: false })
      return
    }

    var that = this
    userAPI.get(myId, [], true).then(function(res) {
      var fullUserInfo = res.data || {}
      var role = getRole()
      var form = that.buildForm(fullUserInfo, role)

      if (role === 'company') {
        that.loadCompanyInfo(myId, form, fullUserInfo)
      } else {
        var p = role === 'bank' ? that.loadBankList() : Promise.resolve()
        p.then(function() {
          var scopeTags = that.syncScopeTags(form.business_scope)
          that.setData({
            userInfo: fullUserInfo,
            form: form,
            originalForm: JSON.parse(JSON.stringify(form)),
            scopeTags: scopeTags,
            loading: false
          })
        })
      }
    }).catch(function() {
      that.setData({ loading: false })
    })
  },

  syncScopeTags(businessScope) {
    var arr = Array.isArray(businessScope) ? businessScope : []
    var tags = JSON.parse(JSON.stringify(SCOPE_TAGS))
    for (var i = 0; i < tags.length; i++) {
      if (arr.indexOf(tags[i].name) >= 0) {
        tags[i].checked = true
      }
    }
    return tags
  },

  loadCompanyInfo(userId, form, fullUserInfo) {
    var that = this
    companyAPI.list({
      pageSize: 1,
      filter: { user_id: { $eq: userId } }
    }, true).then(function(res) {
      var companyInfo = (res.data || [])[0] || {}
      var newForm = {}
      for (var k in form) { newForm[k] = form[k] }
      for (var k in companyInfo) { newForm[k] = companyInfo[k] }
      that.setData({
        userInfo: fullUserInfo,
        form: newForm,
        companyId: companyInfo.id,
        originalForm: JSON.parse(JSON.stringify(newForm)),
        loading: false
      })
    }).catch(function() {
      that.setData({
        userInfo: fullUserInfo,
        form: form,
        originalForm: JSON.parse(JSON.stringify(form)),
        loading: false
      })
    })
  },

  loadBankList() {
    var that = this
    return bankAPI.list({ pageSize: 1000 }, true).then(function(res) {
      var rawList = []
      if (res && Array.isArray(res.data)) {
        rawList = res.data
      } else if (res && res.data && Array.isArray(res.data.data)) {
        rawList = res.data.data
      } else if (Array.isArray(res)) {
        rawList = res
      }
      var validBanks = []
      for (var i = 0; i < rawList.length; i++) {
        var item = rawList[i]
        if (!item) continue
        var bname = item.bank_name || item.bankName
        var bcode = item.bank_code !== undefined && item.bank_code !== null ? item.bank_code : (item.bankCode !== undefined && item.bankCode !== null ? item.bankCode : null)
        if (bname && bcode !== null) {
          validBanks.push({
            id: item.id,
            bank_name: bname,
            bank_code: String(bcode)
          })
        }
      }
      that.setData({ bankList: validBanks, bankSearchList: validBanks })
      return validBanks
    }).catch(function() {
      that.setData({ bankList: [], bankSearchList: [] })
      return []
    })
  },

  buildForm(userInfo, role) {
    var form = {}
    if (role === 'company') {
      form.company_name = userInfo.company_name || ''
      form.credit_code = userInfo.credit_code || ''
      form.legal_representative = userInfo.legal_representative || userInfo.nickname || ''
      form.contact_phone = userInfo.phone || ''
      form.annual_revenue_invoiced = userInfo.annual_revenue_invoiced || ''
      form.recent_two_year_revenue_uninvoiced = userInfo.recent_two_year_revenue_uninvoiced || ''
      form.industry = userInfo.industry || ''
      form.office_address = userInfo.office_address || ''
      form.company_debt_status = userInfo.company_debt_status || ''
      form.legal_rep_debt_status = userInfo.legal_rep_debt_status || ''
      form.bank_account_count = userInfo.bank_account_count || ''
      form.overdue_count = userInfo.overdue_count || ''
      form.debt_count = userInfo.debt_count || ''
      form.credit_inquiry_6m = userInfo.credit_inquiry_6m || ''
      form.financial_resources_company = userInfo.financial_resources_company || ''
      form.financial_resources_legal_rep = userInfo.financial_resources_legal_rep || ''
      form.loan_requirement = userInfo.loan_requirement || ''
    } else if (role === 'bank') {
      form.name = userInfo.nickname || userInfo.real_name || ''
      form.phone = userInfo.phone || ''
      form.bank_id = userInfo.bank_id || ''
      form.bank_name = userInfo.bank_name || ''
      form.bank_code = userInfo.bank_code || ''
      form.bank_code_input = userInfo.bank_name || ''
      form.position = userInfo.position || ''
      form.work_years = userInfo.work_years || ''
      var bs = userInfo.business_scope || ''
      if (typeof bs === 'string' && bs) {
        form.business_scope = bs.split(',')
      } else if (Array.isArray(bs)) {
        form.business_scope = bs
      } else {
        form.business_scope = []
      }
      form.published_products = userInfo.published_products || ''
      var wp = userInfo.work_proof || []
      if (!Array.isArray(wp)) wp = []
      form.work_proof = wp.map(function(item) {
        if (typeof item === 'string') return item
        var url = item.url || ''
        if (url && url.indexOf('/storage/') === 0) {
          url = BASE_URL.replace('/api', '') + url
        }
        return { id: item.id, url: url }
      })
    } else {
      form.name = userInfo.nickname || userInfo.real_name || ''
      form.phone = userInfo.phone || ''
      form.position = userInfo.position || ''
      form.work_years = userInfo.work_years || ''
    }
    return form
  },

  onMenuTap(e) {
    var path = e.currentTarget.dataset.path
    var title = e.currentTarget.dataset.title
    if (title === '我的资料') {
      this.setData({ isEditMode: true })
      if (!this.data.form || Object.keys(this.data.form).length === 0) {
        this.loadProfile()
      } else {
        var scopeTags = this.syncScopeTags(this.data.form.business_scope)
        this.setData({ scopeTags: scopeTags })
      }
      return
    }
    if (!path) {
      showToast('功能开发中')
      return
    }
    wx.navigateTo({ url: path })
  },

  onInputChange(e) {
    var field = e.currentTarget.dataset.field
    var value = e.detail.value !== undefined ? e.detail.value : e.detail
    this.setData({ ['form.' + field]: value })
  },

  onNumberInput(e) {
    var field = e.currentTarget.dataset.field
    var value = e.detail.value
    this.setData({ ['form.' + field]: value })
  },

  onUploadChange(e) {
    var field = e.currentTarget.dataset.field
    var files = e.detail.files
    this.setData({ ['form.' + field]: files })
  },

  uploadAttachments(filePaths) {
    if (!filePaths || filePaths.length === 0) return Promise.resolve([])
    var token = getToken()
    return Promise.all(filePaths.map(function(filePath) {
      return new Promise(function(resolve) {
        if (typeof filePath !== 'string') {
          resolve(filePath.id || null)
          return
        }
        wx.uploadFile({
          url: BASE_URL + '/attachments:create',
          filePath: filePath,
          name: 'file',
          formData: { t: Date.now() },
          header: { Authorization: 'Bearer ' + token },
          success: function(res) {
            if (res.statusCode !== 200 && res.statusCode !== 201) {
              resolve(null)
              return
            }
            try {
              var result = JSON.parse(res.data)
              var attachment = (result && result.data) || result
              resolve(attachment.id || null)
            } catch (e) {
              resolve(null)
            }
          },
          fail: function() {
            resolve(null)
          }
        })
      })
    })).then(function(ids) {
      return ids.filter(function(id) { return id !== null })
    })
  },

  // --- Bank selector ---
  onBankCodeSearch() {
    var form = this.data.form
    var keyword = (form.bank_code_input || '').trim()
    if (!keyword) {
      showToast('先输入银行联行号或银行名称')
      return
    }
    this.doBankCodeFilter(keyword)
  },

  doBankCodeFilter(keyword) {
    var that = this
    var filter = { bank_code: { $includes: keyword } }
    showLoading('搜索中')
    bankAPI.list({ pageSize: 100, filter: filter }, true).then(function(res) {
      hideLoading()
      var rawList = []
      if (res && Array.isArray(res.data)) {
        rawList = res.data
      } else if (res && res.data && Array.isArray(res.data.data)) {
        rawList = res.data.data
      } else if (Array.isArray(res)) {
        rawList = res
      }
      var bankSearchList = []
      for (var i = 0; i < rawList.length; i++) {
        var item = rawList[i]
        if (!item) continue
        var bname = item.bank_name || item.bankName
        var bcode = item.bank_code !== undefined && item.bank_code !== null ? item.bank_code : (item.bankCode !== undefined && item.bankCode !== null ? item.bankCode : null)
        if (bname && bcode !== null) {
          bankSearchList.push({
            id: item.id,
            bank_name: bname,
            bank_code: String(bcode)
          })
        }
      }
      that.setData({
        showBankCodePicker: true,
        bankSearchList: bankSearchList,
        bankSearchKeyword: keyword
      })
    }).catch(function(err) {
      hideLoading()
      console.error('[doBankCodeFilter] 后端搜索失败:', err)
      wx.showToast({ title: '搜索失败，请重试', icon: 'none' })
    })
  },

  onBankSelect(e) {
    var item = e.currentTarget.dataset.item
    var form = this.data.form
    form.bank_id = item.id
    form.bank_name = item.bank_name
    form.bank_code = item.bank_code
    form.bank_code_input = item.bank_name
    this.setData({
      form: form,
      showBankCodePicker: false,
      bankSearchKeyword: '',
      bankSearchList: this.data.bankList
    })
  },

  onCloseBankCodePicker() {
    this.setData({ showBankCodePicker: false, bankSearchKeyword: '' })
  },

  // --- Scope tags ---
  onScopeToggle(e) {
    var name = e.currentTarget.dataset.name
    var scopeTags = this.data.scopeTags.map(function(tag) {
      if (tag.name !== name) return tag
      var newTag = {}
      for (var k in tag) { newTag[k] = tag[k] }
      newTag.checked = !tag.checked
      return newTag
    })
    var business_scope = scopeTags.filter(function(t) { return t.checked }).map(function(t) { return t.name })
    this.setData({ scopeTags: scopeTags, 'form.business_scope': business_scope })
  },

  onSave() {
    var role = this.data.role
    var form = this.data.form
    var userInfo = this.data.userInfo
    var companyId = this.data.companyId
    if (!userInfo || !userInfo.id) return

    this.setData({ saving: true })
    showLoading('保存中')

    var that = this

    var doSave = function() {
      var userUpdate = that.buildUserUpdateData(form, role)
      userAPI.update(userInfo.id, userUpdate, true).then(function() {
        if (role === 'company' && companyId) {
          var companyUpdate = that.buildCompanyUpdateData(form)
          companyAPI.update(companyId, companyUpdate, true).then(function() {
            hideLoading()
            that.setData({ saving: false, isEditMode: false })
            showToast('保存成功')
            that.loadProfile()
          }).catch(function(err) {
            hideLoading()
            that.setData({ saving: false })
            showToast(err.message || '企业信息保存失败')
          })
        } else {
          hideLoading()
          that.setData({ saving: false, isEditMode: false })
          showToast('保存成功')
          that.loadProfile()
        }
      }).catch(function(err) {
        hideLoading()
        that.setData({ saving: false })
        showToast(err.message || '保存失败')
      })
    }

    if (role === 'bank' && form.work_proof && form.work_proof.length > 0) {
      var hasNewFiles = form.work_proof.some(function(item) { return typeof item === 'string' })
      if (hasNewFiles) {
        that.uploadAttachments(form.work_proof).then(function(newIds) {
          var existingIds = form.work_proof
            .filter(function(item) { return typeof item !== 'string' && item.id })
            .map(function(item) { return item.id })
          var allIds = existingIds.concat(newIds)
          form.work_proof = allIds.map(function(id) { return { id: id } })
          doSave()
        }).catch(function() {
          hideLoading()
          that.setData({ saving: false })
          showToast('证件上传失败')
        })
        return
      }
    }
    doSave()
  },

  buildUserUpdateData(form, role) {
    var data = {}
    if (role === 'company') {
      data.nickname = form.legal_representative || form.contact_phone
      data.phone = form.contact_phone
      data.real_name = form.legal_representative
    } else if (role === 'bank') {
      data.nickname = form.name
      data.real_name = form.name
      data.phone = form.phone
      data.position = form.position
      if (form.work_years) data.work_years = parseInt(form.work_years)
      data.bank_id = form.bank_id
      data.bank_name = form.bank_name
      data.bank_code = form.bank_code
      if (Array.isArray(form.business_scope) && form.business_scope.length > 0) {
        data.business_scope = form.business_scope.join(',')
      } else {
        data.business_scope = ''
      }
      data.published_products = form.published_products
      var wpFiles = form.work_proof || []
      var wpIds = wpFiles.map(function(item) {
        if (typeof item === 'string') return null
        return item.id || null
      }).filter(function(id) { return id !== null })
      if (wpIds.length > 0) {
        data.work_proof = wpIds.map(function(id) { return { id: id } })
      }
    } else {
      data.nickname = form.name
      data.real_name = form.name
      data.phone = form.phone
      data.position = form.position
      if (form.work_years) data.work_years = parseInt(form.work_years)
    }
    return data
  },

  buildCompanyUpdateData(form) {
    var data = {}
    data.company_name = form.company_name
    data.credit_code = form.credit_code
    data.legal_representative = form.legal_representative
    data.contact_phone = form.contact_phone
    if (form.annual_revenue_invoiced) data.annual_revenue_invoiced = Number(form.annual_revenue_invoiced)
    if (form.recent_two_year_revenue_uninvoiced) data.recent_two_year_revenue_uninvoiced = Number(form.recent_two_year_revenue_uninvoiced)
    data.industry = form.industry
    data.office_address = form.office_address
    data.company_debt_status = form.company_debt_status
    data.legal_rep_debt_status = form.legal_rep_debt_status
    if (form.bank_account_count) data.bank_account_count = Number(form.bank_account_count)
    if (form.overdue_count) data.overdue_count = Number(form.overdue_count)
    if (form.debt_count) data.debt_count = Number(form.debt_count)
    if (form.credit_inquiry_6m) data.credit_inquiry_6m = Number(form.credit_inquiry_6m)
    if (form.financial_resources_company) data.financial_resources_company = Number(form.financial_resources_company)
    if (form.financial_resources_legal_rep) data.financial_resources_legal_rep = Number(form.financial_resources_legal_rep)
    if (form.loan_requirement) data.loan_requirement = Number(form.loan_requirement)
    return data
  },

  onCancel() {
    var originalForm = this.data.originalForm
    var scopeTags = this.syncScopeTags(originalForm.business_scope)
    this.setData({
      isEditMode: false,
      form: JSON.parse(JSON.stringify(originalForm)),
      scopeTags: scopeTags,
      showBankCodePicker: false,
      bankSearchKeyword: ''
    })
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: function(res) {
        if (res.confirm) {
          clearAuth()
          wx.reLaunch({ url: '/pages/start/start' })
        }
      }
    })
  }
})
