import { describe, expect, it } from 'vitest'
import { resolveOrderSubjectTarget } from '../src/utils/orderNavigation'

describe('卖家订单物品详情链接', () => {
  it('商品订单指向商品详情', () => {
    expect(resolveOrderSubjectTarget({ order_type: 'normal', product_id: 11624 }))
      .toBe('/product/11624')
  })

  it('求购服务订单指向求购详情', () => {
    expect(resolveOrderSubjectTarget({ orderType: 'buy_request', requestId: 42 }))
      .toBe('/buy-request/42')
  })

  it('历史订单缺少目标 ID 时不生成失效链接', () => {
    expect(resolveOrderSubjectTarget({ order_type: 'normal' })).toBe('')
    expect(resolveOrderSubjectTarget({ order_type: 'buy_request' })).toBe('')
  })
})
