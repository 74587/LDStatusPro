import { api } from '@/utils/api'

function requestError(error, fallback) {
  return {
    success: false,
    error: {
      code: error?.code || 'REQUEST_FAILED',
      message: error?.message || fallback
    }
  }
}

function orderPath(orderNo) {
  return `/api/shop/orders/${encodeURIComponent(String(orderNo || ''))}/refund`
}

export async function fetchOrderRefundRequest(orderNo) {
  try {
    return await api.get(orderPath(orderNo))
  } catch (error) {
    return requestError(error, '加载退款状态失败，请稍后重试')
  }
}

export async function createRefundRequest(orderNo, payload) {
  try {
    return await api.post(orderPath(orderNo), payload)
  } catch (error) {
    return requestError(error, '提交退款申请失败，请稍后重试')
  }
}

export async function contactRefundBuyerRequest(orderNo, message = '') {
  try {
    return await api.post(`${orderPath(orderNo)}/contact`, { message })
  } catch (error) {
    return requestError(error, '更新协商状态失败，请稍后重试')
  }
}

export async function rejectRefundRequest(orderNo, message) {
  try {
    return await api.post(`${orderPath(orderNo)}/reject`, { message })
  } catch (error) {
    return requestError(error, '拒绝退款申请失败，请稍后重试')
  }
}

export async function approveRefundRequest(orderNo, message = '') {
  try {
    return await api.post(`${orderPath(orderNo)}/approve`, { message })
  } catch (error) {
    return requestError(error, '执行退款失败，请稍后重试')
  }
}

export async function fetchSellerRefundsRequest(options = {}) {
  const params = new URLSearchParams()
  params.set('page', String(options.page || 1))
  params.set('pageSize', String(options.pageSize || 20))
  if (options.status) params.set('status', String(options.status))
  if (options.search) params.set('search', String(options.search).trim())
  try {
    return await api.get(`/api/shop/refunds?${params.toString()}`)
  } catch (error) {
    return requestError(error, '加载退款售后列表失败，请稍后重试')
  }
}
