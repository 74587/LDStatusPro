import { describe, expect, it } from 'vitest'
import { URL } from 'node:url'
import {
  buildLinuxDoMessageUrl,
  getRefundProgressIndex,
  getRefundReasonLabel,
  getRefundStatusMeta,
  validateRefundForm
} from '../src/utils/refund'

describe('订单退款买家流程', () => {
  it('校验原因与 10-500 字问题说明', () => {
    expect(validateRefundForm({ reasonCode: '', reasonDetail: '太短' })).toEqual({
      reasonCode: '请选择退款原因',
      reasonDetail: '请至少填写 10 个字，说明遇到的问题'
    })
    expect(validateRefundForm({
      reasonCode: 'not_as_described',
      reasonDetail: '收到内容与物品详情描述不一致，希望协商退款处理。'
    })).toEqual({})
    expect(validateRefundForm({ reasonCode: 'other', reasonDetail: 'a'.repeat(501) }).reasonDetail)
      .toBe('问题说明不能超过 500 个字')
  })

  it('把退款分支映射到统一进度尺和语义状态', () => {
    expect(getRefundProgressIndex('', false)).toBe(0)
    expect(getRefundProgressIndex('requested')).toBe(1)
    expect(getRefundProgressIndex('negotiating')).toBe(2)
    expect(getRefundProgressIndex('unknown')).toBe(2)
    expect(getRefundProgressIndex('rejected')).toBe(3)
    expect(getRefundProgressIndex('refunded')).toBe(3)
    expect(getRefundStatusMeta('unknown')).toMatchObject({ tone: 'danger', label: '退款结果待核对' })
  })

  it('展示稳定的原因文案并生成安全的 Linux DO 私信地址', () => {
    expect(getRefundReasonLabel('seller_agreed')).toBe('卖家已同意退款')
    const url = new URL(buildLinuxDoMessageUrl('@seller_name', 'LS202608230001', 'buyer'))
    expect(url.origin).toBe('https://linux.do')
    expect(url.pathname).toBe('/new-message')
    expect(url.searchParams.get('username')).toBe('seller_name')
    expect(url.searchParams.get('title')).toContain('LS202608230001')
  })
})
