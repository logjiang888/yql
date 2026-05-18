const { BASE_URL } = require('../../api/nocobase')
const { getToken } = require('../../stores/auth')

const uploadBaseUrl = BASE_URL.replace('/api', '')

Component({
  options: {
    addGlobalClass: true
  },
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
    _getFiles() {
      var files = this.data.files
      return Array.isArray(files) ? files : []
    },

    onTapUpload() {
      console.log('[upload-with-ref] onTapUpload 被点击')
      var files = this._getFiles()
      var remaining = this.data.maxCount - files.length
      console.log('[upload-with-ref] 当前文件数:', files.length, '剩余可上传:', remaining)
      if (remaining <= 0) {
        wx.showToast({ title: '最多上传' + this.data.maxCount + '张', icon: 'none' })
        return
      }

      var that = this
      var chooseSuccess = function(res) {
        console.log('[upload-with-ref] 选择图片成功:', res)
        var tempFiles = res.tempFiles || []
        if (that.data.autoUpload) {
          var index = 0
          var uploadNext = function() {
            if (index >= tempFiles.length) return
            var file = tempFiles[index++]
            that.doUpload(file.tempFilePath, uploadNext)
          }
          uploadNext()
        } else {
          var newFiles = tempFiles.map(function(f) { return f.tempFilePath })
          console.log('[upload-with-ref] 触发 change 事件，新文件:', newFiles)
          that.triggerEvent('change', { files: files.concat(newFiles) })
        }
      }

      var chooseFail = function(err) {
        console.error('[upload-with-ref] 选择图片失败:', err)
      }

      if (wx.chooseMedia) {
        wx.chooseMedia({
          count: remaining,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          success: chooseSuccess,
          fail: chooseFail
        })
      } else {
        wx.chooseImage({
          count: remaining,
          sourceType: ['album', 'camera'],
          success: function(res) {
            chooseSuccess({ tempFiles: (res.tempFilePaths || []).map(function(p) { return { tempFilePath: p } }) })
          },
          fail: chooseFail
        })
      }
    },

    doUpload(filePath, callback) {
      var token = getToken()
      var that = this
      if (!token) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        if (callback) callback()
        return
      }

      wx.uploadFile({
        url: BASE_URL + '/attachments:create',
        filePath: filePath,
        name: 'file',
        formData: { t: Date.now() },
        header: {
          'Authorization': 'Bearer ' + token,
          'X-Locale': 'zh-CN',
          'X-Timezone': '+08:00'
        },
        success: function(res) {
          if (res.statusCode !== 200 && res.statusCode !== 201) {
            wx.showToast({ title: '上传失败(' + res.statusCode + ')', icon: 'none' })
            if (callback) callback()
            return
          }
          try {
            var result = JSON.parse(res.data)
            var attachment = (result && result.data) || result
            var url = attachment.url || attachment.path || ''
            if (url && url.indexOf('/storage/') === 0) {
              url = uploadBaseUrl + url
            }
            var newFile = { id: attachment.id, url: url }
            var files = that._getFiles().concat([newFile])
            that.triggerEvent('change', { files: files })
          } catch (e) {
            wx.showToast({ title: '上传响应解析失败', icon: 'none' })
          }
          if (callback) callback()
        },
        fail: function() {
          wx.showToast({ title: '上传失败，请重试', icon: 'none' })
          if (callback) callback()
        }
      })
    },

    onPreviewRef() {
      if (!this.data.referenceUrl) return
      this.triggerEvent('previewRef', this.data.referenceUrl)
    },

    onPreviewFile(e) {
      var index = e.currentTarget.dataset.index
      var urls = this._getFiles().map(function(item) {
        return typeof item === 'string' ? item : item.url
      })
      wx.previewImage({
        urls: urls,
        current: urls[index]
      })
    },

    onDeleteFile(e) {
      var index = e.currentTarget.dataset.index
      var files = this._getFiles().slice()
      files.splice(index, 1)
      this.triggerEvent('change', { files: files })
    }
  }
})
