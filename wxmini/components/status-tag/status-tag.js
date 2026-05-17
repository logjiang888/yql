const { AUDIT_STATUS_TEXT, ROLE_TEXT } = require('../../constants/index')

Component({
  properties: {
    status: {
      type: String,
      value: ''
    },
    type: {
      type: String,
      value: 'audit'
    }
  },

  data: {
    tagStyle: ''
  },

  observers: {
    status: function(status) {
      this.updateStyle(status)
    }
  },

  lifetimes: {
    attached() {
      this.updateStyle(this.data.status)
    }
  },

  methods: {
    updateStyle(status) {
      const map = this.data.type === 'audit' ? AUDIT_STATUS_TEXT : ROLE_TEXT
      const item = map[status] || { text: status, color: '#6B7280', bg: '#F3F4F6' }
      this.setData({
        tagStyle: `color: ${item.color}; background-color: ${item.bg};`,
        tagText: item.text
      })
    }
  }
})
