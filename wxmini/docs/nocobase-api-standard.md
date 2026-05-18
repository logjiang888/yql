# NocoBase API 标准文档（微信小程序版）

> 本文档基于 `D:\APP\good_marry\src` 项目（生产环境已验证）提炼，适配微信小程序 `wx.request` 环境。

---

## 1. 基础配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| Base URL | `https://www.shang-an.cc/api` | 后端地址 |
| Content-Type | `application/json` | 默认请求头 |
| 认证方式 | `Bearer Token` | 通过 `Authorization` 头传递 |

---

## 2. 通用请求头

所有内部 API 请求必须携带以下头：

```javascript
{
  'Content-Type': 'application/json',
  'X-Locale': 'zh-CN',
  'X-Timezone': '+08:00',
  'X-Hostname': 'www.shang-an.cc',
  'X-App': 'main'
}
```

**认证头规则：**

| 场景 | Authorization | 说明 |
|------|---------------|------|
| 默认 | `Bearer <ADMIN_TOKEN>` | 全局管理员 Token，用于读取公开数据 |
| 用户自身操作 | `Bearer <user_token>` | 用户登录后获取的 Token |
| 登录/注册 | 不带 | `auth:signIn` / `auth:signUp` 不需要 Token |

**`X-Role: root` 使用规则：**
- 写请求（POST / PUT / PATCH）**必须**带
- `useAdminToken` 为 `true` 的读请求**必须**带
- 普通用户读请求**不带**

> ⚠️ **例外：`attachments:create`（附件上传）不使用 `X-Role: root`**
>
> 附件上传必须使用**当前登录用户的 Token**，仅带 `Authorization` 即可。使用 `ADMIN_TOKEN` 或带上 `X-Role: root` 会导致上传失败（NocoBase ACL 会拒绝）。参考 `D:\APP\good_marry\src` 项目的实践。

---

## 3. 认证端点

### 3.1 登录

```javascript
wx.request({
  url: BASE_URL + '/auth:signIn',
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
    'X-Authenticator': 'username-password'
  },
  data: {
    account: '13405947438',
    password: '123456'
  }
})
```

### 3.2 注册

```javascript
wx.request({
  url: BASE_URL + '/auth:signUp',
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
    'X-Authenticator': 'username-password'
  },
  data: {
    account: '13405947438',
    password: '123456',
    // 其他字段...
  }
})
```

### 3.3 修改密码

**`auth:` 路径需要同时携带 `X-Authenticator` 和 `Authorization`**。

```javascript
wx.request({
  url: BASE_URL + '/auth:changePassword',
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
    'X-Authenticator': 'username-password',
    'Authorization': 'Bearer ' + USER_TOKEN
  },
  data: {
    oldPassword: '123456',
    newPassword: '654321',
    confirmPassword: '654321'
  }
})
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `oldPassword` | String | 是 | 原密码 |
| `newPassword` | String | 是 | 新密码（长度不少于6位） |
| `confirmPassword` | String | 是 | 确认新密码（必须与 `newPassword` 一致） |

---

## 4. CRUD 端点

### 4.1 `:list` — 列表查询

**请求方式：** `GET`

**URL：** `/{collection}:list`

**关键参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | Number | 页码，从 1 开始 |
| `pageSize` | Number | 每页条数 |
| `filter` | String | **JSON.stringify 后的字符串**，过滤条件 |
| `sort` | String | 排序，如 `-createdAt`（倒序） |
| `appends` | String / Array | 关联字段，逗号分隔或数组 |

**正确示例：**

```javascript
const params = {
  page: 1,
  pageSize: 10,
  filter: JSON.stringify({ user_type: { $eq: 'bank' } }),
  sort: '-createdAt',
  appends: 'to_dim_bank_info'
}

wx.request({
  url: BASE_URL + '/users:list',
  method: 'GET',
  header: { 'Authorization': 'Bearer ' + ADMIN_TOKEN },
  data: params
})
```

**错误示例（不要这样写）：**

```javascript
// 错误！filter 必须是 JSON 字符串
filter: { user_type: 'bank' }

