const { createNocoBaseAPI } = require('../../api/nocobase')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

const configAPI = createNocoBaseAPI('dim_data_config')

Page({
  data: {
    loading: true,
    appName: '银企直聊',
    content: ''
  },

  onLoad() {
    var app = getApp()
    var appName = (app && app.globalData && app.globalData.appName) || wx.getStorageSync('appName') || '银企直聊'
    this.setData({ appName: appName })
    wx.setNavigationBarTitle({ title: appName })
    this.loadAbout()
  },

  loadAbout() {
    var that = this
    showLoading('加载中')
    configAPI.list({
      pageSize: 2,
      filter: {
        $or: [
          { data_code: { $eq: 'app_about' } },
          { data_code: { $eq: 'app_name' } }
        ]
      }
    }, true).then(function(res) {
      hideLoading()
      var items = res.data || []
      var content = ''
      var appName = that.data.appName
      items.forEach(function(item) {
        if (item.data_code === 'app_about') {
          content = item.data_value || ''
        }
        if (item.data_code === 'app_name' && item.data_value) {
          appName = item.data_value
          wx.setStorageSync('appName', appName)
          var app = getApp()
          if (app && app.globalData) app.globalData.appName = appName
        }
      })
      that.setData({ content: content, appName: appName, loading: false })
      wx.setNavigationBarTitle({ title: appName })
    }).catch(function(err) {
      hideLoading()
      that.setData({ loading: false })
      console.error('[about] 加载关于我们失败:', err)
      showToast('加载失败')
    })
  }
})
