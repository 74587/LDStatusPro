// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, normalizeResponsePayload } from './api'
import { storage } from './storage'

function mockResponse(body, { status = 200, contentType = 'application/json' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => name.toLowerCase() === 'content-type' ? contentType : ''
    },
    json: async () => typeof body === 'string' ? JSON.parse(body) : body,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body)
  }
}

function abortableFetch(_url, options) {
  return new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

describe('API request lifecycle', () => {
  beforeEach(() => {
    storage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not send a JSON content type for GET or other requests without a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ success: true }))
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/api/shop/products')
    await api.post('/api/shop/products/1/favorite')

    for (const [, options] of fetchMock.mock.calls) {
      expect(options.body).toBeUndefined()
      expect(Object.keys(options.headers).map((key) => key.toLowerCase())).not.toContain('content-type')
    }
  })

  it('serializes JSON bodies and adds the JSON content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ success: true }))
    vi.stubGlobal('fetch', fetchMock)

    await api.post('/api/shop/orders', { productId: 7 })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.body).toBe('{"productId":7}')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('passes FormData through without setting a multipart content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ success: true }))
    vi.stubGlobal('fetch', fetchMock)
    const formData = new FormData()
    formData.append('file', 'value')

    await api.upload('/api/image/upload', formData)

    const [, options] = fetchMock.mock.calls[0]
    expect(options.body).toBe(formData)
    expect(Object.keys(options.headers).map((key) => key.toLowerCase())).not.toContain('content-type')
  })

  it('distinguishes caller cancellation from request timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(abortableFetch))
    const caller = new AbortController()
    const callerRequest = api.get('/api/shop/products', { signal: caller.signal })
    caller.abort()

    await expect(callerRequest).resolves.toEqual({
      success: false,
      status: 0,
      error: '',
      aborted: true,
      abortReason: 'caller'
    })

    vi.useFakeTimers()
    const timeoutRequest = api.get('/api/shop/products', { timeout: 25 })
    await vi.advanceTimersByTimeAsync(25)

    await expect(timeoutRequest).resolves.toEqual({
      success: false,
      status: 0,
      error: '',
      aborted: true,
      abortReason: 'timeout'
    })
  })

  it('normalizes 401, non-JSON, nested legacy responses and network failures', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse({ message: '请重新登录' }, { status: 401 }))
      .mockResolvedValueOnce(mockResponse('plain response', { contentType: 'text/plain' }))
      .mockResolvedValueOnce(mockResponse({ success: true, data: { success: true, data: { id: 9 } } }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get('/api/shop/orders')).resolves.toMatchObject({ success: false, status: 401, error: '请重新登录' })
    await expect(api.get('/api/status')).resolves.toBe('plain response')
    await expect(api.get('/api/shop/products/9')).resolves.toEqual({ success: true, data: { id: 9 } })
    await expect(api.get('/api/status')).resolves.toEqual({ success: false, status: 0, error: '网络连接异常，请检查网络后重试' })
  })

  it('keeps falsy legacy payload data during response normalization', () => {
    expect(normalizeResponsePayload({ success: true, data: { success: true, data: 0 } })).toEqual({ success: true, data: 0 })
    expect(normalizeResponsePayload({ success: true, data: { success: true, data: null } })).toEqual({ success: true, data: null })
  })
})
