import { describe, expect, it } from 'vitest'
import {
  clampCheckoutQuantity,
  resolveCheckoutQuantityMaximum,
} from '../src/utils/checkoutQuantity'

describe('订单确认数量边界', () => {
  it('库存低于平台上限时以真实库存作为上限', () => {
    const maximum = resolveCheckoutQuantityMaximum({ availableStock: 4000 })

    expect(maximum).toBe(4000)
    expect(clampCheckoutQuantity(2000, maximum)).toBe(2000)
    expect(clampCheckoutQuantity(5000, maximum)).toBe(4000)
  })

  it('库存高于平台上限时允许最多兑换 5000 件', () => {
    const maximum = resolveCheckoutQuantityMaximum({ availableStock: 8000 })

    expect(maximum).toBe(5000)
    expect(clampCheckoutQuantity(2000, maximum)).toBe(2000)
    expect(clampCheckoutQuantity(5001, maximum)).toBe(5000)
  })

  it('卖家限购小于库存时以限购剩余额度为准', () => {
    const maximum = resolveCheckoutQuantityMaximum({
      purchaseLimitMaximum: 3,
      availableStock: 4000,
    })

    expect(maximum).toBe(3)
    expect(clampCheckoutQuantity(10, maximum)).toBe(3)
  })

  it('无限库存且无限购时仍遵守平台单笔 5000 件上限', () => {
    const maximum = resolveCheckoutQuantityMaximum({
      unlimitedStock: true,
      availableStock: 0,
    })

    expect(maximum).toBe(5000)
    expect(clampCheckoutQuantity(2000, maximum)).toBe(2000)
  })
})
