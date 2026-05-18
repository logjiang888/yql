const { createNocoBaseAPI, authAPI, BASE_URL, request, ADMIN_TOKEN } = require('../../api/nocobase')
const { isValidPhone, showToast, showLoading, hideLoading } = require('../../utils/util')
const { REGISTER_ERROR_CODE, ROLES } = require('../../constants/index')
const { setAuth, getToken } = require('../../stores/auth')
const Toast = require('@vant/weapp/toast/toast').default

const toastError = (message) => {
  Toast({ type: 'fail', message, duration: 2500, position: 'middle' })
}

const bankAPI = createNocoBaseAPI('dim_bank_info')
const configAPI = createNocoBaseAPI('dim_data_config')
const companyAPI = createNocoBaseAPI('company_info')
const usersAPI = createNocoBaseAPI('users')

Page({
  data: {
    role: 'company',
    bankList: [],
    bankColumns: [],
    referenceImages: {},
    agreed: false,
    countdown: 0,
    showBankPicker: false,
    showBankCodePicker: false,
    showIndustryPicker: false,
    industryLabel: '',
    bankSearchKeyword: '',
    bankSearchList: [],
    errorMsg: '',
    errorField: '',

    form: {
      company_name: '',
      credit_code: '',
      legal_representative: '',
      contact_phone: '',
      annual_revenue_invoiced_image: [],
      recent_two_year_revenue_image: [],
      other_attachment: [],
      company_debt_image: [],
      legal_rep_debt_image: [],
      credit_inquiry_6m_image: [],

      annual_revenue_invoiced: '',
      recent_two_year_revenue_uninvoiced: '',
      office_address: '',
      company_debt_status: '',
      legal_rep_debt_status: '',
      bank_account_count: '',
      overdue_count: '',
      debt_count: '',
      credit_inquiry_6m: '',
      industry: '',
      financial_resources_company: '',
      financial_resources_legal_rep: '',
      loan_requirement: '',

      name: '',
      bank_id: '',
      bank_name: '',
      bank_code: '',
      bank_code_input: '',
      branch_name: '',
      position: '',
      work_years: '',
      business_scope: [],
      work_proof: [],
      products: '',

      org_name: '',
      phone: '',
      code: '888888',
      password: '',
      confirm_password: ''
    },

    scopeTags: [
      { name: '对公', checked: false },
      { name: '税贷', checked: false },
      { name: '科技贷', checked: false },
      { name: '抵押贷', checked: false },
      { name: '流水贷', checked: false },
      { name: '贷抵贷', checked: false },
      { name: '房抵贷', checked: false },
      { name: '设备贷', checked: false }
    ],
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

  onLoad(options) {
    const role = options.role || 'company'
    this.setData({ role })
    this.updateNavTitle(role)
    if (role === 'bank') {
      this.loadBankList()
    }
    if (role === 'company') {
      this.loadReferenceImages()
    }
  },

  updateNavTitle(role) {
    const titleMap = {
      company: '企业注册',
      bank: '银行人员注册',
      salesperson: '业务员注册'
    }
    wx.setNavigationBarTitle({ title: titleMap[role] || '注册' })
  },

  loadBankList() {
    console.log('[loadBankList] 开始加载银行列表')
    return bankAPI.list({ pageSize: 1000 }, true).then((res) => {
      console.log('[loadBankList] API 原始返回:', JSON.stringify(res).slice(0, 500))
      let rawList = []
      if (res && Array.isArray(res.data)) {
        rawList = res.data
      } else if (res && res.data && Array.isArray(res.data.data)) {
        rawList = res.data.data
      } else if (Array.isArray(res)) {
        rawList = res
      }
      console.log('[loadBankList] 原始数据条数:', rawList.length)
      const validBanks = rawList
        .filter(item => item && (item.bank_name || item.bankName) && (item.bank_code != null || item.bankCode != null))
        .map(item => ({
          id: item.id,
          bank_name: item.bank_name || item.bankName,
          bank_code: String(item.bank_code ?? item.bankCode ?? '')
        }))
      console.log('[loadBankList] 有效数据条数:', validBanks.length)
      if (validBanks.length > 0) {
        console.log('[loadBankList] 第一条示例:', validBanks[0])
      }
      const bankColumns = validBanks.map(item => item.bank_name)
      this.setData({ bankList: validBanks, bankColumns, bankSearchList: validBanks })
      return validBanks
    }).catch((err) => {
      console.error('[loadBankList] 加载银行列表失败:', err)
      this.setData({ bankList: [], bankColumns: [], bankSearchList: [] })
      return []
    })
  },

  loadReferenceImages() {
    configAPI.list({ filter: { data_type: { $eq: 'image' } }, pageSize: 50 }).then((res) => {
      const items = res.data || []
      const refs = {}
      const baseUrl = BASE_URL.replace('/api', '')
      items.forEach(item => {
        let url = item.data_url || ''
        if (url && url.indexOf('/storage/') === 0) {
          url = baseUrl + url
        }
        refs[item.data_code] = url
      })
      this.setData({ referenceImages: refs })
    })
  },

  onRoleChange(e) {
    const role = e.detail.name
    this.setData({ role, errorMsg: '', errorField: '' })
    this.updateNavTitle(role)
    if (role === 'bank' && this.data.bankList.length === 0) {
      this.loadBankList()
    }
    if (role === 'company' && Object.keys(this.data.referenceImages).length === 0) {
      this.loadReferenceImages()
    }
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value !== undefined ? e.detail.value : e.detail
    const { form } = this.data
    form[field] = value
    this.setData({ form, errorMsg: '', errorField: '' })
  },

  onShowBankPicker() {
    this.setData({ showBankPicker: true })
  },

  onCloseBankPicker() {
    this.setData({ showBankPicker: false })
  },

  onBankConfirm(e) {
    const { bankList, form } = this.data
    const index = e.detail.index
    const bank = bankList[index]
    if (bank) {
      form.bank_id = bank.id
      form.bank_name = bank.bank_name
      this.setData({ form, showBankPicker: false })
    }
  },

  onShowBankCodePicker() {
    // 保留备用：直接打开弹窗展示全部数据
    const { bankList } = this.data
    this.setData({
      showBankCodePicker: true,
      bankSearchKeyword: '',
      bankSearchList: bankList
    })
    if (bankList.length === 0) {
      showLoading('加载银行数据中')
      this.loadBankList().then((list) => {
        hideLoading()
        this.setData({ bankSearchList: list })
      }).catch((err) => {
        hideLoading()
        console.error('[onShowBankCodePicker] 加载失败:', err)
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      })
    }
  },

  onCloseBankCodePicker() {
    this.setData({ showBankCodePicker: false, bankSearchKeyword: '' })
  },

  onBankCodeSearch() {
    const { form } = this.data
    const keyword = (form.bank_code_input || '').trim()
    if (!keyword) {
      showToast('先输入银行联行号')
      return
    }
    this.doBankCodeFilter(keyword)
  },

  doBankCodeFilter(keyword) {
    const filter = { bank_code: { $includes: keyword } }
    console.log('[doBankCodeFilter] API filter:', JSON.stringify(filter))
    showLoading('搜索中')
    bankAPI.list({ pageSize: 100, filter }, true).then((res) => {
      hideLoading()
      let rawList = []
      if (res && Array.isArray(res.data)) {
        rawList = res.data
      } else if (res && res.data && Array.isArray(res.data.data)) {
        rawList = res.data.data
      } else if (Array.isArray(res)) {
        rawList = res
      }
      console.log('[doBankCodeFilter] 后端返回条数:', rawList.length)
      const bankSearchList = rawList
        .filter(item => item && (item.bank_name || item.bankName) && (item.bank_code != null || item.bankCode != null))
        .map(item => ({
          id: item.id,
          bank_name: item.bank_name || item.bankName,
          bank_code: String(item.bank_code ?? item.bankCode ?? '')
        }))
      console.log('[doBankCodeFilter] 有效匹配结果:', bankSearchList.length)
      this.setData({
        showBankCodePicker: true,
        bankSearchList,
        bankSearchKeyword: keyword
      })
    }).catch((err) => {
      hideLoading()
      console.error('[doBankCodeFilter] 后端搜索失败:', err)
      wx.showToast({ title: '搜索失败，请重试', icon: 'none' })
    })
  },

  onBankSelect(e) {
    const item = e.currentTarget.dataset.item
    const { form } = this.data
    form.bank_id = item.id
    form.bank_name = item.bank_name
    form.bank_code = item.bank_code
    form.bank_code_input = item.bank_name
    this.setData({
      form,
      showBankCodePicker: false,
      bankSearchKeyword: '',
      bankSearchList: this.data.bankList
    })
  },

  onShowIndustryPicker() {
    this.setData({ showIndustryPicker: true })
  },

  onCloseIndustryPicker() {
    this.setData({ showIndustryPicker: false })
  },

  onIndustryConfirm(e) {
    const { form, industryOptions } = this.data
    const index = e.detail.index
    const item = industryOptions[index]
    if (item) {
      form.industry = item.value
      this.setData({ form, industryLabel: item.label, showIndustryPicker: false })
    }
  },

  onScopeToggle(e) {
    const name = e.currentTarget.dataset.name
    console.log('[onScopeToggle] clicked, name:', name)
    const scopeTags = this.data.scopeTags.map(tag => {
      if (tag.name !== name) return tag
      const newTag = {}
      for (const k in tag) { newTag[k] = tag[k] }
      newTag.checked = !tag.checked
      return newTag
    })
    const business_scope = scopeTags.filter(t => t.checked).map(t => t.name)
    console.log('[onScopeToggle] newScope:', business_scope)
    this.setData({ scopeTags, 'form.business_scope': business_scope })
  },

  onUploadChange(e) {
    const { field } = e.currentTarget.dataset
    const { form } = this.data
    form[field] = e.detail.files
    const newForm = {}
    for (const k in form) { newForm[k] = form[k] }
    this.setData({ form: newForm })
  },

  onPreviewSample(e) {
    const { code } = e.currentTarget.dataset
    const url = this.data.referenceImages[code]
    if (!url) {
      wx.showToast({ title: '暂无样例图', icon: 'none' })
      return
    }
    wx.previewImage({ urls: [url], current: url })
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed, errorMsg: '' })
  },

  onTapProtocol() {
    wx.navigateTo({ url: `/pages/protocol/protocol?role=${this.data.role}&from=register` })
  },

  onSendCode() {
    const { form, countdown } = this.data
    if (countdown > 0) return
    const phone = form.phone || form.contact_phone
    if (!isValidPhone(phone)) {
      this.setData({ errorMsg: '手机号格式不正确', errorField: 'phone' })
      return
    }
    this.startCountdown()
    showToast('验证码已发送')
  },

  startCountdown() {
    this.setData({ countdown: 60 })
    this.timer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) clearInterval(this.timer)
      this.setData({ countdown: next })
    }, 1000)
  },

  validateForm() {
    const { role, form, agreed } = this.data
    if (!agreed) {
      return { valid: false, msg: REGISTER_ERROR_CODE.PROTOCOL_REQUIRED.message }
    }

    if (role === 'company') {
      if (!form.company_name) return { valid: false, msg: '请输入企业名称', field: 'company_name' }
      if (!form.credit_code) return { valid: false, msg: '请输入统一信用代码', field: 'credit_code' }
      if (!form.legal_representative) return { valid: false, msg: '请输入法人姓名', field: 'legal_representative' }
      if (!isValidPhone(form.contact_phone)) return { valid: false, msg: '联系人手机号格式不正确', field: 'contact_phone' }
      if (form.password.length < 6) return { valid: false, msg: '密码长度不能少于6位', field: 'password' }
      if (form.password !== form.confirm_password) return { valid: false, msg: '两次输入的密码不一致', field: 'confirm_password' }
    }

    if (role === 'bank') {
      if (!form.name) return { valid: false, msg: '请输入姓名', field: 'name' }
      if (!form.bank_id) return { valid: false, msg: '请选择银行联行号', field: 'bank_id' }
      if (!form.bank_code || !/^\d{12}$/.test(form.bank_code)) return { valid: false, msg: '请选择有效的12位银行联行号', field: 'bank_id' }
      if (!form.phone) return { valid: false, msg: '请输入手机号', field: 'phone' }
      if (!isValidPhone(form.phone)) return { valid: false, msg: '手机号格式不正确', field: 'phone' }
      // TODO: 开通短信网关后恢复验证码校验
      // if (!form.code) return { valid: false, msg: '请输入验证码', field: 'code' }
      if (form.password.length < 6) return { valid: false, msg: '密码长度不能少于6位', field: 'password' }
      if (form.password !== form.confirm_password) return { valid: false, msg: '两次输入的密码不一致', field: 'confirm_password' }
    }

    if (role === 'salesperson') {
      if (!form.name) return { valid: false, msg: '请输入姓名', field: 'name' }
      if (!form.phone) return { valid: false, msg: '请输入手机号', field: 'phone' }
      if (!isValidPhone(form.phone)) return { valid: false, msg: '手机号格式不正确', field: 'phone' }
      // TODO: 开通短信网关后恢复验证码校验
      // if (!form.code) return { valid: false, msg: '请输入验证码', field: 'code' }
      if (form.password.length < 6) return { valid: false, msg: '密码长度不能少于6位', field: 'password' }
      if (form.password !== form.confirm_password) return { valid: false, msg: '两次输入的密码不一致', field: 'confirm_password' }
    }

    return { valid: true }
  },

  checkCompanyUniqueness(form) {
    console.log('[预检] 开始唯一性校验', {
      contact_phone: form.contact_phone,
      credit_code: form.credit_code,
      company_name: form.company_name
    })
    return Promise.all([
      usersAPI.list({ filter: { phone: { $eq: form.contact_phone } }, pageSize: 1 }),
      companyAPI.list({ filter: { credit_code: { $eq: form.credit_code } }, pageSize: 1 }),
      companyAPI.list({ filter: { company_name: { $eq: form.company_name } }, pageSize: 1 })
    ]).then(([phoneRes, creditRes, nameRes]) => {
      console.log('[预检] users.phone 结果:', JSON.stringify(phoneRes))
      console.log('[预检] company_info.credit_code 结果:', JSON.stringify(creditRes))
      console.log('[预检] company_info.company_name 结果:', JSON.stringify(nameRes))
      if (phoneRes.data && phoneRes.data.length > 0) {
        console.warn('[预检] 命中: 手机号已注册')
        return { valid: false, msg: REGISTER_ERROR_CODE.PHONE_EXISTS.message, field: 'contact_phone' }
      }
      if (creditRes.data && creditRes.data.length > 0) {
        console.warn('[预检] 命中: 信用代码已注册')
        return { valid: false, msg: REGISTER_ERROR_CODE.CREDIT_CODE_EXISTS.message, field: 'credit_code' }
      }
      if (nameRes.data && nameRes.data.length > 0) {
        console.warn('[预检] 命中: 企业名称已注册')
        return { valid: false, msg: REGISTER_ERROR_CODE.COMPANY_NAME_EXISTS.message, field: 'company_name' }
      }
      console.log('[预检] 通过, 可以提交')
      return { valid: true }
    })
  },

  checkUserUniqueness(phone) {
    console.log('[预检] 开始用户唯一性校验, phone=', phone)
    return usersAPI.list({ filter: { phone: { $eq: phone } }, pageSize: 1 }).then((res) => {
      console.log('[预检] users.phone 结果:', JSON.stringify(res))
      if (res.data && res.data.length > 0) {
        console.warn('[预检] 命中: 手机号已注册')
        return { valid: false, msg: REGISTER_ERROR_CODE.PHONE_EXISTS.message, field: 'phone' }
      }
      console.log('[预检] 通过, 可以提交')
      return { valid: true }
    })
  },

  onSubmit() {
    const result = this.validateForm()
    if (!result.valid) {
      toastError(result.msg)
      this.setData({ errorField: result.field || '' })
      return
    }

    const { role, form } = this.data
    showLoading('校验中')

    const checkPromise = role === 'company'
      ? this.checkCompanyUniqueness(form)
      : this.checkUserUniqueness(form.phone)

    checkPromise.then((checkResult) => {
      if (!checkResult.valid) {
        hideLoading()
        toastError(checkResult.msg)
        this.setData({ errorField: checkResult.field || '' })
        return
      }

      showLoading('提交中')
      if (role === 'company') {
        this.registerCompany(form)
      } else {
        this.registerUser(role, form)
      }
    }).catch((err) => {
      hideLoading()
      console.error('[注册] 唯一性校验失败:', err)
      toastError(err.message || '校验失败,请重试')
    })
  },

  uploadAttachments(filePaths) {
    console.log('[uploadAttachments] 接收到的文件列表:', filePaths)
    if (!filePaths || filePaths.length === 0) {
      console.log('[uploadAttachments] 文件列表为空，返回 []')
      return Promise.resolve([])
    }
    const token = ADMIN_TOKEN
    console.log('[uploadAttachments] 使用 ADMIN_TOKEN 上传')
    return Promise.all(filePaths.map((filePath, index) => {
      console.log(`[uploadAttachments] 开始上传第 ${index + 1} 个文件:`, filePath)
      return new Promise((resolve) => {
        wx.uploadFile({
          url: `${BASE_URL}/attachments:create`,
          filePath,
          name: 'file',
          formData: { t: Date.now() },
          header: { 'Authorization': `Bearer ${token}`, 'X-Role': 'root' },
          success: (res) => {
            console.log(`[uploadAttachments] 第 ${index + 1} 个文件上传响应 statusCode:`, res.statusCode)
            console.log(`[uploadAttachments] 第 ${index + 1} 个文件上传响应 data:`, res.data)
            if (res.statusCode !== 200 && res.statusCode !== 201) {
              console.warn(`[uploadAttachments] 第 ${index + 1} 个文件上传失败，statusCode:`, res.statusCode)
              resolve(null)
              return
            }
            try {
              const result = JSON.parse(res.data)
              const attachment = (result && result.data) || result
              console.log(`[uploadAttachments] 第 ${index + 1} 个文件解析后的 attachment:`, attachment)
              console.log(`[uploadAttachments] 第 ${index + 1} 个文件提取到 id:`, attachment.id)
              resolve(attachment.id)
            } catch (e) {
              console.error(`[uploadAttachments] 第 ${index + 1} 个文件响应解析失败:`, e)
              resolve(null)
            }
          },
          fail: (err) => {
            console.error(`[uploadAttachments] 第 ${index + 1} 个文件上传失败:`, err)
            resolve(null)
          }
        })
      })
    })).then(ids => {
      const filtered = ids.filter(id => id !== null)
      console.log('[uploadAttachments] 所有文件上传完成，原始 IDs:', ids)
      console.log('[uploadAttachments] 过滤后有效 IDs:', filtered)
      return filtered
    })
  },

  registerCompany(form) {
    const phone = form.contact_phone
    const password = form.password
    console.log('[注册] 开始创建用户, phone=', phone)

    request({
      url: '/users:create',
      method: 'POST',
      data: {
        username: phone,
        phone,
        password,
        nickname: form.legal_representative
      }
    }).then((res) => {
      console.log('[注册] users:create 响应:', JSON.stringify(res))
      const userId = (res.data && res.data.id) || res.id
      console.log('[注册] 提取 userId:', userId)
      if (!userId) throw new Error('用户创建失败: 未返回 userId')

      return userId
    }).then((userId) => {
      console.log('[注册] 进入附件上传阶段, userId=', userId)
      console.log('[注册] 表单附件字段值:', {
        annual_revenue_invoiced_image: form.annual_revenue_invoiced_image,
        recent_two_year_revenue_image: form.recent_two_year_revenue_image,
        other_attachment: form.other_attachment
      })

      return Promise.all([
        this.uploadAttachments(form.annual_revenue_invoiced_image),
        this.uploadAttachments(form.recent_two_year_revenue_image),
        this.uploadAttachments(form.other_attachment),
        this.uploadAttachments(form.company_debt_image),
        this.uploadAttachments(form.legal_rep_debt_image),
        this.uploadAttachments(form.credit_inquiry_6m_image)
      ]).then(([ticketIds, noTicketIds, otherIds, companyDebtIds, legalRepDebtIds, creditInquiryIds]) => {
        console.log('[注册] 附件上传结果:', { ticketIds, noTicketIds, otherIds, companyDebtIds, legalRepDebtIds, creditInquiryIds })
        const toNum = (v) => {
          if (v === '' || v === null || v === undefined) return undefined
          const n = Number(v)
          return isNaN(n) ? undefined : n
        }
        const companyData = {
          user_id: userId,
          company_name: form.company_name,
          credit_code: form.credit_code,
          legal_representative: form.legal_representative,
          contact_phone: form.contact_phone,
          annual_revenue_invoiced: toNum(form.annual_revenue_invoiced),
          recent_two_year_revenue_uninvoiced: toNum(form.recent_two_year_revenue_uninvoiced),
          office_address: form.office_address,
          company_debt_status: form.company_debt_status,
          legal_rep_debt_status: form.legal_rep_debt_status,
          bank_account_count: toNum(form.bank_account_count),
          overdue_count: toNum(form.overdue_count),
          debt_count: toNum(form.debt_count),
          credit_inquiry_6m: toNum(form.credit_inquiry_6m),
          industry: form.industry,
          financial_resources_company: toNum(form.financial_resources_company),
          financial_resources_legal_rep: toNum(form.financial_resources_legal_rep),
          loan_requirement: form.loan_requirement || undefined,
          annual_revenue_invoiced_image: ticketIds.map(id => ({ id })),
          recent_two_year_revenue_image: noTicketIds.map(id => ({ id })),
          other_attachment: otherIds.map(id => ({ id })),
          company_debt_image: companyDebtIds.map(id => ({ id })),
          legal_rep_debt_image: legalRepDebtIds.map(id => ({ id })),
          credit_inquiry_6m_image: creditInquiryIds.map(id => ({ id })),
          audit_status: '1'
        }
        console.log('[注册] company_info:create 请求体:', JSON.stringify(companyData))
        console.log('[注册] 开始 company_info:create')
        return request({
          url: '/company_info:create',
          method: 'POST',
          data: companyData
        }).then((createRes) => {
          console.log('[注册] company_info:create 响应:', JSON.stringify(createRes))
          return userId
        })
      })
    }).then(() => {
      console.log('[注册] 用户和企业信息已创建, 开始 signIn')
      return authAPI.signIn({ account: phone, password }).then((signInRes) => {
        console.log('[注册] signIn 响应:', JSON.stringify(signInRes))
        const signInToken = signInRes.data && signInRes.data.token
        const signInUserInfo = signInRes.data && signInRes.data.user
        if (signInToken && signInUserInfo) {
          setAuth(signInToken, signInUserInfo)
          console.log('[注册] token 已写入 store')
        } else {
          console.warn('[注册] signIn 未返回 token 或 userInfo')
        }
      }).catch((signInErr) => {
        console.warn('[注册] signIn 失败(不影响注册):', signInErr.message)
      })
    }).then(() => {
      console.log('[注册] 流程完成, 显示成功弹窗')
      hideLoading()
      wx.showModal({
        title: '注册成功',
        content: '企业注册已成功，请登录',
        showCancel: false,
        success: () => {
          wx.redirectTo({ url: '/pages/login/login?role=company&phone=' + phone })
        }
      })
    }).catch((err) => {
      console.error('[注册] 流程异常中断:', err)
      hideLoading()
      const msg = this.mapRegisterError(err, 'company')
      toastError(msg.text)
      if (msg.field) this.setData({ errorField: msg.field })
    })
  },

  registerUser(role, form) {
    const phone    = form.phone    || ''
    const password = form.password || ''
    const realName = form.name     || ''
    // 后端 enum: company / bank / plat_salesperson
    const userType = role === 'salesperson' ? 'plat_salesperson' : (role || '')

    // 先上传工作证明附件
    const uploadPromise = (form.work_proof && form.work_proof.length > 0)
      ? this.uploadAttachments(form.work_proof)
      : Promise.resolve([])

    uploadPromise.then((proofIds) => {
      // 必填基础字段
      const payload = {
        username:  phone,
        phone:     phone,
        password:  password,
        nickname:  realName,
        real_name: realName,
        user_type: userType
      }

      // 可选字段——只在有值时写入，避免给 varchar/int4 列发送空串导致校验失败
      if (form.position) {
        payload.position = form.position
      }
      if (form.products) {
        payload.published_products = form.products
      }
      // business_scope 在数据库中是 varchar(255)，所以前端复选框结果需要 join 成逗号分隔字符串
      if (Array.isArray(form.business_scope) && form.business_scope.length > 0) {
        payload.business_scope = form.business_scope.join(',')
      }
      // work_years 在数据库中是 int4，需要转成数字；空串/非法值直接跳过
      if (form.work_years !== '' && form.work_years != null) {
        const n = parseInt(form.work_years, 10)
        if (!isNaN(n) && n >= 0) {
          payload.work_years = n
        }
      }
      // 银行人员才有 bank_id
      if (role === 'bank' && form.bank_id) {
        payload.bank_id = form.bank_id
      }
      // 工作证明附件——后端支持关联格式 [{id}, {id}]
      if (proofIds.length > 0) {
        payload.work_proof = proofIds.map(id => ({ id }))
      }

      console.log('[registerUser] 请求体:', JSON.stringify(payload))

      // 直接传字段（不加 values 包裹），POST 请求会自动带上 DEFAULT_HEADERS + WRITE_HEADERS
      return request({
        url: '/users:create',
        method: 'POST',
        data: payload
      })
    }).then((res) => {
      console.log('[registerUser] 响应:', JSON.stringify(res))
      hideLoading()
      wx.showModal({
        title: '提交成功',
        content: '注册申请已提交，等待后台审核通过后方可登录',
        showCancel: false,
        success: () => {
          wx.redirectTo({ url: `/pages/login/login?role=${role}&phone=${phone}` })
        }
      })
    }).catch((err) => {
      hideLoading()
      console.error('[registerUser] 错误:', err)
      const msg = this.mapRegisterError(err, role)
      toastError(msg.text)
      if (msg.field) this.setData({ errorField: msg.field })
    })
  },

  mapRegisterError(err, role) {
    const message = err && err.message ? err.message : ''
    const phoneField = role === 'company' ? 'contact_phone' : 'phone'
    if (message.includes('已存在') || (message.includes('phone') && message.includes('exist'))) {
      return { text: REGISTER_ERROR_CODE.PHONE_EXISTS.message, field: phoneField }
    }
    if (message.includes('credit_code') || message.includes('信用代码')) {
      return { text: REGISTER_ERROR_CODE.CREDIT_CODE_EXISTS.message, field: 'credit_code' }
    }
    if (message.includes('company_name') || message.includes('企业名称')) {
      return { text: REGISTER_ERROR_CODE.COMPANY_NAME_EXISTS.message, field: 'company_name' }
    }
    if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
      return { text: '当前账号没有注册权限,请联系管理员', field: '' }
    }
    if (message.includes('400')) {
      return { text: '注册信息有误,请检查后重试', field: '' }
    }
    if (message.includes('登录已过期')) {
      return { text: '登录已过期,请重新进入', field: '' }
    }
    return { text: message || '注册失败,请重试', field: '' }
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  }
})