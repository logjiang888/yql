const ROLES = {
  COMPANY: 'company',
  BANK: 'bank',
  SALESPERSON: 'salesperson',
  ADMIN: 'admin'
}

const AUDIT_STATUS = {
  UNREVIEWED: 'unreviewed',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

const AUDIT_STATUS_TEXT = {
  'unreviewed': { text: '未审核', color: '#9CA3AF', bg: '#F3F4F6' },
  'under_review': { text: '审核中', color: '#D97706', bg: '#FEF3C7' },
  'approved': { text: '已审核', color: '#059669', bg: '#D1FAE5' },
  'rejected': { text: '已驳回', color: '#DC2626', bg: '#FEE2E2' }
}

const ROLE_TEXT = {
  company: { text: '企业客户', color: '#2563EB', bg: '#DBEAFE' },
  bank: { text: '银行人员', color: '#4F46E5', bg: '#E0E7FF' },
  salesperson: { text: '业务员', color: '#7C3AED', bg: '#F3E8FF' },
  admin: { text: '管理员', color: '#DC2626', bg: '#FEE2E2' }
}

const LOGIN_ERROR_CODE = {
  INVALID_PHONE: { code: 1001, message: '手机号格式不正确' },
  INVALID_CODE: { code: 1002, message: '验证码错误或已过期' },
  INVALID_PASSWORD: { code: 1003, message: '密码错误' },
  USER_NOT_FOUND: { code: 1004, message: '账号不存在，请先注册' },
  ACCOUNT_PENDING: { code: 1005, message: '账号审核中，请耐心等待' },
  ACCOUNT_REJECTED: { code: 1006, message: '账号审核未通过，请联系管理员' },
  ACCOUNT_DISABLED: { code: 1007, message: '账号已被禁用，请联系管理员' },
  NETWORK_ERROR: { code: 2001, message: '网络连接失败，请检查网络' },
  SERVER_ERROR: { code: 2002, message: '服务器繁忙，请稍后再试' },
  UNKNOWN_ERROR: { code: 9999, message: '未知错误，请稍后重试' }
}

const REGISTER_ERROR_CODE = {
  PHONE_EXISTS: { code: 3001, message: '该手机号已注册' },
  INVALID_PARAMS: { code: 3002, message: '请完善注册信息' },
  PROTOCOL_REQUIRED: { code: 3003, message: '请阅读并同意用户协议' },
  PASSWORD_MISMATCH: { code: 3004, message: '两次输入的密码不一致' },
  PASSWORD_TOO_SHORT: { code: 3005, message: '密码长度不能少于6位' },
  CREDIT_CODE_EXISTS: { code: 3006, message: '该统一信用代码已注册' },
  COMPANY_NAME_EXISTS: { code: 3007, message: '该企业名称已注册' }
}

const PROTOCOL_TYPE = {
  COMPANY: 'company',
  BANK: 'bank',
  SALESPERSON: 'plat_salesperson'
}

const DATA_TYPE = {
  TEXT: 'text',
  IMAGE: 'image'
}

const PAGE_SIZE = 10

module.exports = {
  ROLES,
  AUDIT_STATUS,
  AUDIT_STATUS_TEXT,
  ROLE_TEXT,
  LOGIN_ERROR_CODE,
  REGISTER_ERROR_CODE,
  PROTOCOL_TYPE,
  DATA_TYPE,
  PAGE_SIZE
}
