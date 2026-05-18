const { getToken } = require('../stores/auth')

const BASE_URL = 'https://www.shang-an.cc/api'

const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoiYWRtaW4iLCJpYXQiOjE3Nzc3ODM5OTcsImV4cCI6MzMzMzUzODM5OTd9.MbfoXrFgbnkuG4YIjdnHpvm02aRp7O8GdPQ1Z1bu8a4'

const request = (options) => {
  return new Promise((resolve, reject) => {
    let token = ''
    if (options.useAdminToken) {
      token = ADMIN_TOKEN
    } else if (!options.skipAuth) {
      token = getToken() || ADMIN_TOKEN
    }

    const isWrite = ['POST', 'PUT', 'PATCH'].indexOf((options.method || 'GET').toUpperCase()) >= 0
    const isDelete = (options.method || 'GET').toUpperCase() === 'DELETE'
    const isAuth = options.url && options.url.indexOf('/auth:') === 0

    const header = { 'Content-Type': 'application/json' }

    // 公共头
    header['X-Locale'] = 'zh-CN'
    header['X-Timezone'] = '+08:00'
    header['X-Hostname'] = 'www.shang-an.cc'
    header['X-App'] = 'main'

    // 认证头
    if (isAuth) {
      header['X-Authenticator'] = 'username-password'
    }

    if (options.useAdminToken) {
      header['Authorization'] = 'Bearer ' + ADMIN_TOKEN
    } else if (!options.skipAuth) {
      const userToken = getToken() || ADMIN_TOKEN
      if (userToken) {
        header['Authorization'] = 'Bearer ' + userToken
      }
    }

    // X-Role 规则：写请求 或 useAdminToken 时带（auth 操作除外）
    if ((isWrite || options.useAdminToken) && !isAuth) {
      header['X-Role'] = 'root'
    }

    // 合并自定义 header
    if (options.header) {
      for (const key in options.header) {
        if (options.header.hasOwnProperty(key)) {
          header[key] = options.header[key]
        }
      }
    }

    if (isAuth && options.url !== '/auth:signIn' && options.url !== '/auth:signUp') {
      console.log('[request] auth header:', JSON.stringify(header))
    }

    // 构建 URL
    let url = BASE_URL + options.url

    // GET / DELETE 请求：手动构建 query string
    if (!isWrite && options.data) {
      const query = []
      for (const key in options.data) {
        if (options.data.hasOwnProperty(key)) {
          let val = options.data[key]
          if (val === undefined || val === null) continue

          // filter 必须是 JSON 字符串
          if (key === 'filter' && typeof val === 'object') {
            val = JSON.stringify(val)
          }

          // appends 数组转成逗号分隔字符串
          if (key === 'appends' && Array.isArray(val)) {
            val = val.join(',')
          }

          query.push(key + '=' + encodeURIComponent(val))
        }
      }
      if (query.length > 0) {
        url += (url.indexOf('?') >= 0 ? '&' : '?') + query.join('&')
      }
    }

    wx.request({
      url: url,
      method: options.method || 'GET',
      header: header,
      data: isWrite ? options.data : undefined,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          const msg = (res.data && res.data.message) || (res.data && res.data.error) || '登录已过期，请重新登录'
          console.warn('[request] 401 未授权, URL:', options.url, 'message:', msg)
          reject(new Error(msg))
        } else {
          const message = (res.data && res.data.message) || (res.data && res.data.error) || '请求失败(' + res.statusCode + ')'
          reject(new Error(message))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

const createNocoBaseAPI = (collectionName) => {
  return {
    list(params, useAdminToken) {
      return request({
        url: '/' + collectionName + ':list',
        method: 'GET',
        data: params,
        useAdminToken: useAdminToken
      })
    },

    get(id, appends, useAdminToken) {
      const data = { filterByTk: id }
      if (appends) {
        data.appends = Array.isArray(appends) ? appends.join(',') : appends
      }
      return request({
        url: '/' + collectionName + ':get',
        method: 'GET',
        data: data,
        useAdminToken: useAdminToken
      })
    },

    create(data, useAdminToken) {
      return request({
        url: '/' + collectionName + ':create',
        method: 'POST',
        data: data,
        useAdminToken: useAdminToken
      })
    },

    update(id, data, useAdminToken) {
      return request({
        url: '/' + collectionName + ':update?filterByTk=' + id,
        method: 'POST',
        data: data,
        useAdminToken: useAdminToken
      })
    },

    delete(id, useAdminToken) {
      return request({
        url: '/' + collectionName + ':destroy?filterByTk=' + id,
        method: 'DELETE',
        useAdminToken: useAdminToken
      })
    },

    batchDelete(ids, useAdminToken) {
      return request({
        url: '/' + collectionName + ':destroy',
        method: 'POST',
        data: { filter: { id: { $in: ids } } },
        useAdminToken: useAdminToken
      })
    }
  }
}

const authAPI = {
  signIn(data) {
    console.log('[auth:signIn] 请求参数:', JSON.stringify(data))
    return request({
      url: '/auth:signIn',
      method: 'POST',
      data: data,
      skipAuth: true
    })
  },

  signUp(data) {
    console.log('[auth:signUp] 请求参数:', JSON.stringify(data))
    return request({
      url: '/auth:signUp',
      method: 'POST',
      data: data,
      skipAuth: true
    })
  },

  changePassword(data) {
    console.log('[auth:changePassword] 请求参数:', JSON.stringify(data))
    return request({
      url: '/auth:changePassword',
      method: 'POST',
      data: data
    })
  }
}

module.exports = {
  request,
  createNocoBaseAPI,
  authAPI,
  BASE_URL,
  ADMIN_TOKEN
}