// 错误！appends 如果是数组，需要正确序列化
appends: ['to_dim_bank_info'] // wx.request 会把数组序列化为 appends[]=xxx，NocoBase 可能不识别
```

### 4.2 `:get` — 单条查询

**请求方式：** `GET`

**URL：** `/{collection}:get`

**关键参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `filterByTk` | String / Number | 主键值 |
| `appends` | String | 关联字段，逗号分隔 |

**示例：**

```javascript
wx.request({
  url: BASE_URL + '/users:get',
  method: 'GET',
  header: { 'Authorization': 'Bearer ' + ADMIN_TOKEN },
  data: {
    filterByTk: 8,
    appends: 'to_dim_bank_info'
  }
})
```

**查询当前用户（特殊场景）：**

```javascript
wx.request({
  url: BASE_URL + '/users:get',
  method: 'GET',
  header: { 'Authorization': 'Bearer ' + USER_TOKEN }, // 必须用用户自己的 Token
  data: {
    filterByTk: 'current',
    appends: 'to_dim_bank_info'
  }
})
```

### 4.3 `:create` — 创建

**请求方式：** `POST`

**URL：** `/{collection}:create`

**Body：** 直接传递对象，**不需要 `values` 包装**

**示例：**

```javascript
wx.request({
  url: BASE_URL + '/users:create',
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + ADMIN_TOKEN,
    'X-Role': 'root'
  },
  data: {
    username: 'zhangsan',
    phone: '13405947438',
    user_type: 'bank'
  }
})
```

### 4.4 `:update` — 更新

**请求方式：** `POST`

**URL：** `/{collection}:update`

**Query：** `filterByTk={id}`

**Body：** 直接传递更新字段

**示例：**

```javascript
wx.request({
  url: BASE_URL + '/users:update',
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + ADMIN_TOKEN,
    'X-Role': 'root'
  },
  data: {
    nickname: '张三',
    phone: '13800138000'
  },
  // filterByTk 需要通过 query 传递
})
```

**注意：** `wx.request` 不支持 GET/POST 混合传参，需要把 `filterByTk` 拼接到 URL：

```javascript
const url = BASE_URL + '/users:update?filterByTk=' + id
```

### 4.5 `:destroy` — 删除

**请求方式：** `DELETE`

**URL：** `/{collection}:destroy`

**Query：** `filterByTk={id}`

**示例：**

```javascript
wx.request({
  url: BASE_URL + '/users:destroy?filterByTk=' + id,
  method: 'DELETE',
  header: { 'Authorization': 'Bearer ' + ADMIN_TOKEN }
})
```

---

## 5. Filter 语法

**所有 filter 必须 `JSON.stringify` 后传递。**

### 5.1 等于

```javascript
JSON.stringify({ user_type: { $eq: 'bank' } })
// 简写：
JSON.stringify({ user_type: 'bank' })
```

### 5.2 不等于

```javascript
JSON.stringify({ status: { $ne: 'deleted' } })
```

### 5.3 模糊搜索

```javascript
JSON.stringify({ nickname: { $like: '%张%' } })
```

### 5.4 多条件 AND

```javascript
JSON.stringify({
  $and: [
    { user_type: { $eq: 'bank' } },
    { phone: { $nEmpty: true } }
  ]
})
```

### 5.5 多条件 OR

```javascript
JSON.stringify({
  $or: [
    { nickname: { $like: '%张%' } },
    { username: { $like: '%张%' } }
  ]
})
```

### 5.6 范围

```javascript
JSON.stringify({
  age: { $gte: 18, $lte: 60 }
})
```

### 5.7 IN 查询

```javascript
JSON.stringify({
  id: { $in: [1, 2, 3] }
})
```

### 5.8 不为空

```javascript
JSON.stringify({ phone: { $nEmpty: true } })
```

---

## 6. 关联数据获取（appends）

### 6.1 单级关联

```javascript
appends: 'to_dim_bank_info'
```

### 6.2 多级关联（点号）

```javascript
appends: 'to_dim_bank_info.to_dim_branch'
```

### 6.3 多个关联

```javascript
appends: 'to_dim_bank_info,to_dim_branch,to_dim_department'
```

### 6.4 在 list 中使用

```javascript
const params = {
  page: 1,
  pageSize: 10,
  filter: JSON.stringify({ user_type: { $eq: 'bank' } }),
  appends: 'to_dim_bank_info'
}
```

**响应中关联数据的位置：**

```javascript
res.data[0].to_dim_bank_info.bank_name
```

---

## 7. 分页与排序

### 7.1 分页

```javascript
{
  page: 1,      // 第 1 页
  pageSize: 10  // 每页 10 条
}
```

**响应 meta：**

```javascript
res.meta = {
  count: 100,      // 总条数
  page: 1,         // 当前页
  pageSize: 10,    // 每页条数
  totalPage: 10    // 总页数
}
```

### 7.2 排序

```javascript
{
  sort: '-createdAt'  // 按 createdAt 倒序
  sort: 'createdAt'    // 按 createdAt 正序
  sort: '-id'          // 按 id 倒序
}
```

---

## 8. 微信小程序封装示例

```javascript
const BASE_URL = 'https://www.shang-an.cc/api'
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIs...'

