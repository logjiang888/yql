const { isLogin, getRole } = require('../../stores/auth')
const { getPagePath } = require('../../utils/util')

Page({
  onLoad() {
    if (isLogin()) {
      const role = getRole()
      wx.reLaunch({ url: getPagePath(role) })
    } else {
      wx.reLaunch({ url: '/pages/login/login' })
    }
  }
})
