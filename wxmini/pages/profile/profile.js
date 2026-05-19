const { getUserInfo, getRole, getUserId, clearAuth, getToken } = require('../../stores/auth')
const { ROLE_TEXT } = require('../../constants/index')
const { showToast, showLoading, hideLoading } = require('../../utils/util')
const { createNocoBaseAPI, BASE_URL } = require('../../api/nocobase')

const userAPI = createNocoBaseAPI('users')
const companyAPI = createNocoBaseAPI('company_info')
const bankAPI = createNocoBaseAPI('dim_bank_info')
const configAPI = createNocoBaseAPI('dim_data_config')

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
      { icon: '📋', title: '审核结果', path: '' },
      { icon: '❓', title: '帮助与反馈', path: '' },
      { icon: 'ℹ', title: '关于我们', path: '' }
    ],
    refImages: {},
    showIndustryPicker: false,
    industryLabel: '',
    industryOptions: [
      { label: '批发', value: 'wholesale' },
      { label: '生产', value: 'production' },
      { label: '建设', value: 'construction' },
      { label: '贸易', value: 'trade' },
      { label: '制造', value: 'manufacturing' },
      { label: '工程', value: 'engineering' },
      { label: '服务', value: 'service' },
      { label: '农业', value: 'agriculture' }
    ],
    industryColumns: ['批发', '生产', '建设', '贸易', '制造', '工程', '服务', '农业']
  },

  onShow() {
    const userInfo = getUserInfo()
    const role = getRole()
    const roleConfig = ROLE_TEXT[role] || ROLE_TEXT.company
    this.setData({ userInfo: userInfo, role: role, roleText: roleConfig.text })
    this.computeAvatarText()
    if (!this.data.isEditMode) {
      this.loadProfile()
    }
  },

  computeAvatarText() {
    var userInfo = this.data.userInfo || {}
    var form = this.data.form || {}
    var text = form.nickname || form.name || form.legal_representative || form.company_name || userInfo.nickname || userInfo.username || '用'
    this.setData({ avatarText: text.charAt(0) })
  },

  loadProfile() {
    this.setData({ loading: true })
    var myId = getUserId()
    if (!myId) {
      this.setData({ loading: false })
      return
    }

    var that = this
    that.loadReferenceImages()
    var role = getRole()
    var appends = role === 'bank' ? ['bank_id', 'work_proof'] : []
    console.log('[loadProfile] userAPI.list appends:', appends)
    userAPI.list({
      pageSize: 1,
      filter: { id: { $eq: myId } },
      appends: appends
    }, true).then(function(res) {
      var fullUserInfo = (res.data || [])[0] || {}
      if (fullUserInfo.head_image) {
        fullUserInfo.head_image = that.resolveImageUrl(fullUserInfo.head_image)
      }
      console.log('[loadProfile] userAPI.list 返回:', JSON.stringify(fullUserInfo))
      var form = that.buildForm(fullUserInfo, role)

      if (role === 'company') {
        that.loadCompanyInfo(myId, form, fullUserInfo)
      } else {
        var p = role === 'bank' ? that.loadBankList() : Promise.resolve()
        p.then(function() {
          if (role === 'bank' && form.bank_id && !form.bank_name) {
            var bankList = that.data.bankList || []
            var matchedBank = null
            for (var i = 0; i < bankList.length; i++) {
              if (String(bankList[i].id) === String(form.bank_id)) {
                matchedBank = bankList[i]
                break
              }
            }
            if (matchedBank) {
              form.bank_name = matchedBank.bank_name || ''
              form.bank_code = matchedBank.bank_code || ''
              form.bank_code_input = matchedBank.bank_code || ''
              console.log('[loadProfile] 从 bankList 兜底匹配到银行:', matchedBank)
            } else {
              console.log('[loadProfile] bankList 中未找到 bank_id:', form.bank_id)
            }
          }
          var scopeTags = that.syncScopeTags(form.business_scope)
          that.setData({
            userInfo: fullUserInfo,
            form: form,
            originalForm: JSON.parse(JSON.stringify(form)),
            scopeTags: scopeTags,
            loading: false,
            industryLabel: that.setIndustryLabel(form)
          })
          that.computeAvatarText()
        })
      }
    }).catch(function(err) {
      console.error('[loadProfile] 加载失败:', err)
      that.setData({ loading: false })
    })
  },

  loadReferenceImages() {
    var that = this
    var ASSET_BASE = BASE_URL.replace('/api', '')
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
    var url = e.detail
    if (!url) return
    wx.previewImage({
      current: url,
      urls: [url]
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
      filter: { user_id: { $eq: userId } },
      appends: ['annual_revenue_invoiced_image', 'recent_two_year_revenue_image', 'company_debt_image', 'legal_rep_debt_image', 'credit_inquiry_6m_image', 'other_attachment']
    }, true).then(function(res) {
      var companyInfo = (res.data || [])[0] || {}
      if (fullUserInfo.head_image) {
        fullUserInfo.head_image = that.resolveImageUrl(fullUserInfo.head_image)
      }
      var newForm = {}
      for (var k in form) { newForm[k] = form[k] }
      for (var k in companyInfo) { newForm[k] = companyInfo[k] }
      // 附件 URL 补全前缀
      var imgFields = ['annual_revenue_invoiced_image', 'recent_two_year_revenue_image', 'company_debt_image', 'legal_rep_debt_image', 'credit_inquiry_6m_image', 'other_attachment']
      var ASSET_BASE = BASE_URL.replace('/api', '')
      console.log('[loadCompanyInfo] 开始处理附件字段，ASSET_BASE:', ASSET_BASE)
      imgFields.forEach(function(field) {
        var arr = newForm[field]
        console.log('[loadCompanyInfo] 字段 ' + field + ' 后端原始值:', arr)
        if (!Array.isArray(arr)) {
          newForm[field] = []
          console.log('[loadCompanyInfo] 字段 ' + field + ' 不是数组，设为空数组')
          return
        }
        newForm[field] = arr.map(function(item) {
          if (!item) return item
          if (typeof item === 'string') {
            console.log('[loadCompanyInfo] 字段 ' + field + ' 字符串项:', item)
            return item
          }
          var url = item.url || ''
          if (url && url.indexOf('/storage/') === 0) {
            item.url = ASSET_BASE + url
          }
          console.log('[loadCompanyInfo] 字段 ' + field + ' 对象项:', item)
          return item
        })
      })
      that.setData({
        userInfo: fullUserInfo,
        form: newForm,
        companyId: companyInfo.id,
        originalForm: JSON.parse(JSON.stringify(newForm)),
        loading: false,
        industryLabel: that.setIndustryLabel(newForm)
      })
      that.computeAvatarText()
    }).catch(function() {
      that.setData({
        userInfo: fullUserInfo,
        form: form,
        originalForm: JSON.parse(JSON.stringify(form)),
        loading: false,
        industryLabel: that.setIndustryLabel(form)
      })
      that.computeAvatarText()
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
    form.head_image = userInfo.head_image || ''
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
      var bankInfo = userInfo.bank_id
      if (bankInfo && typeof bankInfo === 'object') {
        form.bank_id = bankInfo.id || ''
        form.bank_name = bankInfo.bank_name || ''
        form.bank_code = bankInfo.bank_code || ''
        form.bank_code_input = bankInfo.bank_code || ''
        console.log('[buildForm] bank_id 是对象，提取银行信息:', bankInfo)
      } else {
        form.bank_id = bankInfo || ''
        form.bank_name = userInfo.bank_name || ''
        form.bank_code = userInfo.bank_code || ''
        form.bank_code_input = userInfo.bank_code || ''
        console.log('[buildForm] bank_id 是原始值:', bankInfo)
      }
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

  onChooseAvatar() {
    var that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var tempFilePath = res.tempFilePaths[0]
        showLoading('上传中')
        that.uploadAvatar(tempFilePath).then(function(url) {
          hideLoading()
          var userInfo = that.data.userInfo || {}
          var form = that.data.form || {}
          userInfo.head_image = url
          form.head_image = url
          that.setData({ userInfo: userInfo, form: form })
          that.computeAvatarText()
          var myId = getUserId()
          if (myId) {
            userAPI.update(myId, { head_image: url }, true).then(function() {
              showToast('头像更新成功')
            }).catch(function(err) {
              console.error('[onChooseAvatar] 更新用户头像失败:', err)
              showToast('头像保存失败')
            })
          }
        }).catch(function(err) {
          hideLoading()
          console.error('[onChooseAvatar] 上传失败:', err)
          showToast(err.message || '上传失败')
        })
      }
    })
  },

  resolveImageUrl(url) {
    if (!url) return url
    if (url.indexOf('http') === 0) return url
    if (url.indexOf('/storage/') === 0) {
      return BASE_URL.replace('/api', '') + url
    }
    return url
  },

  uploadAvatar(filePath) {
    var token = getToken()
    if (!token) {
      return Promise.reject(new Error('请先登录'))
    }
    var that = this
    return new Promise(function(resolve, reject) {
      wx.uploadFile({
        url: BASE_URL + '/attachments:create',
        filePath: filePath,
        name: 'file',
        formData: { t: Date.now() },
        header: {
          'Authorization': 'Bearer ' + token,
          'X-Locale': 'zh-CN',
          'X-Timezone': '+08:00'
        },
        success: function(res) {
          console.log('[uploadAvatar] 响应 statusCode:', res.statusCode)
          console.log('[uploadAvatar] 响应 data:', res.data)
          if (res.statusCode !== 200 && res.statusCode !== 201) {
            reject(new Error('上传失败，状态码：' + res.statusCode))
            return
          }
          try {
            var result = JSON.parse(res.data)
            var attachment = (result && result.data) || result
            var url = attachment.url || attachment.path
            if (!url) {
              console.error('[uploadAvatar] 返回数据格式错误:', attachment)
              reject(new Error('上传失败：返回数据格式错误'))
              return
            }
            var fullUrl = that.resolveImageUrl(url)
            console.log('[uploadAvatar] 原始 URL:', url, '完整 URL:', fullUrl)
            resolve(fullUrl)
          } catch (e) {
            console.error('[uploadAvatar] 响应解析失败:', e)
            reject(new Error('上传失败：响应解析失败'))
          }
        },
        fail: function(err) {
          console.error('[uploadAvatar] 请求失败:', err)
          reject(err)
        }
      })
    })
  },

  onMenuTap(e) {
    var path = e.currentTarget.dataset.path
    var title = e.currentTarget.dataset.title
    if (title === '我的资料') {
      this.setData({ isEditMode: true })
      this.loadReferenceImages()
      if (!this.data.form || Object.keys(this.data.form).length === 0) {
        this.loadProfile()
      } else {
        var scopeTags = this.syncScopeTags(this.data.form.business_scope)
        this.setData({ scopeTags: scopeTags })
      }
      return
    }
    if (title === '审核结果') {
      var userInfo = this.data.userInfo || {}
      var auditResult = userInfo.audit_result || ''
      if (!auditResult) {
        showToast('暂无审核结果')
        return
      }
      wx.showModal({
        title: '审核结果',
        content: auditResult,
        showCancel: false
      })
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
    var value = e.detail.value !== undefined ? e.detail.value : e.detail
    this.setData({ ['form.' + field]: value })
  },

  onUploadChange(e) {
    var field = e.currentTarget.dataset.field
    var files = e.detail.files
    this.setData({ ['form.' + field]: files })
  },

  uploadAttachments(filePaths) {
    console.log('[uploadAttachments] 接收到的文件列表:', filePaths)
    if (!filePaths || filePaths.length === 0) {
      console.log('[uploadAttachments] 文件列表为空，返回 []')
      return Promise.resolve([])
    }
    var token = getToken()
    if (!token) {
      console.warn('[uploadAttachments] 用户未登录，无法上传附件')
      return Promise.reject(new Error('请先登录'))
    }
    console.log('[uploadAttachments] 使用用户 Token 上传')
    return Promise.all(filePaths.map(function(filePath, index) {
      console.log('[uploadAttachments] 开始处理第 ' + (index + 1) + ' 个文件:', filePath)
      return new Promise(function(resolve) {
        if (!filePath) {
          console.log('[uploadAttachments] 第 ' + (index + 1) + ' 个文件为 null，跳过')
          resolve(null)
          return
        }
        if (typeof filePath !== 'string') {
          console.log('[uploadAttachments] 第 ' + (index + 1) + ' 个文件不是字符串，直接取 id:', filePath.id)
          resolve(filePath.id || null)
          return
        }
        wx.uploadFile({
          url: BASE_URL + '/attachments:create',
          filePath: filePath,
          name: 'file',
          formData: { t: Date.now() },
          header: {
            'Authorization': 'Bearer ' + token,
            'X-Locale': 'zh-CN',
            'X-Timezone': '+08:00'
          },
          success: function(res) {
            console.log('[uploadAttachments] 第 ' + (index + 1) + ' 个文件上传响应 statusCode:', res.statusCode)
            console.log('[uploadAttachments] 第 ' + (index + 1) + ' 个文件上传响应 data:', res.data)
            if (res.statusCode !== 200 && res.statusCode !== 201) {
              console.warn('[uploadAttachments] 第 ' + (index + 1) + ' 个文件上传失败，statusCode:', res.statusCode)
              resolve(null)
              return
            }
            try {
              var result = JSON.parse(res.data)
              var attachment = (result && result.data) || result
              console.log('[uploadAttachments] 第 ' + (index + 1) + ' 个文件解析后的 attachment:', attachment)
              console.log('[uploadAttachments] 第 ' + (index + 1) + ' 个文件提取到 id:', attachment.id)
              resolve(attachment.id || null)
            } catch (e) {
              console.error('[uploadAttachments] 第 ' + (index + 1) + ' 个文件响应解析失败:', e)
              resolve(null)
            }
          },
          fail: function(err) {
            console.error('[uploadAttachments] 第 ' + (index + 1) + ' 个文件上传失败:', err)
            resolve(null)
          }
        })
      })
    })).then(function(ids) {
      var filtered = ids.filter(function(id) { return id !== null })
      console.log('[uploadAttachments] 所有文件处理完成，原始 IDs:', ids)
      console.log('[uploadAttachments] 过滤后有效 IDs:', filtered)
      return filtered
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
    form.bank_code_input = item.bank_code
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
    console.log('[onSave] 保存按钮被点击')
    var role = this.data.role
    var form = this.data.form
    var userInfo = this.data.userInfo
    var companyId = this.data.companyId
    if (!userInfo || !userInfo.id) {
      console.warn('[onSave] userInfo 为空，无法保存')
      return
    }

    this.setData({ saving: true })
    showLoading('保存中')

    var that = this

    var doSave = function() {
      console.log('[onSave] 开始执行 doSave')
      var userUpdate = that.buildUserUpdateData(form, role)
      console.log('[onSave] userUpdate:', JSON.stringify(userUpdate))
      userAPI.update(userInfo.id, userUpdate, true).then(function() {
        console.log('[onSave] userAPI.update 成功')
        if (role === 'company' && companyId) {
          var companyUpdate = that.buildCompanyUpdateData(form)
          console.log('[onSave] companyUpdate:', JSON.stringify(companyUpdate))
          companyAPI.update(companyId, companyUpdate, true).then(function() {
            console.log('[onSave] companyAPI.update 成功')
            hideLoading()
            that.setData({ saving: false, isEditMode: false })
            wx.showModal({
              title: '提交成功',
              content: '等待审核通过，管理员联系方式：18650055458',
              showCancel: false,
              success: function() {
                that.loadProfile()
              }
            })
          }).catch(function(err) {
            console.error('[onSave] companyAPI.update 失败:', err)
            hideLoading()
            that.setData({ saving: false })
            showToast(err.message || '企业信息保存失败')
          })
        } else {
          hideLoading()
          that.setData({ saving: false, isEditMode: false })
          wx.showModal({
            title: '提交成功',
            content: '等待审核通过，管理员联系方式：18650055458',
            showCancel: false,
            success: function() {
              that.loadProfile()
            }
          })
        }
      }).catch(function(err) {
        console.error('[onSave] userAPI.update 失败:', err)
        hideLoading()
        that.setData({ saving: false })
        showToast(err.message || '保存失败')
      })
    }

    if (role === 'company') {
      var imgFields = ['annual_revenue_invoiced_image', 'recent_two_year_revenue_image', 'company_debt_image', 'legal_rep_debt_image', 'credit_inquiry_6m_image', 'other_attachment']
      var hasAnyNewFiles = false
      imgFields.forEach(function(field) {
        var files = form[field] || []
        var hasNew = files.some(function(item) { return item && typeof item === 'string' })
        console.log('[onSave] 检查字段', field, '文件列表:', files, '是否有新文件:', hasNew)
        if (hasNew) {
          hasAnyNewFiles = true
        }
      })
      console.log('[onSave] hasAnyNewFiles:', hasAnyNewFiles)
      if (!hasAnyNewFiles) {
        console.log('[onSave] 没有新附件，直接保存')
        doSave()
        return
      }
      var uploadTasks = []
      imgFields.forEach(function(field) {
        var files = form[field] || []
        var newFiles = files.filter(function(item) { return item && typeof item === 'string' })
        var oldItems = files.filter(function(item) { return item && typeof item !== 'string' })
        console.log('[onSave] 字段', field, '新文件:', newFiles, '旧文件:', oldItems)
        if (newFiles.length > 0) {
          uploadTasks.push(that.uploadAttachments(newFiles).then(function(newIds) {
            console.log('[onSave] 字段', field, '上传完成，新 IDs:', newIds)
            var oldIds = oldItems.filter(function(item) { return item.id }).map(function(item) { return item.id })
            var allIds = oldIds.concat(newIds)
            form[field] = allIds.map(function(id) { return { id: id } })
          }))
        }
      })
      console.log('[onSave] uploadTasks 数量:', uploadTasks.length)
      Promise.all(uploadTasks).then(function() {
        console.log('[onSave] 所有附件上传完成，开始保存')
        doSave()
      }).catch(function(err) {
        console.error('[onSave] 附件上传失败:', err)
        hideLoading()
        that.setData({ saving: false })
        showToast('附件上传失败')
      })
      return
    }

    if (role === 'bank' && form.work_proof && form.work_proof.length > 0) {
      var hasNewFiles = form.work_proof.some(function(item) { return typeof item === 'string' })
      console.log('[onSave] bank 角色 work_proof 是否有新文件:', hasNewFiles)
      if (hasNewFiles) {
        that.uploadAttachments(form.work_proof).then(function(newIds) {
          console.log('[onSave] bank 附件上传完成，新 IDs:', newIds)
          var existingIds = form.work_proof
            .filter(function(item) { return typeof item !== 'string' && item.id })
            .map(function(item) { return item.id })
          var allIds = existingIds.concat(newIds)
          form.work_proof = allIds.map(function(id) { return { id: id } })
          doSave()
        }).catch(function(err) {
          console.error('[onSave] bank 附件上传失败:', err)
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
    var currentStatus = (this.data.userInfo && this.data.userInfo.audit_status) || ''
    if (currentStatus === 'unreviewed' || currentStatus === 'rejected') {
      data.audit_status = 'under_review'
    } else if (currentStatus === 'approved') {
      data.audit_status = 'unreviewed'
    }
    return data
  },

  buildCompanyUpdateData(form) {
    var data = {}
    data.company_name = form.company_name
    data.credit_code = form.credit_code
    data.legal_representative = form.legal_representative
    data.contact_phone = form.contact_phone
    if (form.annual_revenue_invoiced !== '' && form.annual_revenue_invoiced !== undefined) data.annual_revenue_invoiced = Number(form.annual_revenue_invoiced)
    if (form.recent_two_year_revenue_uninvoiced !== '' && form.recent_two_year_revenue_uninvoiced !== undefined) data.recent_two_year_revenue_uninvoiced = Number(form.recent_two_year_revenue_uninvoiced)
    data.industry = form.industry
    data.office_address = form.office_address
    data.company_debt_status = form.company_debt_status
    data.legal_rep_debt_status = form.legal_rep_debt_status
    if (form.bank_account_count !== '' && form.bank_account_count !== undefined) data.bank_account_count = Number(form.bank_account_count)
    if (form.overdue_count !== '' && form.overdue_count !== undefined) data.overdue_count = Number(form.overdue_count)
    if (form.debt_count !== '' && form.debt_count !== undefined) data.debt_count = Number(form.debt_count)
    if (form.credit_inquiry_6m !== '' && form.credit_inquiry_6m !== undefined) data.credit_inquiry_6m = Number(form.credit_inquiry_6m)
    if (form.financial_resources_company !== '' && form.financial_resources_company !== undefined) data.financial_resources_company = Number(form.financial_resources_company)
    if (form.financial_resources_legal_rep !== '' && form.financial_resources_legal_rep !== undefined) data.financial_resources_legal_rep = Number(form.financial_resources_legal_rep)
    if (form.loan_requirement) data.loan_requirement = form.loan_requirement
    // 附件字段
    var imgFields = ['annual_revenue_invoiced_image', 'recent_two_year_revenue_image', 'company_debt_image', 'legal_rep_debt_image', 'credit_inquiry_6m_image', 'other_attachment']
    imgFields.forEach(function(field) {
      var files = form[field] || []
      var ids = files.map(function(item) {
        if (!item || typeof item === 'string') return null
        return item.id || null
      }).filter(function(id) { return id !== null })
      if (ids.length > 0) {
        data[field] = ids.map(function(id) { return { id: id } })
      }
    })
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
      bankSearchKeyword: '',
      industryLabel: this.setIndustryLabel(originalForm)
    })
  },

  setIndustryLabel(form) {
    var opts = this.data.industryOptions
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === form.industry) {
        return opts[i].label
      }
    }
    return form.industry || ''
  },

  onShowIndustryPicker() {
    this.setData({ showIndustryPicker: true })
  },

  onCloseIndustryPicker() {
    this.setData({ showIndustryPicker: false })
  },

  onIndustryConfirm(e) {
    var form = this.data.form
    var opts = this.data.industryOptions
    var index = e.detail.index
    var item = opts[index]
    if (item) {
      form.industry = item.value
      this.setData({ form: form, industryLabel: item.label, showIndustryPicker: false })
    }
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
