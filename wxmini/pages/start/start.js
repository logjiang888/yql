const { isLogin, getRole } = require('../../stores/auth')
const { getPagePath } = require('../../utils/util')

Page({
  data: {
    roles: [
      { key: 'company', name: '企业客户', icon: '企' },
      { key: 'bank', name: '银行人员', icon: '银' },
      { key: 'salesperson', name: '业务员', icon: '业' }
    ]
  },

  onLoad() {
    if (isLogin()) {
      const role = getRole()
      wx.reLaunch({ url: getPagePath(role) })
    }
  },

  onSelectRole(e) {
    const { key } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/login/login?role=${key}`
    })
  },

  onTapLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  }
})
