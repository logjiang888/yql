const { isValidPhone, showToast, showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    phone: '',
    code: '',
    password: '',
    confirmPassword: '',
    countdown: 0,
    errorMsg: '',
    errorField: ''
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value !== undefined ? e.detail.value : e.detail
    const updateData = { errorMsg: '', errorField: '' }
    updateData[field] = value
    this.setData(updateData)
  },

  onSendCode() {
    const { phone, countdown } = this.data
    if (countdown > 0) return
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

  onSubmit() {
    const { phone, code, password, confirmPassword } = this.data
    if (!isValidPhone(phone)) {
      this.setData({ errorMsg: '手机号格式不正确', errorField: 'phone' })
      return
    }
    if (!code) {
      this.setData({ errorMsg: '请输入验证码', errorField: 'code' })
      return
    }
    if (password.length < 6) {
      this.setData({ errorMsg: '密码长度不能少于6位', errorField: 'password' })
      return
    }
    if (password !== confirmPassword) {
      this.setData({ errorMsg: '两次输入的密码不一致', errorField: 'confirmPassword' })
      return
    }

    showLoading('重置中')
    setTimeout(() => {
      hideLoading()
      showToast('密码重置成功')
      wx.navigateBack()
    }, 1000)
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer)
  }
})