function getToken() {
  const auth = wx.getStorageSync('auth_data') || {}
  return auth.token || ''
}

function request(options) {
  return new Promise((resolve, reject) => {
    const isWrite = ['POST', 'PUT', 'PATCH'].indexOf((options.method || 'GET').toUpperCase()) >= 0
    const isAuth = options.url && (options.url.indexOf('/auth:') === 0)

    const header = {
      'Content-Type': 'application/json',
      'X-Locale': 'zh-CN',
      'X-Timezone': '+08:00',
      'X-Hostname': 'www.shang-an.cc',
      'X-App': 'main'
    }

    // Token 规则
    if (isAuth) {
      header['X-Authenticator'] = 'username-password'
    }

    if (options.useAdminToken) {
      header['Authorization'] = 'Bearer ' + ADMIN_TOKEN
    } else if (!options.skipAuth) {
      const userToken = getToken()
      if (userToken) {
        header['Authorization'] = 'Bearer ' + userToken
      }
    }

    if (isWrite) {
      header['X-Role'] = 'root'
    }

    // 处理 GET 请求参数
    let url = BASE_URL + options.url
    if (options.method === 'GET' || options.method === 'DELETE') {
      if (options.data) {
        const query = []
        for (const key in options.data) {
          if (options.data.hasOwnProperty(key)) {
            let val = options.data[key]
            // filter 必须 JSON.stringify
            if (key === 'filter' && typeof val === 'object') {
              val = JSON.stringify(val)
            }
            query.push(key + '=' + encodeURIComponent(val))
          }
        }
        if (query.length > 0) {
          url += (url.indexOf('?') >= 0 ? '&' : '?') + query.join('&')
        }
      }
    }

    wx.request({
      url: url,
      method: options.method || 'GET',
      header: header,
      data: (isWrite) ? options.data : undefined,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(res.data.message || '请求失败'))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络请求失败'))
    })
  })
}

// NocoBase API 工厂
function createNocoBaseAPI(collectionName) {
  return {
    list(params = {}, useAdminToken = false) {
      return request({
        url: '/' + collectionName + ':list',
        method: 'GET',
        data: params,
        useAdminToken: useAdminToken
      })
    },
    get(id, appends = '', useAdminToken = false) {
      const data = { filterByTk: id }
      if (appends) data.appends = appends
      return request({
        url: '/' + collectionName + ':get',
        method: 'GET',
        data: data,
        useAdminToken: useAdminToken
      })
    },
    create(data, useAdminToken = false) {
      return request({
        url: '/' + collectionName + ':create',
        method: 'POST',
        data: data,
        useAdminToken: useAdminToken
      })
    },
    update(id, data, useAdminToken = false) {
      return request({
        url: '/' + collectionName + ':update?filterByTk=' + id,
        method: 'POST',
        data: data,
        useAdminToken: useAdminToken
      })
    },
    delete(id, useAdminToken = false) {
      return request({
        url: '/' + collectionName + ':destroy?filterByTk=' + id,
        method: 'DELETE',
        useAdminToken: useAdminToken
      })
    }
  }
}

module.exports = { request, createNocoBaseAPI }
```

---

## 9. 调用示例汇总

### 9.1 查询银行人员列表

```javascript
const userAPI = createNocoBaseAPI('users')

