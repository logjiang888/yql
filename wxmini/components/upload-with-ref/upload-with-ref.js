const { getToken } = require('../../stores/auth')
const { BASE_URL } = require('../../api/nocobase')

const uploadBaseUrl = BASE_URL.replace('/api', '')

Component({
  properties: {
    label: {
      type: String,
      value: ''
    },
    files: {
      type: Array,
      value: []
    },
    maxCount: {
      type: Number,
      value: 9
    },
    referenceUrl: {
      type: String,
      value: ''
    },
    autoUpload: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    onTapUpload() {
      const remaining = this.data.maxCount - this.data.files.length
      if (remaining <= 0) {
        wx.showToast({ title: `最多上传${this.data.maxCount}张`, icon: 'none' })
        return
      }
      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFiles = res.tempFiles || []
          if (this.data.autoUpload) {
            tempFiles.forEach((file) => {
              this.doUpload(file.tempFilePath)
            })
          } else {
            const newFiles = tempFiles.map(f => f.tempFilePath)
            this.triggerEvent('change', { files: this.data.files.concat(newFiles) })
          }
        }
      })
    },

    doUpload(filePath) {
      const token = getToken() || ''
      if (!token) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }

      wx.uploadFile({
        url: `${BASE_URL}/attachments:create`,
        filePath,
        name: 'file',
        formData: { t: Date.now() },
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          if (res.statusCode !== 200 && res.statusCode !== 201) {
            wx.showToast({ title: `上传失败(${res.statusCode})`, icon: 'none' })
            return
          }
          try {
            const result = JSON.parse(res.data)
            const attachment = (result && result.data) || result
            let url = attachment.url || attachment.path || ''
            if (url && url.indexOf('/storage/') === 0) {
              url = uploadBaseUrl + url
            }
            const newFile = { id: attachment.id, url }
            const files = this.data.files.concat([newFile])
            this.triggerEvent('change', { files })
          } catch (e) {
            wx.showToast({ title: '上传响应解析失败', icon: 'none' })
          }
        },
        fail: () => {
          wx.showToast({ title: '上传失败，请重试', icon: 'none' })
        }
      })
    },

    onPreviewRef() {
      if (!this.data.referenceUrl) return
      wx.previewImage({
        urls: [this.data.referenceUrl],
        current: this.data.referenceUrl
      })
    },

    onPreviewFile(e) {
      const { index } = e.currentTarget.dataset
      const urls = this.data.files.map(item => typeof item === 'string' ? item : item.url)
      wx.previewImage({
        urls,
        current: urls[index]
      })
    },

    onDeleteFile(e) {
      const { index } = e.currentTarget.dataset
      const files = this.data.files.slice()
      files.splice(index, 1)
      this.triggerEvent('change', { files })
    }
  }
})
