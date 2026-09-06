// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { api, normalizeResponsePayload } from '../src/utils/api'
import { testTelegramChannel } from '../src/services/shop/notificationChannelService'

afterEach(() => vi.restoreAllMocks())
it('accepts the actual empty-success test response after API normalization', async () => {
  vi.spyOn(api, 'post').mockResolvedValue(normalizeResponsePayload({ success: true }))
  expect(await testTelegramChannel()).toMatchObject({ success: true, data: null })
})
it('preserves server failures instead of displaying a queued-success toast', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({ success: false, error: '每分钟最多发送一次测试通知', status: 429 })
  expect(await testTelegramChannel()).toMatchObject({ success: false, error: '每分钟最多发送一次测试通知' })
})
it('still rejects malformed successful payloads', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(api, 'post').mockResolvedValue(normalizeResponsePayload({ success: true, data: 'unexpected' }))
  expect(await testTelegramChannel()).toMatchObject({ success: false, errorCode: 'INVALID_RESPONSE' })
})
