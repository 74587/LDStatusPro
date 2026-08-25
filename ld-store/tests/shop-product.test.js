import { describe, expect, it } from 'vitest'
import { getAvailableStock, isUnlimitedStock } from '../src/utils/shopProduct'

describe('商品库存口径', () => {
  it('独立卡密优先使用接口计算后的有限可售库存', () => {
    const product = {
      product_type: 'cdk',
      stock: -1,
      available_stock: 12,
      cdkStats: { available: 12, total: 18 },
    }

    expect(getAvailableStock(product)).toBe(12)
    expect(isUnlimitedStock(product)).toBe(false)
  })

  it('共享卡密的 -1 可售库存仍表示不限量', () => {
    const product = {
      productType: 'cdk',
      stock: -1,
      availableStock: -1,
      cdkStats: { available: -1, total: -1 },
    }

    expect(getAvailableStock(product)).toBe(-1)
    expect(isUnlimitedStock(product)).toBe(true)
  })

  it('普通商品在缺少计算库存时回退到原始库存', () => {
    expect(isUnlimitedStock({ productType: 'normal', stock: 8 })).toBe(false)
    expect(isUnlimitedStock({ productType: 'normal', stock: -1 })).toBe(true)
  })
})
