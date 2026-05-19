const { getUserId } = require('../../stores/auth')
const { createNocoBaseAPI } = require('../../api/nocobase')
const { formatDateTime, checkAuditInterceptor } = require('../../utils/util')

const chatAPI = createNocoBaseAPI('chat_info')
const userAPI = createNocoBaseAPI('users')

Page({
  data: {
    messageList: [],
    loading: false
  },

  onShow() {
    if (!checkAuditInterceptor()) return
    this.loadMessageList()
    var tabBar = this.getTabBar()
    if (tabBar && typeof tabBar.updateSelected === 'function') {
      tabBar.updateSelected()
    }
  },

  loadMessageList() {
    const myId = getUserId()
    if (!myId) {
      this.setData({ messageList: [] })
      return
    }

    this.setData({ loading: true })

    // 查询与我相关的所有聊天记录
    const filter = {
      $or: [
        { from_user_id: { $eq: myId } },
        { reply_user_id: { $eq: myId } }
      ]
    }

    chatAPI.list({
      pageSize: 200,
      filter,
      sort: '-createdAt',
      appends: ['to_users_from_id', 'to_users_reply']
    }, true).then((res) => {
      const items = res.data || []

      // 按对方用户聚合，取最后一条消息
      const chatMap = {}

      items.forEach(function (item) {
        const fromId = item.from_user_id
        const replyId = item.reply_user_id
        const otherId = fromId === myId ? replyId : fromId

        if (!otherId) return

        const existing = chatMap[otherId]
        if (!existing || new Date(item.createdAt) > new Date(existing.lastTime)) {
          const otherUser = fromId === myId ? item.to_users_reply : item.to_users_from_id
          chatMap[otherId] = {
            toUserId: otherId,
            toUserName: (otherUser && otherUser.nickname) || (otherUser && otherUser.username) || '用户' + otherId,
            lastContent: item.chat_content,
            lastTime: item.createdAt,
            unread: 0
          }
        }
      })

      const messageList = []
      for (const key in chatMap) {
        if (chatMap.hasOwnProperty(key)) {
          messageList.push(chatMap[key])
        }
      }
      messageList.sort(function (a, b) {
        return new Date(b.lastTime) - new Date(a.lastTime)
      })

      this.setData({ messageList, loading: false })
    }).catch((err) => {
      console.error('[message-list] 加载失败:', err)
      this.setData({ loading: false })
      // 降级到本地缓存
      this.loadLocalMessages(myId)
    })
  },

  loadLocalMessages(myId) {
    const keys = wx.getStorageInfoSync().keys || []
    const chatKeys = keys.filter(k => k.indexOf('chat_' + myId + '_') === 0)
    const list = []

    chatKeys.forEach(key => {
      try {
        const messages = wx.getStorageSync(key) || []
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1]
          const toUserId = parseInt(key.replace(`chat_${myId}_`, ''))
          list.push({
            toUserId,
            toUserName: `用户${toUserId}`,
            lastContent: lastMsg.content,
            lastTime: lastMsg.createTime,
            unread: 0
          })
        }
      } catch (e) {}
    })

    list.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
    this.setData({ messageList: list })
  },

  formatTime(timeStr) {
    return formatDateTime(timeStr)
  },

  onItemTap(e) {
    const { id, name } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/chat/chat?toUserId=${id}&toUserName=${encodeURIComponent(name || '')}`
    })
  }
})
