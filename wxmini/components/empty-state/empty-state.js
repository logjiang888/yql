Component({
  properties: {
    title: {
      type: String,
      value: '暂无数据'
    },
    desc: {
      type: String,
      value: ''
    },
    showBtn: {
      type: Boolean,
      value: false
    },
    btnText: {
      type: String,
      value: '重新加载'
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('retry')
    }
  }
})
