const { initAuthStore } = require('./stores/auth')

App({
  globalData: {
    userInfo: null,
    role: null,
    systemInfo: null
  },

  onLaunch() {
    this.initSystemInfo()
    initAuthStore()
    this.checkUpdate()
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
