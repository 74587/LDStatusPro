import { storage } from './storage'
import { getMaintenanceRequestBlock } from '@/config/maintenance'
import { emitAuthExpired, isAuthErrorCode, isTokenExpired } from './auth'
import { getDiscoveryRequestHeaders } from './discovery'

// API 基础地址
// 开发环境使用相对路径（通过 Vite 代理），生产环境使用完整 URL
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '' : 'https://api2.ldspro.qzz.io')
const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE || (import.meta.env.DEV ? '' : 'https://api1.ldspro.qzz.io')
const IMAGE_API_BASE = import.meta.env.VITE_IMAGE_API_BASE || (import.meta.env.DEV ? '' : 'https://api.ldspro.qzz.io')

// Linux.do LDC API 基础地址
export const LDC_API_BASE = 'https://linux.do'

// 请求超时时间
const TIMEOUT = 15000

// HTTP 错误码映射
const ERROR_MESSAGES = {
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '没有权限执行此操作',
  404: '请求的资源不存在',
  429: '请求过于频繁，请稍后再试',
  500: '服务器内部错误',
  502: '服务暂时不可用',
  503: '服务正在维护中',
}

const NETWORK_ERROR_MESSAGE = '网络连接异常，请检查网络后重试'
const UNKNOWN_ERROR_MESSAGE = '请求失败，请稍后重试'
const AUTH_EXPIRED_MESSAGE = ERROR_MESSAGES[401]

function normalizeMessage(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function normalizeServerErrorMessage(status, data) {
  const fallback = ERROR_MESSAGES[status] || `请求失败 (${status})`
  if (!data) return fallback

  if (typeof data === 'string') {
    const msg = normalizeMessage(data)
    return msg || fallback
  }

  if (typeof data === 'object') {
    const candidates = [
      data?.error?.message,
      data?.error,
      data?.message,
    ]
    for (const item of candidates) {
      const msg = normalizeMessage(item)
      if (msg) return msg
    }
  }

  return fallback
}

function normalizeNetworkErrorMessage(error) {
  if (!error) return NETWORK_ERROR_MESSAGE
  const text = normalizeMessage(error.message).toLowerCase()
  if (!text) return NETWORK_ERROR_MESSAGE
  if (
    text.includes('failed to fetch')
    || text.includes('networkerror')
    || text.includes('network error')
    || text.includes('load failed')
    || text.includes('network request failed')
  ) {
    return NETWORK_ERROR_MESSAGE
  }
  return normalizeMessage(error.message) || UNKNOWN_ERROR_MESSAGE
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null)
  }
  return response.text().catch(() => '')
}

export function normalizeResponsePayload(data) {
  if (
    data?.success === true
    && data.data?.success === true
    && Object.prototype.hasOwnProperty.call(data.data, 'data')
  ) {
    return { success: true, data: data.data.data }
  }
  return data
}

function isBodyInstance(body, typeName) {
  const BodyType = globalThis[typeName]
  return typeof BodyType === 'function' && body instanceof BodyType
}

function isJsonBody(body) {
  if (body === undefined || body === null) return false
  if (typeof body === 'string') return false
  if (
    isBodyInstance(body, 'FormData')
    || isBodyInstance(body, 'URLSearchParams')
    || isBodyInstance(body, 'Blob')
    || isBodyInstance(body, 'ArrayBuffer')
  ) {
    return false
  }
  return typeof body === 'object' || typeof body === 'boolean' || typeof body === 'number'
}

function hasHeader(headers, name) {
  const normalizedName = name.toLowerCase()
  return Object.keys(headers).some((key) => key.toLowerCase() === normalizedName)
}

function prepareRequestBody(body) {
  if (body === undefined || body === null) return undefined
  return isJsonBody(body) ? JSON.stringify(body) : body
}

function createAbortContext(callerSignal, timeout) {
  const controller = new AbortController()
  let abortReason = ''

  const abortFromCaller = () => {
    if (controller.signal.aborted) return
    abortReason = 'caller'
    controller.abort(callerSignal?.reason)
  }

  if (callerSignal?.aborted) {
    abortFromCaller()
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true })
  }

  const timeoutId = setTimeout(() => {
    if (controller.signal.aborted) return
    abortReason = 'timeout'
    controller.abort()
  }, timeout)

  return {
    signal: controller.signal,
    getAbortReason: () => abortReason,
    cleanup() {
      clearTimeout(timeoutId)
      callerSignal?.removeEventListener('abort', abortFromCaller)
    }
  }
}

function abortedResponse(abortReason) {
  return {
    success: false,
    status: 0,
    error: '',
    aborted: true,
    abortReason
  }
}

function maintenanceBlockedResponse(message = '站点维护中，当前操作暂不可用') {
  return {
    success: false,
    error: message,
    status: 503
  }
}

function hasAuthFailure(status, payload) {
  return status === 401 || isAuthErrorCode(payload)
}

/**
 * 发起 HTTP 请求
 */