userAPI.list({
  page: 1,
  pageSize: 10,
  filter: JSON.stringify({
    $and: [
      { user_type: { $eq: 'bank' } },
      { phone: { $nEmpty: true } }
    ]
  }),
  sort: '-createdAt',
  appends: 'to_dim_bank_info'
}, true).then((res) => {
  const users = res.data || []
  users.forEach((u) => {
    const bankInfo = u.to_dim_bank_info || {}
    u.bank_name = bankInfo.bank_name || ''
  })
})
```

### 9.2 查询银行人员详情

```javascript
userAPI.get(8, 'to_dim_bank_info', true).then((res) => {
  const staff = res.data || {}
  const bankInfo = staff.to_dim_bank_info || {}
  staff.bank_name = bankInfo.bank_name || ''
})
```

### 9.3 创建聊天记录

```javascript
const chatAPI = createNocoBaseAPI('chat_info')

chatAPI.create({
  from_user_id: 1,
  reply_user_id: 2,
  chat_content: '你好',
  chat_time: new Date().toISOString()
}, true)
```

### 9.4 查询 Banner

```javascript
const configAPI = createNocoBaseAPI('dim_data_config')

configAPI.list({
  filter: JSON.stringify({ data_type: { $eq: 'image' } }),
  pageSize: 5,
  sort: '-createdAt'
}, true)
```

---

## 10. 常见错误排查

| 错误 | 原因 | 解决 |
|------|------|------|
| 401 Unauthorized | Token 无效或过期 | 检查 `Authorization` 头，确认 Token 正确 |
| 401 + `dim_data_config:list` | 企业用户 Token 权限不足 | 该接口使用 `useAdminToken: true` |
| 附件上传 401/403 | 使用了 `ADMIN_TOKEN` 或 `X-Role: root` | 改用**用户 Token**，**不带** `X-Role` |
| 列表返回空数组 | `filter` 未 `JSON.stringify` | `filter` 必须转成 JSON 字符串 |
| 列表返回空数组 | `user_type` 字段未正确保存 | 检查注册时是否正确写入 |
| 关联数据为空 | `appends` 格式错误 | 使用逗号分隔的字符串，如 `'to_dim_bank_info'` |
| `getGlobalStorage fail` | 基础库 3.4.0 bug | 在 `project.config.json` 中锁定 `libVersion` 为 `2.30.0` |
| Babel 编译错误 | 使用了 ES6+ 语法 | 避免 `...` 展开、可选链、计算属性等 |

---

## 11. 附件上传（`attachments:create`）

> 参考自 `D:\APP\good_marry\src` 项目（生产环境已验证）。

### 11.1 核心差异

`attachments:create` **不能**走 `ADMIN_TOKEN + X-Role: root` 的通用写请求模式，必须使用**当前登录用户的 Token**：

| 维度 | 通用 CRUD 写请求 | `attachments:create` |
|------|------------------|----------------------|
| Token | `ADMIN_TOKEN` | **用户 Token**（`getToken()`） |
| `X-Role: root` | ✅ 必须带 | ❌ **不能带** |
| `X-Locale` | ✅ 带 | ✅ 带 |
| `X-Timezone` | ✅ 带 | ✅ 带 |

### 11.2 两种上传模式

| 模式 | 触发时机 | 优点 | 缺点 |
|------|----------|------|------|
| **自动上传** (`autoUpload=true`) | 选择图片后立即上传 | 体验好，用户明确知道上传结果 | 多张并发需处理竞态 |
| **延迟上传** (`autoUpload=false`) | 点击保存时批量上传 | 减少请求数，可整体回滚 | 保存时才知失败，体验差 |

**推荐：** 个人资料编辑页使用**自动上传**，选择后立即上传，保存时只提交已上传成功的 `id`。

### 11.3 微信小程序实现

#### 自动上传组件（含串行防竞态）

```javascript
const { BASE_URL } = require('../../api/nocobase')
const { getToken } = require('../../stores/auth')

