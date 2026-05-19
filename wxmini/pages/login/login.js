const { setAuth } = require('../../stores/auth')
const { isValidPhone, showError, showLoading, hideLoading, getPagePath } = require('../../utils/util')
const { authAPI, createNocoBaseAPI } = require('../../api/nocobase')
const { LOGIN_ERROR_CODE, AUDIT_STATUS } = require('../../constants/index')

const userAPI = createNocoBaseAPI('users')

const ROLE_TEXT_MAP = {
  company: '企业',
  bank: '银行',
  plat_salesperson: '平台业务员'
}

Page({
  data: {
    role: '',
    roleText: '',
    loginType: 'password',
    phone: '',
    code: '',
    password: '',
    showPassword: false,
    countdown: 0,
    errorMsg: '',
    errorField: ''
  },

  onLoad(options) {
    var role = options.role || ''
    if (role) {
      var roleText = ROLE_TEXT_MAP[role] || ''
      this.setData({ role: role, roleText: roleText })
    }
    if (options.phone) {
      this.setData({ phone: options.phone, loginType: 'password' })
    }
    wx.setNavigationBarTitle({ title: '登录' })
  },

  onRoleChange(e) {
    var role = e.currentTarget.dataset.role
    this.setData({ role: role, errorMsg: '', errorField: '' })
  },

  onSwitchType(e) {
    const type = e.detail.name || e.currentTarget.dataset.type
    this.setData({ loginType: type, errorMsg: '', errorField: '' })
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value !== undefined ? e.detail.value : e.detail
    const updateData = { errorMsg: '', errorField: '' }
    updateData[field] = value
    this.setData(updateData)
  },

  onTogglePassword() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  onSendCode() {
    const { phone, countdown } = this.data
    if (countdown > 0) return
    if (!isValidPhone(phone)) {
      this.setData({ errorMsg: LOGIN_ERROR_CODE.INVALID_PHONE.message, errorField: 'phone' })
      return
    }
    this.startCountdown()
    wx.showToast({ title: '验证码已发送', icon: 'none' })
  },

  startCountdown() {
    this.setData({ countdown: 60 })
    this.timer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) {
        clearInterval(this.timer)
      }
      this.setData({ countdown: next })
    }, 1000)
  },

  onLogin() {
    const { loginType, phone, code, password, role } = this.data
    if (!role) {
      this.setData({ errorMsg: '请先选择用户类型', errorField: '' })
      return
    }
    if (!isValidPhone(phone)) {
      this.setData({ errorMsg: LOGIN_ERROR_CODE.INVALID_PHONE.message, errorField: 'phone' })
      return
    }
    if (loginType === 'code' && !code) {
      this.setData({ errorMsg: LOGIN_ERROR_CODE.INVALID_CODE.message, errorField: 'code' })
      return
    }
    if (loginType === 'password' && !password) {
      this.setData({ errorMsg: LOGIN_ERROR_CODE.INVALID_PASSWORD.message, errorField: 'password' })
      return
    }

    showLoading('登录中')

    const loginData = loginType === 'code'
      ? { account: phone, code }
      : { account: phone, password }

    authAPI.signIn(loginData).then((res) => {
      hideLoading()
      const token = res.data && res.data.token
      const userInfo = res.data && res.data.user
      if (token && userInfo) {
        // 用 admin token 通过 user_id 获取完整用户信息，读取 user_type 判断角色
        userAPI.get(userInfo.id, [], true).then((detailRes) => {
          const fullUserInfo = detailRes.data || {}
          const merged = {}
          for (const k in userInfo) { merged[k] = userInfo[k] }
          for (const k in fullUserInfo) { merged[k] = fullUserInfo[k] }

          // 审核状态校验：只有被禁用的账号不能登录
          const auditStatus = merged.audit_status || ''
          if (auditStatus === 'disabled') {
            this.setData({ errorMsg: '账号已被禁用，请联系管理员', errorField: '' })
            return
          }

          // 角色类型校验：登录角色必须与账号 user_type 一致
          const serverRole = merged.user_type || ''
          if (serverRole !== role) {
            var expectRoleText = ROLE_TEXT_MAP[serverRole] || serverRole
            this.setData({ errorMsg: '账号类型与所选角色不匹配，该账号为' + expectRoleText + '账号', errorField: '' })
            return
          }

          setAuth(token, merged)
          wx.switchTab({ url: getPagePath(serverRole) })
        }).catch(() => {
          setAuth(token, userInfo)
          wx.switchTab({ url: getPagePath('') })
        })
      } else {
        showError('登录失败，请重试')
      }
    }).catch((err) => {
      hideLoading()
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('不存在') || msg.includes('not found') || msg.includes('no user')) {
        this.setData({ errorMsg: LOGIN_ERROR_CODE.USER_NOT_FOUND.message, errorField: 'phone' })
      } else if (msg.includes('密码') || msg.includes('password') || msg.includes('invalid credentials')) {
        this.setData({ errorMsg: LOGIN_ERROR_CODE.INVALID_PASSWORD.message, errorField: 'password' })
      } else if (msg.includes('审核') || msg.includes('pending') || msg.includes('not approved')) {
        this.setData({ errorMsg: LOGIN_ERROR_CODE.ACCOUNT_PENDING.message, errorField: '' })
      } else if (msg.includes('过期') || msg.includes('expired') || msg.includes('unauthorized') || msg.includes('401')) {
        this.setData({ errorMsg: '登录失败，请检查账号密码是否正确', errorField: '' })
      } else {
        this.setData({ errorMsg: err.message || LOGIN_ERROR_CODE.UNKNOWN_ERROR.message })
      }
    })
  },

  onTapRegister() {
    const { role } = this.data
    var url = '/pages/register/register'
    if (role) {
      url += '?role=' + role
    }
    wx.navigateTo({ url: url })
  },

  onTapForgot() {
    wx.navigateTo({ url: '/pages/forgot-password/forgot-password' })
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  }
})