async function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const maintenanceBlock = getMaintenanceRequestBlock(method, url)
  if (maintenanceBlock) {
    return maintenanceBlockedResponse(maintenanceBlock.message)
  }

  const base = url.startsWith('/api/image')
    ? IMAGE_API_BASE
    : (url.startsWith('/api/auth') ? AUTH_API_BASE : API_BASE)
  const fullUrl = url.startsWith('http') ? url : `${base}${url}`
  
  // 获取 token
  const token = storage.get('token')

  if (token && isTokenExpired(token)) {
    emitAuthExpired({ source: 'request', url, method, reason: 'local_token_expired' })
    return {
      success: false,
      error: AUTH_EXPIRED_MESSAGE,
      status: 401
    }
  }
  
  const jsonBody = isJsonBody(options.body)
  const headers = {
    'Accept': 'application/json',
    ...getDiscoveryRequestHeaders(url),
    ...options.headers
  }
  if (jsonBody && !hasHeader(headers, 'content-type')) {
    headers['Content-Type'] = 'application/json'
  }
  
  // 添加认证头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const timeout = options.timeout ?? TIMEOUT
  const abortContext = createAbortContext(options.signal, timeout)
  
  try {
    if (abortContext.signal.aborted) {
      return abortedResponse(abortContext.getAbortReason() || 'caller')
    }
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: prepareRequestBody(options.body),
      signal: abortContext.signal,
      credentials: 'include'
    })
    
    // 解析响应
    const data = await parseResponseBody(response)
    
    // 检查响应状态
    if (!response.ok) {
      if (token && hasAuthFailure(response.status, data)) {
        emitAuthExpired({ source: 'request', url, method, reason: 'server_unauthorized', status: response.status })
      }
      const errorMessage = normalizeServerErrorMessage(response.status, data)
      return {
        success: false,
        error: errorMessage,
        status: response.status,
        errorCode: data?.error?.code || data?.code || '',
        details: data?.error?.details || data?.details
      }
    }

    if (token && data?.success === false && hasAuthFailure(data?.status || response.status, data)) {
      emitAuthExpired({ source: 'request', url, method, reason: 'payload_auth_error', status: data?.status || response.status })
      return {
        success: false,
        error: normalizeServerErrorMessage(401, data),
        status: 401
      }
    }
    
    return normalizeResponsePayload(data)
  } catch (error) {
    if (abortContext.signal.aborted) {
      return abortedResponse(abortContext.getAbortReason() || 'caller')
    }
    return {
      success: false,
      error: normalizeNetworkErrorMessage(error),
      status: 0
    }
  } finally {
    abortContext.cleanup()
  }
}

/**
 * 打开需要 Bearer 鉴权的流式响应。与普通 request() 不同，这里不设置固定超时，
 * 生命周期由调用方的 AbortSignal 和服务端心跳共同管理。
 */
async function openEventStream(url, { signal, headers: extraHeaders = {} } = {}) {
  const maintenanceBlock = getMaintenanceRequestBlock('GET', url)
  if (maintenanceBlock) return maintenanceBlockedResponse(maintenanceBlock.message)

  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
  const token = storage.get('token')
  if (!token || isTokenExpired(token)) {
    if (token) emitAuthExpired({ source: 'event-stream', url, method: 'GET', reason: 'local_token_expired' })
    return { success: false, error: AUTH_EXPIRED_MESSAGE, status: 401 }
  }

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
        ...extraHeaders
      },
      credentials: 'include',
      cache: 'no-store',
      signal
    })

    if (!response.ok) {
      const data = await parseResponseBody(response)
      if (hasAuthFailure(response.status, data)) {
        emitAuthExpired({ source: 'event-stream', url, method: 'GET', reason: 'server_unauthorized', status: response.status })
      }
      return {
        success: false,
        error: normalizeServerErrorMessage(response.status, data),
        status: response.status
      }
    }
    if (!response.body) return { success: false, error: '浏览器不支持消息实时连接', status: 0 }
    return { success: true, response }
  } catch (error) {
    if (error?.name === 'AbortError') return { success: false, aborted: true, error: '', status: 0 }
    return {
      success: false,
      error: normalizeNetworkErrorMessage(error, '消息实时连接超时'),
      status: 0
    }
  }
}

/**
 * GET 请求
 */
function get(url, options = {}) {
  return request(url, { ...options, method: 'GET' })
}

/**
 * POST 请求
 */
function post(url, body, options = {}) {
  return request(url, { ...options, method: 'POST', body })
}

/**
 * PUT 请求
 */
function put(url, body, options = {}) {
  return request(url, { ...options, method: 'PUT', body })
}

/**
 * DELETE 请求
 */
function del(url, options = {}) {
  return request(url, { ...options, method: 'DELETE' })
}

/**
 * 上传文件（FormData 请求）
 */
async function upload(url, formData, options = {}) {
  return request(url, {
    ...options,
    method: 'POST',
    body: formData,
    timeout: options.timeout ?? 60000
  })
}

/**
 * 并发请求
 */
async function all(requests) {
  return Promise.all(requests)
}

export const api = {
  request,
  get,
  post,
  put,
  delete: del,
  upload,
  openEventStream,
  all,
  BASE_URL: API_BASE
}
