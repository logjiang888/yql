const formatTime = (date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${formatNumber(date.getMonth() + 1)}-${formatNumber(date.getDate())}`
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${formatNumber(date.getMonth() + 1)}-${formatNumber(date.getDate())} ${formatNumber(date.getHours())}:${formatNumber(date.getMinutes())}`
}

const formatNumber = (n) => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const debounce = (fn, delay = 500) => {
  let timer = null
  return function () {
    const args = Array.prototype.slice.call(arguments)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

const throttle = (fn, interval = 300) => {
  let last = 0
  return function () {
    const args = Array.prototype.slice.call(arguments)
    const now = Date.now()
    if (now - last >= interval) {
      last = now
      fn.apply(this, args)
    }
  }
}

const showToast = (title, icon = 'none') => {
  wx.showToast({ title, icon, duration: 2000 })
}

const showError = (title) => {
  wx.showToast({ title, icon: 'error', duration: 2000 })
}

const showLoading = (title = '加载中') => {
  wx.showLoading({ title, mask: true })
}

const hideLoading = () => {
  wx.hideLoading()
}

const storage = {
  set(key, value) {
    try {
      wx.setStorageSync(key, value)
      return true
    } catch (e) {
      return false
    }
  },
  get(key, defaultValue = null) {
    try {
      return wx.getStorageSync(key) || defaultValue
    } catch (e) {
      return defaultValue
    }
  },
  remove(key) {
    try {
      wx.removeStorageSync(key)
    } catch (e) {}
  },
  clear() {
    try {
      wx.clearStorageSync()
    } catch (e) {}
  }
}

const isValidPhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone)
}

const maskPhone = (phone) => {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

const maskCreditCode = (code) => {
  if (!code || code.length < 8) return code
  return `${code.slice(0, 4)}********${code.slice(-4)}`
}

const getPagePath = (role) => {
  switch (role) {
    case 'company': return '/pages/home/home'
    case 'bank': return '/pages/home-bank/home-bank'
    case 'plat_salesperson': return '/pages/home-bank/home-bank'
    default: return '/pages/home/home'
  }
}

const checkAuditInterceptor = function() {
  // 延迟 require 避免与 stores/auth.js 的循环依赖（auth.js 也 require 了 util.js 的 storage）
  var getUserInfo = require('../stores/auth').getUserInfo
  var userInfo = getUserInfo()
  if (!userInfo) return false
  if (userInfo.audit_status === 'approved') return true

  wx.showModal({
    title: '提示',
    content: '请您到我的->我的资料模块中完善个人资料，等待审核通过激活',
    showCancel: false
  })
  return false
}

module.exports = {
  formatTime,
  formatDate,
  formatDateTime,
  formatNumber,
  debounce,
  throttle,
  showToast,
  showError,
  showLoading,
  hideLoading,
  storage,
  isValidPhone,
  maskPhone,
  maskCreditCode,
  getPagePath,
  checkAuditInterceptor
}
