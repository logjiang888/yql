const { setAuth } = require('../../stores/auth')
const { isValidPhone, showError, showLoading, hideLoading, getPagePath } = require('../../utils/util')
const { authAPI, createNocoBaseAPI } = require('../../api/nocobase')
const { LOGIN_ERROR_CODE, AUDIT_STATUS } = require('../../constants/index')

const userAPI = createNocoBaseAPI('users')

Page({
  data: {
    role: '',
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
    if (options.role) {
      this.setData({ role: options.role })
    }
    if (options.phone) {
      this.setData({ phone: options.phone, loginType: 'password' })
    }
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
    const { loginType, phone, code, password } = this.data
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

          // 审核状态校验
          const auditStatus = merged.audit_status || ''
          if (auditStatus === AUDIT_STATUS.UNREVIEWED || auditStatus === AUDIT_STATUS.UNDER_REVIEW) {
            this.setData({ errorMsg: LOGIN_ERROR_CODE.ACCOUNT_PENDING.message, errorField: '' })
            return
          }
          if (auditStatus === AUDIT_STATUS.REJECTED) {
            this.setData({ errorMsg: LOGIN_ERROR_CODE.ACCOUNT_REJECTED.message, errorField: '' })
            return
          }

          setAuth(token, merged)
          const role = merged.user_type || ''
          wx.switchTab({ url: getPagePath(role) })
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
    const url = role ? `/pages/register/register?role=${role}` : '/pages/register/register'
    wx.navigateTo({ url })
  },

  onTapForgot() {
    wx.navigateTo({ url: '/pages/forgot-password/forgot-password' })
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  }
})
