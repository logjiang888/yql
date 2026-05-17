const { showToast, showLoading, hideLoading } = require('../../utils/util')
const { authAPI } = require('../../api/nocobase')

Page({
  data: {
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    errorMsg: '',
    errorField: ''
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value !== undefined ? e.detail.value : e.detail
    const updateData = { errorMsg: '', errorField: '' }
    updateData[field] = value
    this.setData(updateData)
  },

  onSubmit() {
    const { oldPassword, newPassword, confirmPassword } = this.data
    if (!oldPassword) {
      this.setData({ errorMsg: '请输入原密码', errorField: 'oldPassword' })
      return
    }
    if (newPassword.length < 6) {
      this.setData({ errorMsg: '新密码长度不能少于6位', errorField: 'newPassword' })
      return
    }
    if (newPassword !== confirmPassword) {
      this.setData({ errorMsg: '两次输入的密码不一致', errorField: 'confirmPassword' })
      return
    }

    showLoading('提交中')
    authAPI.changePassword({ oldPassword: oldPassword, newPassword: newPassword }).then(() => {
      hideLoading()
      showToast('密码修改成功')
      wx.navigateBack()
    }).catch((err) => {
      hideLoading()
      this.setData({ errorMsg: err.message || '修改失败，请重试' })
    })
  }
})