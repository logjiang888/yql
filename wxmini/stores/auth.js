const { storage } = require('../utils/util')

const AUTH_KEY = 'auth_data'

let authStore = null

const getAuthStore = () => {
  if (!authStore) {
    const data = storage.get(AUTH_KEY, {})
    authStore = {
      token: data.token || '',
      userInfo: data.userInfo || null,
      role: data.role || '',
      isLogin: !!data.token
    }
  }
  return authStore
}

const initAuthStore = () => {
  getAuthStore()
}

const setAuth = (token, userInfo) => {
  const role = (userInfo && userInfo.user_type) || (userInfo && userInfo.roleName) || ''
  authStore = {
    token,
    userInfo,
    role: role,
    isLogin: true
  }
  storage.set(AUTH_KEY, { token, userInfo, role: authStore.role })
}

const clearAuth = () => {
  authStore = {
    token: '',
    userInfo: null,
    role: '',
    isLogin: false
  }
  storage.remove(AUTH_KEY)
}

const getToken = () => {
  return getAuthStore().token
}

const getUserInfo = () => {
  return getAuthStore().userInfo
}

const getRole = () => {
  return getAuthStore().role
}

const isLogin = () => {
  return getAuthStore().isLogin
}

const getUserId = () => {
  const userInfo = getUserInfo()
  return (userInfo && userInfo.id) || (userInfo && userInfo.userId) || 0
}

module.exports = {
  initAuthStore,
  setAuth,
  clearAuth,
  getToken,
  getUserInfo,
  getRole,
  isLogin,
  getUserId
}
