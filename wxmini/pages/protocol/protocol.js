const { createNocoBaseAPI } = require('../../api/nocobase')
const { PROTOCOL_TYPE } = require('../../constants/index')
const { showLoading, hideLoading } = require('../../utils/util')

const protocolAPI = createNocoBaseAPI('dim_protocal_info')

Page({
  data: {
    role: '',
    title: '用户注册协议',
    content: '',
    showAgreeBtn: false
  },

  onLoad(options) {
    const role = options.role || 'company'
    const showAgreeBtn = options.from === 'register'
    const typeMap = {
      company: PROTOCOL_TYPE.COMPANY,
      bank: PROTOCOL_TYPE.BANK,
      salesperson: PROTOCOL_TYPE.SALESPERSON
    }
    this.setData({ role, showAgreeBtn, protocolType: typeMap[role] || PROTOCOL_TYPE.COMPANY })
    this.loadProtocol()
  },

  loadProtocol() {
    showLoading('加载中')
    protocolAPI.list({
      filter: { protocol_type: { $eq: this.data.protocolType } },
      sort: '-createdAt',
      pageSize: 1
    }).then((res) => {
      hideLoading()
      const item = res.data && res.data[0]
      if (item) {
        this.setData({
          title: item.protocol_type === 'company' ? '企业用户注册协议' :
                 item.protocol_type === 'bank' ? '银行人员注册协议' : '业务员注册协议',
          content: item.protocal_content || ''
        })
      }
    }).catch(() => {
      hideLoading()
    })
  },

  onAgree() {
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      prevPage.setData({ agreed: true })
    }
    wx.navigateBack()
  }
})