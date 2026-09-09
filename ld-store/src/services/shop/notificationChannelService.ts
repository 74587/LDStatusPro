import { boolean, nullable, object, picklist, string, null_, type InferOutput } from 'valibot'
import { api } from '@/utils/api'
import { validateServiceResult, withServiceFailure } from '@/services/serviceContract'

export const NotificationChannelSchema = object({
  available: boolean(),
  status: picklist(['unbound', 'enabled', 'paused', 'unavailable']),
  botUsername: nullable(string()),
  telegramUsername: nullable(string()),
  pendingExpiresAt: nullable(string()),
  lastDelivery: nullable(object({ status: picklist(['pending', 'sending', 'accepted', 'failed', 'unknown', 'skipped']), error: nullable(string()), at: string() }))
})
export type NotificationChannelState = InferOutput<typeof NotificationChannelSchema>
const BindingSchema = object({ url: string(), expiresAt: string() })
const endpoint = '/api/shop/merchant/notification-channels'
export function fetchNotificationChannel() {
  return withServiceFailure(async () => validateServiceResult(await api.get(endpoint, { auth: 'required' }), NotificationChannelSchema, endpoint, 'NotificationChannel'), '加载通知设置失败')
}
export function beginTelegramBinding() {
  return withServiceFailure(async () => validateServiceResult(await api.post(`${endpoint}/telegram/bind`, undefined, { auth: 'required' }), BindingSchema, endpoint, 'TelegramBinding'), '生成绑定链接失败')
}
export function changeTelegramChannel(action: 'enable' | 'pause' | 'unbind') {
  return withServiceFailure(async () => validateServiceResult(await api.post(`${endpoint}/telegram/state`, { action }, { auth: 'required' }), NotificationChannelSchema, endpoint, 'NotificationChannel'), '更新通知设置失败')
}
// Retained for API compatibility and isolated diagnostics. The seller page now
// verifies connectivity by opening the Bot workspace instead of sending tests.
export function testTelegramChannel() {
  return withServiceFailure(async () => validateServiceResult(await api.post(`${endpoint}/telegram/test`, undefined, { auth: 'required' }), null_(), endpoint, 'TelegramTest'), '发送测试通知失败')
}
