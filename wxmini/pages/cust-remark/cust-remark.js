const { createNocoBaseAPI } = require('../../api/nocobase')

const myCustAPI = createNocoBaseAPI('my_cust_list')

const CUST_TYPE_TABS = [
  { value: '1', label: '意向客户' },
  { value: '2', label: '满足要求' },
  { value: '9', label: '不满足要求' }
]
const CUST_LEVEL_OPTIONS = [
  { value: '1', label: '普通客户' },
  { value: '2', label: '大客户' }
]

Page({
  data: {
    id: '',
    companyName: '',
    custType: '1',
    custLevel: '1',
    remark: '',
    custTypeTabs: CUST_TYPE_TABS,
    custLevelOptions: CUST_LEVEL_OPTIONS
  },

  onLoad(options) {
    this.setData({
      id: options.id || '',
      companyName: decodeURIComponent(options.companyName || ''),
      custType: options.custType || '1',
      custLevel: options.custLevel || '1',
      remark: decodeURIComponent(options.remark || '')
    })
  },

  onTypeChange(e) {
    this.setData({ custType: e.currentTarget.dataset.value })
  },

  onLevelChange(e) {
    this.setData({ custLevel: e.currentTarget.dataset.value })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  onSave() {
    var that = this
    var id = this.data.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    myCustAPI.update(id, {
      cust_type: this.data.custType,
      cust_level: this.data.custLevel,
      remark: this.data.remark
    }, true).then(function() {
      wx.showToast({ title: '保存成功', icon: 'success' })
      var pages = getCurrentPages()
      var prevPage = pages[pages.length - 2]
      if (prevPage && prevPage.loadMyCustList) {
        prevPage.loadMyCustList()
      }
      setTimeout(function() {
        wx.navigateBack()
      }, 800)
    }).catch(function() {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  }
})
