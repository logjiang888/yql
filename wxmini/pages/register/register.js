const { request, ADMIN_TOKEN } = require('../../api/nocobase')
const { isValidPhone, showToast, showLoading, hideLoading } = require('../../utils/util')
const { setAuth } = require('../../stores/auth')
const Toast = require('@vant/weapp/toast/toast').default

const toastError = (message) => {
  Toast({ type: 'fail', message, duration: 2500, position: 'middle' })
}

const usersAPI = {
  list(params) {
    return request({ url: '/users:list', method: 'GET', data: params })
  },
  create(data) {
    return request({ url: '/users:create', method: 'POST', data: data })
  }
}

const companyAPI = {
  create(data) {
    return request({ url: '/company_info:create', method: 'POST', data: data })
  }
}

Page({
  data: {
    role: 'company',
    agreed: false,
    showAuditPopup: false,
    errorField: '',
    form: {
      phone: '',
      password: '',
      confirm_password: ''
    }
  },

  onLoad(options) {
    const role = options.role || 'company'
    this.setData({ role })
    wx.setNavigationBarTitle({ title: '注册账号' })
  },

  onRoleChange(e) {
    const role = e.currentTarget.dataset.role
    this.setData({ role, errorField: '' })
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value !== undefined ? e.detail.value : e.detail
    this.setData({ ['form.' + field]: value, errorField: '' })
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  onTapProtocol() {
    wx.navigateTo({ url: '/pages/protocol/protocol?from=register' })
  },

  onGoLogin() {
    wx.redirectTo({ url: '/pages/login/login' })
  },

  onCloseAuditPopup() {
    this.setData({ showAuditPopup: false })
  },

  onCopyPhone() {
    wx.setClipboardData({
      data: '18650055458',
      success: () => {
        showToast('已复制到剪贴板')
      }
    })
  },

  validateForm() {
    const { form, agreed } = this.data

    if (!agreed) {
      return { valid: false, msg: '请先同意用户注册协议' }
    }
    if (!form.phone) {
      return { valid: false, msg: '请输入手机号码', field: 'phone' }
    }
    if (!isValidPhone(form.phone)) {
      return { valid: false, msg: '手机号格式不正确', field: 'phone' }
    }
    if (!form.password) {
      return { valid: false, msg: '请输入登录密码', field: 'password' }
    }
    if (form.password.length < 6) {
      return { valid: false, msg: '密码长度不能少于6位', field: 'password' }
    }
    if (!form.confirm_password) {
      return { valid: false, msg: '请再次输入密码', field: 'confirm_password' }
    }
    if (form.password !== form.confirm_password) {
      return { valid: false, msg: '两次输入的密码不一致', field: 'confirm_password' }
    }

    return { valid: true }
  },

  checkPhoneExists(phone) {
    return usersAPI.list({
      filter: JSON.stringify({ phone: { $eq: phone } }),
      pageSize: 1
    }).then((res) => {
      const list = (res && res.data) || []
      if (list.length > 0) {
        return { valid: false, msg: '该手机号已注册', field: 'phone' }
      }
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
    const phone = form.phone
    const password = form.password

    // user_type 映射
    const userTypeMap = {
      company: 'company',
      bank: 'bank',
      salesperson: 'plat_salesperson'
    }

    showLoading('提交中')

    this.checkPhoneExists(phone).then((checkResult) => {
      if (!checkResult.valid) {
        hideLoading()
        toastError(checkResult.msg)
        this.setData({ errorField: checkResult.field || '' })
        return
      }

      return usersAPI.create({
        username: phone,
        phone: phone,
        password: password,
        nickname: phone,
        user_type: userTypeMap[role] || role
      }).then((res) => {
        const userId = (res && res.data && res.data.id) || (res && res.id)
        console.log('[注册] 用户创建成功，userId:', userId)

        // 企业客户注册时，同步创建空的 company_info 记录（只填 user_id）
        if (role === 'company' && userId) {
          console.log('[注册] 企业客户，创建 company_info，user_id:', userId)
          return companyAPI.create({
            user_id: userId
          }).then(() => {
            console.log('[注册] company_info 创建成功')
            hideLoading()
            this.setData({ showAuditPopup: true })
          }).catch((err) => {
            console.error('[注册] company_info 创建失败:', err)
            // company_info 创建失败不影响注册主流程，仍提示成功
            hideLoading()
            this.setData({ showAuditPopup: true })
          })
        } else {
          hideLoading()
          this.setData({ showAuditPopup: true })
        }
      })
    }).catch((err) => {
      hideLoading()
      console.error('[注册] 失败:', err)
      const msg = err && err.message ? err.message : '注册失败，请重试'
      toastError(msg)
    })
  }
})
