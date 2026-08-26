import { describe, expect, it } from 'vitest'
import {
  getAvailableStock,
  getStockDisplay,
  getStockIndicatorState,
  isLowStock,
  isOutOfStock,
  isUnlimitedStock
} from '../src/utils/shopProduct'

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
    expect(getStockDisplay(product)).toBe('12/18')
    expect(getStockIndicatorState(product)).toEqual({ label: '库存 12/18', tone: 'available' })
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
    expect(getStockDisplay(product)).toBe('9999')
    expect(getStockIndicatorState(product)).toEqual({ label: '库存 9999', tone: 'available' })
  })

  it('普通商品在缺少计算库存时回退到原始库存', () => {
    const finiteProduct = { productType: 'normal', stock: 8, soldCount: 2 }
    expect(isUnlimitedStock(finiteProduct)).toBe(false)
    expect(getStockDisplay(finiteProduct)).toBe('8/10')
    expect(getStockIndicatorState(finiteProduct)).toEqual({ label: '库存 8/10', tone: 'available' })
    expect(isUnlimitedStock({ productType: 'normal', stock: -1 })).toBe(true)
  })

  it('低库存使用明确的仅剩文案并沿用默认阈值 5', () => {
    const product = {
      productType: 'cdk',
      availableStock: 2,
      cdkStats: { available: 2, total: 5 }
    }

    expect(isLowStock(product)).toBe(true)
    expect(getStockIndicatorState(product)).toEqual({ label: '库存仅剩 2/5', tone: 'low' })
  })

  it('售罄状态同时提供文字状态与精确库存数量', () => {
    const product = {
      productType: 'cdk',
      availableStock: 0,
      cdkStats: { available: 0, total: 5 }
    }

    expect(isOutOfStock(product)).toBe(true)
    expect(getStockIndicatorState(product)).toEqual({ label: '已售罄 · 库存 0/5', tone: 'out' })
  })

  it('非站内交易物品不生成库存票签', () => {
    expect(getStockIndicatorState({ productType: 'store', stock: 8 })).toEqual({
      label: '',
      tone: 'available'
    })
  })
})
