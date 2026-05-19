const { createNocoBaseAPI } = require('../../api/nocobase')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

const configAPI = createNocoBaseAPI('dim_data_config')

Page({
  data: {
    loading: true,
    content: ''
  },

  onLoad() {
    this.loadAbout()
  },

  loadAbout() {
    var that = this
    showLoading('加载中')
    configAPI.list({
      pageSize: 1,
      filter: { data_code: { $eq: 'app_about' } }
    }, true).then(function(res) {
      hideLoading()
      var items = res.data || []
      var content = ''
      if (items.length > 0) {
        content = items[0].data_value || ''
      }
      that.setData({ content: content, loading: false })
    }).catch(function(err) {
      hideLoading()
      that.setData({ loading: false })
      console.error('[about] 加载关于我们失败:', err)
      showToast('加载失败')
    })
  }
})
