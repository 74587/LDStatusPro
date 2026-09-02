import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateApiResult } from './apiContract'
import {
  MerchantConfigSchema,
  OrderListResponseSchema,
  OrderRefundResponseSchema,
  SellerRefundListResponseSchema,
  SystemMessagesResponseSchema
} from './commerce'
import type { ApiResult } from '@/utils/api'

function success(data: unknown, status = 200): ApiResult<unknown> {
  return { success: true, status, data }
}

function pagination(overrides: Record<string, unknown> = {}) {
  return { total: 1, page: 1, page_size: 20, total_pages: 1, ...overrides }
}

describe('commerce service contracts', () => {
  afterEach(() => vi.restoreAllMocks())

  it('normalizes order aliases once and keeps additive server fields', () => {
    const result = validateApiResult(
      success({
        orders: [{ order_no: 'LD-100', status: 'paid', delivery_content: '兑换码', future_flag: true }],
        pagination: pagination()
      }),
      OrderListResponseSchema,
      { endpoint: '/api/shop/orders', schemaName: 'OrderListResponse' }
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.orders[0]).toMatchObject({
      orderNo: 'LD-100',
      status: 'paid',
      deliveryContent: '兑换码',
      futureFlag: true
    })
    expect(result.data.pagination).toMatchObject({ pageSize: 20, totalPages: 1 })
  })

  it('normalizes PostgreSQL count strings in system-message pagination', () => {
    const result = validateApiResult(
      success({
        messages: [{ id: 123092 }],
        pagination: pagination({ total: '108', total_pages: 6 }),
        summary: { total_unread: 0 }
      }),
      SystemMessagesResponseSchema,
      { endpoint: '/api/shop/messages/system', schemaName: 'SystemMessagesResponse' }
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pagination.total).toBe(108)
      expect(result.data.pagination.totalPages).toBe(6)
    }
  })

  it.each(['-1', '1.5', '108 messages'])(
    'rejects an invalid system-message count string: %s',
    (total) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = validateApiResult(
        success({
          messages: [],
          pagination: pagination({ total }),
          summary: { total_unread: 0 }
        }),
        SystemMessagesResponseSchema,
        { endpoint: '/api/shop/messages/system', schemaName: 'SystemMessagesResponse' }
      )

      expect(result).toMatchObject({ success: false, kind: 'contract', errorCode: 'INVALID_RESPONSE' })
    }
  )

  it('preserves external disputes as a distinct server-authoritative state', () => {
    const result = validateApiResult(
      success({
        role: 'buyer',
        eligibility: { can_apply: false, code: 'EXTERNAL_DISPUTE', message: '请按说明处理' },
        refund: {
          id: 2,
          order_no: 'LD-200',
          status: 'external_dispute',
          refund_amount: '10.00',
          events: []
        },
        dispute_guide_url: '/help/dispute'
      }),
      OrderRefundResponseSchema,
      { endpoint: '/api/shop/orders/:orderNo/refund', schemaName: 'OrderRefundResponse' }
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.eligibility.canApply).toBe(false)
      expect(result.data.refund?.status).toBe('external_dispute')
      expect(result.data.refund?.refundAmount).toBe('10.00')
    }
  })

  it.each(['mystery', 'approved', 'done'])('rejects an unknown refund state: %s', (status) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateApiResult(
      success({
        refunds: [{ id: 1, order_no: 'LD-300', status, refund_amount: 8 }],
        summary: {},
        pagination: pagination()
      }, 206),
      SellerRefundListResponseSchema,
      { endpoint: '/api/shop/refunds/seller', schemaName: 'SellerRefundListResponse' }
    )

    expect(result).toMatchObject({
      success: false,
      status: 206,
      kind: 'contract',
      errorCode: 'INVALID_RESPONSE',
      aborted: false
    })
  })

  it.each([{ page: 0 }, { page_size: '20' }, { total_pages: -1 }])(
    'rejects illegal order pagination: %j',
    (override) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const result = validateApiResult(
        success({ orders: [], pagination: pagination(override) }),
        OrderListResponseSchema,
        { endpoint: '/api/shop/orders', schemaName: 'OrderListResponse' }
      )

      expect(result).toMatchObject({ success: false, kind: 'contract', errorCode: 'INVALID_RESPONSE' })
    }
  )

  it('rejects a merchant configuration missing its core flags without logging payload data', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = validateApiResult(
      success({ configured: true, ldc_pid: 'private-merchant-id' }),
      MerchantConfigSchema,
      { endpoint: '/api/shop/merchant/config', schemaName: 'MerchantConfig' }
    )

    expect(result).toMatchObject({ success: false, kind: 'contract', errorCode: 'INVALID_RESPONSE' })
    expect(JSON.stringify(warning.mock.calls[0])).not.toContain('private-merchant-id')
  })
})
