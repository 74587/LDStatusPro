import { describe, expect, it } from 'vitest'
import { resolveOrderPartyIdentity } from '../src/utils/orderPartyIdentity'

describe('订单交易双方身份展示', () => {
  it('同时保留昵称和可跳转的用户名', () => {
    expect(resolveOrderPartyIdentity({
      seller_username: 'seller name',
      seller_nickname: '山间小店'
    }, 'seller')).toEqual({
      nickname: '山间小店',
      username: 'seller name',
      profileUrl: 'https://linux.do/u/seller%20name'
    })
  })

  it('昵称与用户名相同时避免重复显示', () => {
    expect(resolveOrderPartyIdentity({
      buyerUsername: '@Alice',
      buyerNickname: 'alice'
    }, 'buyer')).toEqual({
      nickname: '',
      username: 'Alice',
      profileUrl: 'https://linux.do/u/Alice'
    })
  })

  it('资料缺失时返回不可跳转的空身份', () => {
    expect(resolveOrderPartyIdentity({}, 'buyer')).toEqual({
      nickname: '',
      username: '',
      profileUrl: ''
    })
  })
})