Component({
  properties: {
    files: { type: Array, value: [] },
    maxCount: { type: Number, value: 9 },
    autoUpload: { type: Boolean, value: true }
  },

  methods: {
    _getFiles() {
      var files = this.data.files
      return Array.isArray(files) ? files : []
    },

    onTapUpload() {
      var that = this
      var remaining = this.data.maxCount - this._getFiles().length
      if (remaining <= 0) return

      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: function(res) {
          var tempFiles = res.tempFiles || []
          if (that.data.autoUpload) {
            // 串行上传，避免并发读取 this.data.files 的竞态
            var index = 0
            var uploadNext = function() {
              if (index >= tempFiles.length) return
              var file = tempFiles[index++]
              that.doUpload(file.tempFilePath, uploadNext)
            }
            uploadNext()
          } else {
            // 延迟上传：只返回临时路径，保存时由父组件调用 uploadAttachments
            var newFiles = tempFiles.map(function(f) { return f.tempFilePath })
            that.triggerEvent('change', { files: that._getFiles().concat(newFiles) })
          }
        }
      })
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
            // 补全 URL 前缀（NocoBase 返回的路径以 /storage/ 开头）
            if (url && url.indexOf('/storage/') === 0) {
              url = BASE_URL.replace('/api', '') + url
            }
            var newFile = { id: attachment.id, url: url }
            // 基于最新文件列表追加，触发 change 事件
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
    }
  }
})
```

### 11.4 父页面接收与保存

#### 接收 change 事件

```javascript
// profile.js
onUploadChange(e) {
  var field = e.currentTarget.dataset.field  // 来自 data-field="xxx"
  var files = e.detail.files                  // [{id, url}, ...] 或 临时路径字符串
  this.setData({ ['form.' + field]: files })
}
```

#### 构建更新数据（通用）

无论自动上传还是延迟上传，保存时统一把文件列表转成 `[{id}]` 格式：

```javascript
function buildAttachmentPayload(form, fields) {
  var data = {}
  fields.forEach(function(field) {
    var files = form[field] || []
    var ids = files.map(function(item) {
      if (!item || typeof item === 'string') return null
      return item.id || null
    }).filter(function(id) { return id !== null })
    if (ids.length > 0) {
      data[field] = ids.map(function(id) { return { id: id } })
    }
  })
  return data
}

// 使用示例
var imgFields = ['annual_revenue_invoiced_image', 'company_debt_image']
var companyUpdate = buildAttachmentPayload(form, imgFields)
companyAPI.update(companyId, companyUpdate, true)
```

**自动上传模式下：** `form[field]` 全是 `{id, url}` 对象，`typeof item === 'string'` 为 `false`，直接提取 `id`。

**延迟上传模式下：** `form[field]` 混有字符串临时路径和旧 `{id, url}` 对象，字符串会被 `typeof item === 'string'` 过滤掉，只保留旧 `id` 和新上传返回的 `id`。

### 11.5 查询回显

附件字段必须通过 `appends` 显式声明，否则后端不返回：

```javascript
// 企业资料查询
companyAPI.list({
  filter: { user_id: { $eq: userId } },
  appends: ['annual_revenue_invoiced_image', 'company_debt_image']
}, true)

// 返回数据中附件字段格式
{
  annual_revenue_invoiced_image: [
    { id: 1, url: '/storage/uploads/xxx.png', ... }
  ]
}
```

回显时补全 URL 前缀：

```javascript
var ASSET_BASE = BASE_URL.replace('/api', '')
arr.map(function(item) {
  if (typeof item === 'string') return item
  var url = item.url || ''
  if (url && url.indexOf('/storage/') === 0) {
    item.url = ASSET_BASE + url
  }
  return item
})
```

### 11.6 踩坑记录

| 问题现象 | 根因 | 解决 |
|----------|------|------|
| 所有角色附件上传 401/403 | 使用 `ADMIN_TOKEN + X-Role: root` | 改用 `getToken()`，去掉 `X-Role` |
| 选择图片后无 network 请求 | `autoUpload=false` 设计导致 | 改为 `autoUpload=true`，选择后立即上传 |
| 多张同时上传丢失部分图片 | `doUpload` 并发读取 `this.data.files` 竞态 | 串行上传：上一张完成后再传下一张 |
| 上传成功但保存后图片消失 | 保存时未提取 `id`，或字段配置不是「关联」类型 | 确认字段为「关联」类型，保存 `[{id}]` 格式 |
| 查询时附件字段为空 | 未加 `appends` | `list/get` 时显式声明 `appends` |
