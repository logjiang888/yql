const { initAuthStore } = require('./stores/auth')
const { createNocoBaseAPI } = require('./api/nocobase')

const configAPI = createNocoBaseAPI('dim_data_config')

App({
  globalData: {
    userInfo: null,
    role: null,
    systemInfo: null,
    appName: '银企直聊'
  },

  onLaunch() {
    this.initSystemInfo()
    initAuthStore()
    this.loadAppConfig()
    this.checkUpdate()
  },

  loadAppConfig() {
    var that = this
    configAPI.list({
      pageSize: 1,
      filter: { data_code: { $eq: 'app_name' } }
    }, true).then(function(res) {
      var items = res.data || []
      if (items.length > 0 && items[0].data_value) {
        var appName = items[0].data_value
        that.globalData.appName = appName
        wx.setStorageSync('appName', appName)
      }
    }).catch(function(err) {
      console.error('[app] 加载应用配置失败:', err)
      var cached = wx.getStorageSync('appName')
      if (cached) that.globalData.appName = cached
    })
  },

  initSystemInfo() {
    const systemInfo = wx.getSystemInfoSync()
    this.globalData.systemInfo = systemInfo
    this.globalData.safeAreaBottom = systemInfo.safeArea
      ? systemInfo.screenHeight - systemInfo.safeArea.bottom
      : 0
  },

  checkUpdate() {
    const updateManager = wx.getUpdateManager()
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        updateManager.onUpdateReady(() => {
          wx.showModal({
            title: '更新提示',
            content: '新版本已准备好，是否重启应用？',
            success: (res) => {
              if (res.confirm) {
                updateManager.applyUpdate()
              }
            }
          })
        })
      }
    })
  }
})
