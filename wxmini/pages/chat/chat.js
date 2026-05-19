const { getUserId } = require('../../stores/auth')
const { formatDateTime, storage, showToast, checkAuditInterceptor } = require('../../utils/util')
const { createNocoBaseAPI, request, BASE_URL } = require('../../api/nocobase')

const chatAPI = createNocoBaseAPI('chat_info')
const userAPI = createNocoBaseAPI('users')

const ROLE_ICON_MAP = {
  company: '🏢',
  bank: '🏦',
  plat_salesperson: '🤝'
}

const ROLE_TEXT_MAP = {
  company: '企业',
  bank: '银行',
  plat_salesperson: '业务员'
}

Page({
  data: {
    toUserId: 0,
    toUserName: '',
    toUserType: '',
    toUserTypeText: '',
    toUserTypeIcon: '',
    toUserHeadImage: '',
    inputValue: '',
    canSend: false,
    messages: [],
    scrollToId: '',
    loading: false
  },

  onLoad(options) {
    const toUserId = parseInt(options.toUserId || 0)
    const toUserName = decodeURIComponent(options.toUserName || '聊天')
    this.setData({ toUserId, toUserName })
    wx.setNavigationBarTitle({ title: toUserName })
    this.loadToUserInfo(toUserId)
    this.loadMessages(toUserId)
  },

  loadToUserInfo(toUserId) {
    if (!toUserId) return
    var that = this
    var ASSET_BASE = BASE_URL.replace('/api', '')
    userAPI.get(toUserId, [], true).then(function(res) {
      var user = res.data || {}
      var headImage = user.head_image || ''
      if (headImage && headImage.indexOf('http') !== 0 && headImage.indexOf('/storage/') === 0) {
        headImage = ASSET_BASE + headImage
      }
      var userType = user.user_type || ''
      var typeText = ROLE_TEXT_MAP[userType] || ''
      var typeIcon = ROLE_ICON_MAP[userType] || ''
      var displayName = user.nickname || user.username || '用户' + toUserId
      that.setData({
        toUserName: displayName,
        toUserType: userType,
        toUserTypeText: typeText,
        toUserTypeIcon: typeIcon,
        toUserHeadImage: headImage
      })
      wx.setNavigationBarTitle({ title: displayName + (typeText ? '(' + typeText + ')' : '') })
    }).catch(function(err) {
      console.error('[chat] 加载对方用户信息失败:', err)
    })
  },

  onShow() {
    if (!checkAuditInterceptor()) return
  },

  loadMessages(toUserId) {
    const myId = getUserId()
    if (!myId || !toUserId) return

    this.setData({ loading: true })

    // 先从本地缓存加载，提升体验
    const localKey = `chat_${myId}_${toUserId}`
    const localMessages = storage.get(localKey, [])
    if (localMessages.length > 0) {
      this.setData({ messages: localMessages })
      this.scrollToBottom()
    }

    // 从后端加载完整聊天记录
    const filter = {
      $or: [
        { from_user_id: { $eq: myId }, reply_user_id: { $eq: toUserId } },
        { from_user_id: { $eq: toUserId }, reply_user_id: { $eq: myId } }
      ]
    }

    chatAPI.list({
      pageSize: 200,
      filter,
      sort: 'createdAt',
      appends: ['to_users_from_id', 'to_users_reply']
    }, true).then((res) => {
      const items = (res.data || []).map(item => ({
        id: item.id,
        fromId: item.from_user_id,
        toId: item.reply_user_id,
        content: item.chat_content,
        createTime: item.chat_time || item.createdAt
      }))

      // 合并本地和远程消息（以远程为准，本地可能有未同步的）
      const remoteIds = {}
      items.forEach(function (m) {
        remoteIds[m.id] = true
      })
      const unsynced = localMessages.filter(m => !remoteIds[m.id] && String(m.id).indexOf('local_') === 0)
      const merged = items.concat(unsynced).sort((a, b) => new Date(a.createTime) - new Date(b.createTime))

      this.setData({ messages: merged, loading: false })
      storage.set(localKey, merged)
      this.scrollToBottom()
    }).catch((err) => {
      console.error('[chat] 加载消息失败:', err)
      this.setData({ loading: false })
      // 失败时保持本地缓存
    })
  },

  onInputChange(e) {
    var value = e.detail.value !== undefined ? e.detail.value : ''
    this.setData({ inputValue: value, canSend: value.trim().length > 0 })
  },

  onSend() {
    const { inputValue, toUserId, messages } = this.data
    const content = inputValue.trim()
    if (!content) return

    const myId = getUserId()
    if (!myId) {
      showToast('请先登录')
      return
    }

    const localId = `local_${Date.now()}`
    const newMessage = {
      id: localId,
      fromId: myId,
      toId: toUserId,
      content,
      createTime: new Date().toISOString()
    }

    const updated = messages.concat([newMessage])
    this.setData({ messages: updated, inputValue: '', canSend: false })
    this.saveMessages(updated)
    this.scrollToBottom()

    // 发送到后端（chat_info:create 直接传字段，不用 values 包装）
    request({
      url: '/chat_info:create',
      method: 'POST',
      data: {
        from_user_id: myId,
        reply_user_id: toUserId,
        chat_content: content,
        chat_time: newMessage.createTime
      },
      useAdminToken: true
    }).then((res) => {
      // 后端返回真实 id，更新本地消息
      const serverId = res.data && res.data.id
      if (serverId) {
        const finalMessages = updated.map(m => {
          if (m.id !== localId) return m
          const newM = {}
          for (const k in m) { newM[k] = m[k] }
          newM.id = serverId
          return newM
        })
        this.setData({ messages: finalMessages })
        this.saveMessages(finalMessages)
      }
    }).catch((err) => {
      console.error('[chat] 发送消息失败:', err)
      showToast('消息发送失败')
    })
  },

  saveMessages(messages) {
    const myId = getUserId()
    const { toUserId } = this.data
    const key = `chat_${myId}_${toUserId}`
    storage.set(key, messages)
  },

  scrollToBottom() {
    const { messages } = this.data
    if (messages.length > 0) {
      const lastId = `msg_${messages[messages.length - 1].id}`
      this.setData({ scrollToId: lastId })
    }
  },

  formatTime(timeStr) {
    return formatDateTime(timeStr)
  }
})
